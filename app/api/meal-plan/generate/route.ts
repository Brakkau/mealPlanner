export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const MEAL_TYPES: Record<string, string> = {
  Quick:
    "quick and easy weeknight dinners ready in 30 minutes or less, using minimal prep, simple techniques, and no hard-to-find ingredients",
  "High Protein":
    "high-protein balanced dinners targeting about 30-45g protein per serving, based on lean meats, fish, eggs, tofu, beans, lentils, or Greek yogurt while keeping meals practical for home cooking",
  Vegetarian:
    "vegetarian dinners with no meat or fish, focused on satisfying texture and protein from legumes, tofu, paneer, eggs (optional), grains, and seasonal vegetables",
  Meat:
    "meat-based dinners featuring chicken, beef, pork, turkey, or fish as the main protein, paired with vegetables and complex carbs for a complete meal",
  Budget:
    "budget-friendly dinners that maximize value using low-cost staples, frozen or canned options where appropriate, and ingredients reused across multiple days to reduce waste",
  "Family Friendly":
    "family-friendly dinners with familiar flavors, mild spice levels, kid-appeal, and flexible components so adults can add heat or extras separately"
};

const MAX_HISTORY_TITLES = Number(process.env.LLM_MAX_HISTORY_TITLES || 15);
const MAX_FAVOURITE_TITLES = Number(process.env.LLM_MAX_FAVOURITE_TITLES || 10);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { people, days, type, useFavourites } = body;

    const [favouriteRecipes, pastRecipes] = await Promise.all([
      useFavourites
        ? prisma.recipe.findMany({
            where: { isFavourite: true },
            select: { title: true }
          })
        : Promise.resolve([]),
      prisma.recipe.findMany({
        where: { isGenerated: true },
        select: { title: true }
      })
    ]);
    const pastRecipeTitles = pastRecipes.map(r => r.title);

    const typeDescription = MEAL_TYPES[type] || type;
    const favouriteContext = favouriteRecipes.length > 0
      ? `\nPrefer similar style to these favourites when suitable: ${favouriteRecipes
          .slice(0, MAX_FAVOURITE_TITLES)
          .map(r => r.title)
          .join(", ")}`
      : '';
    
    const avoidContext = pastRecipeTitles.length > 0
      ? `\nAvoid repeating these past recipe titles: ${pastRecipeTitles.slice(0, MAX_HISTORY_TITLES).join(", ")}`
      : '';

    const prompt = `Create ${days} unique dinner recipes for ${people} people.
Meal style: ${typeDescription}.${favouriteContext}${avoidContext}

Output strict JSON only with:
{
  "recipes": [{
    "title": "string",
    "ingredients": [{"name":"string","quantity":number,"unit":"g|kg|ml|L|tbsp|tsp","category":"Vegetables|Meat|Dairy|Pantry|Frozen|Other"}],
    "steps": ["4-6 concise cooking steps"],
    "prepTime": number,
    "cookTime": number,
    "servings": ${people}
  }]
}

Rules:
- Exactly ${days} recipes
- Metric/British units only (g, kg, ml, L, tbsp, tsp)
- No markdown or code fences
- Keep each recipe practical and concise`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiKey =
            process.env.ABACUSAI_API_KEY?.trim() ||
            process.env.ABACUSAI_API_KEY_ALT?.trim();
          if (!apiKey) {
            throw new Error("ABACUSAI_API_KEY is missing");
          }
          const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";

          const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              stream: true,
              max_tokens: Number(process.env.LLM_MAX_TOKENS || 2800),
              response_format: { type: "json_object" }
            })
          });

          if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            throw new Error(`LLM API error: ${response.status}${errorBody ? ` - ${errorBody}` : ""}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let partialRead = '';

          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  try {
                    const parsed = JSON.parse(buffer);
                    const recipes = (parsed.recipes || []).slice(0, days);
                    if (!recipes.length) {
                      throw new Error("No recipes generated");
                    }

                    const completePlan = await prisma.$transaction(async (tx) => {
                      const mealPlan = await tx.mealPlan.create({
                        data: { days, people, type }
                      });

                      const createdRecipes = [];
                      for (let i = 0; i < recipes.length; i++) {
                        const recipeData = recipes[i];
                        const recipe = await tx.recipe.create({
                          data: {
                            title: recipeData.title,
                            ingredients: recipeData.ingredients,
                            steps: recipeData.steps,
                            prepTime: recipeData.prepTime,
                            cookTime: recipeData.cookTime,
                            servings: recipeData.servings || people,
                            isGenerated: true,
                            isFavourite: false
                          }
                        });
                        createdRecipes.push(recipe);
                      }

                      await tx.meal.createMany({
                        data: createdRecipes.map((recipe, i) => ({
                          recipeId: recipe.id,
                          dayNumber: i + 1,
                          mealPlanId: mealPlan.id
                        }))
                      });

                      return tx.mealPlan.findUnique({
                        where: { id: mealPlan.id },
                        include: { meals: { include: { recipe: true }, orderBy: { dayNumber: 'asc' } } }
                      });
                    });

                    const finalData = JSON.stringify({
                      status: 'completed',
                      mealPlan: completePlan
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse recipes' })}\n\n`));
                  }
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  buffer += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating recipes...' })}\n\n`));
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Generation failed' })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to generate meal plan' }, { status: 500 });
  }
}

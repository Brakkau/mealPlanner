export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mealId, mealPlanId } = body;

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: { meals: { include: { recipe: true } } }
    });

    if (!mealPlan) {
      return Response.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    const meal = mealPlan.meals.find((m: { id: string }) => m.id === mealId);
    if (!meal) {
      return Response.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Get all past recipe titles to avoid duplicates
    const pastRecipes = await prisma.recipe.findMany({
      where: { isGenerated: true },
      select: { title: true }
    });
    const pastRecipeTitles = pastRecipes.map(r => r.title);
    
    const existingTitles = [...new Set([
      ...mealPlan.meals.map((m: { recipe: { title: string } }) => m.recipe.title),
      ...pastRecipeTitles
    ])].slice(0, 50).join(', ');

    const prompt = `Generate a single new dinner recipe for ${mealPlan.people} people.
The meal should be ${mealPlan.type}.
Do NOT suggest any of these existing recipes: ${existingTitles}

Provide:
- A creative, descriptive title
- A list of ingredients with exact quantities and units (scaled for ${mealPlan.people} people)
- Step-by-step cooking instructions
- Prep time in minutes
- Cook time in minutes

IMPORTANT: Use British/metric measurements only. Use grams (g), kilograms (kg), millilitres (ml), litres (L), tablespoons (tbsp), teaspoons (tsp). Do NOT use cups, ounces, pounds, or other imperial units.

Respond with a JSON object in this exact format:
{
  "recipe": {
    "title": "Recipe Title",
    "ingredients": [
      {"name": "ingredient name", "quantity": 200, "unit": "g", "category": "Vegetables"}
    ],
    "steps": ["Step 1 instruction", "Step 2 instruction"],
    "prepTime": 15,
    "cookTime": 30,
    "servings": ${mealPlan.people}
  }
}

Category must be one of: Vegetables, Meat, Dairy, Pantry, Frozen, Other
Respond with raw JSON only.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4.1-mini',
              messages: [{ role: 'user', content: prompt }],
              stream: true,
              max_tokens: 3000,
              response_format: { type: "json_object" }
            })
          });

          if (!response.ok) {
            throw new Error(`LLM API error: ${response.status}`);
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
                    const recipeData = parsed.recipe;

                    const newRecipe = await prisma.recipe.create({
                      data: {
                        title: recipeData.title,
                        ingredients: recipeData.ingredients,
                        steps: recipeData.steps,
                        prepTime: recipeData.prepTime,
                        cookTime: recipeData.cookTime,
                        servings: recipeData.servings || mealPlan.people,
                        isGenerated: true,
                        isFavourite: false
                      }
                    });

                    const updatedMeal = await prisma.meal.update({
                      where: { id: mealId },
                      data: { recipeId: newRecipe.id },
                      include: { recipe: true }
                    });

                    const finalData = JSON.stringify({
                      status: 'completed',
                      meal: updatedMeal
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse recipe' })}\n\n`));
                  }
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed.choices?.[0]?.delta?.content || '';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Generating new recipe...' })}\n\n`));
                } catch (e) {}
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Swap failed' })}\n\n`));
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
    return Response.json({ error: 'Failed to swap meal' }, { status: 500 });
  }
}

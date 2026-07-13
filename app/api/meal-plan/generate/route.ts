export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getRecentRecipeTitlesFromPlans } from "@/lib/meal-plan-history";
import {
  estimateUsageFromTexts,
  recordLlmUsage,
  usageFromProviderPayload,
  type LlmTokenUsage
} from "@/lib/llm-usage";

const MEAL_TYPES: Record<string, string> = {
  Quick:
    "quick and easy weeknight dinners ready in 30 minutes or less, with minimal prep, simple cooking methods, and everyday supermarket ingredients. Prioritise variety by rotating proteins such as fish, prawns, turkey mince, beef strips, pork, eggs, tofu, beans, lentils, halloumi, paneer, and chickpeas instead of relying mainly on chicken. Include different meal formats such as stir-fries, tray bakes, rice bowls, tacos, wraps, noodle dishes, loaded salads, soups, skillet meals, omelettes, flatbreads, and one-pan meals. Use shortcuts where helpful, such as microwave rice, frozen vegetables, canned beans, pre-chopped vegetables, jarred sauces, spice pastes, couscous, quick-cook noodles, or air-fryer methods. Meals should still feel balanced, with a protein source, vegetables, and a filling carb or fibre-rich base.",

  "High Protein":
    "high-protein balanced dinners targeting about 30-45g protein per serving, designed to be filling, nutritious, and practical for home cooking. Rotate protein sources widely, including lean beef, turkey, pork tenderloin, salmon, tuna, prawns, cod, eggs, tofu, tempeh, lentils, chickpeas, black beans, edamame, paneer, cottage cheese, Greek yogurt sauces, and occasional chicken without making chicken the default. Pair proteins with vegetables, wholegrains, potatoes, beans, pulses, or high-fibre carbs to create complete meals. Include a mix of cuisines and formats such as burrito bowls, curries, stews, grain bowls, tray bakes, chilli, kebabs, stir-fries, frittatas, protein pasta dishes, stuffed peppers, and hearty salads. Avoid bland bodybuilding-style meals; prioritise flavour, sauces, herbs, spices, marinades, and texture contrast while keeping the meal family-appropriate.",

  Vegetarian:
    "vegetarian dinners with no meat or fish, focused on satisfying, filling meals that do not feel like side dishes. Build meals around varied protein sources such as lentils, chickpeas, black beans, kidney beans, butter beans, tofu, tempeh, paneer, halloumi, eggs where suitable, Greek yogurt, cottage cheese, nuts, seeds, quinoa, and wholegrains. Include a wide range of vegetables, grains, legumes, herbs, spices, and sauces to create meals with strong texture and flavour. Suggest varied dinner formats including curries, dahls, chilli, bean tacos, veggie burgers, shakshuka, frittatas, tray bakes, stuffed peppers, noodle bowls, grain bowls, pasta bakes, risottos, soups, flatbreads, mezze-style plates, and hearty salads. Avoid overusing cheese, pasta, or mushrooms as the main solution. Meals should be satisfying for a family and suitable for people who usually eat meat.",

  Meat:
    "meat-based dinners where animal protein is the main feature, but with strong variety across chicken, turkey, beef, pork, lamb, fish, prawns, salmon, cod, tuna, sausages, lean mince, meatballs, and slow-cooked cuts. Do not default to chicken repeatedly; rotate different proteins, cuts, cuisines, and cooking methods throughout the plan. Pair meat with vegetables, salads, grains, potatoes, rice, pasta, beans, lentils, or flatbreads for complete balanced meals. Include varied formats such as tray bakes, tacos, kebabs, burgers, meatballs, stews, curries, stir-fries, noodle bowls, rice bowls, roasts, skillet meals, pasta dishes, soups, wraps, and grilled or air-fried meals. Use marinades, spice blends, sauces, herbs, and side dishes to make meals feel distinct rather than variations of the same protein and carb combination.",

  Budget:
    "budget-friendly dinners that maximise value while still offering variety, flavour, and balanced nutrition. Prioritise low-cost staples such as lentils, beans, chickpeas, eggs, tinned tomatoes, rice, pasta, potatoes, oats, couscous, frozen vegetables, seasonal vegetables, canned fish, cheaper cuts of meat, mince, sausages, tofu, and supermarket own-brand ingredients. Use meat strategically rather than as the only focus, stretching it with beans, lentils, vegetables, grains, or sauces. Include meals that reuse ingredients across multiple days to reduce waste, but avoid making the meals feel repetitive. Suggest varied formats such as chilli, curries, soups, stews, fried rice, pasta bakes, jacket potatoes, bean tacos, lentil bolognese, frittatas, tray bakes, casseroles, stir-fries, and rice bowls. Meals should be affordable, filling, family-friendly, and realistic for batch cooking or leftovers.",

  "Family Friendly":
    "family-friendly dinners with familiar flavours, mild to moderate spice levels, flexible components, and broad kid appeal while still encouraging variety beyond plain chicken-based meals. Rotate proteins such as beef mince, turkey, pork, fish, salmon, prawns, eggs, lentils, beans, tofu, sausages, meatballs, halloumi, and occasional chicken. Favour meals that can be customised at the table, such as tacos, wraps, rice bowls, pasta bowls, baked potatoes, flatbreads, noodle bowls, burgers, fajitas, mezze plates, and tray bakes. Keep strong spices, chilli, herbs, sauces, or crunchy toppings optional so adults can add extra flavour separately. Include vegetables in approachable ways, such as roasted, blended into sauces, served as sticks, mixed into rice, added to pasta bakes, or offered as sides. Meals should feel comforting, colourful, balanced, and repeatable without becoming boring."
};

function mealVarietyRules(days: number, isVegetarian: boolean) {
  const proteinGuidance = isVegetarian
    ? `Do not default to cheese, pasta, or mushrooms as the main answer for most meals. Actively rotate legumes, tofu, tempeh, paneer, halloumi, eggs, yogurt, grains, nuts, and seeds.`
    : `Do not default to chicken as the safest option. Actively rotate between chicken, beef, pork, turkey, fish, seafood, eggs, tofu, beans, lentils, chickpeas, paneer, halloumi, and other protein sources that fit the meal style.`;

  const structureExample = isVegetarian
    ? "for example three nights of cheese pasta with different herbs"
    : "for example chicken with rice, chicken pasta, and chicken wraps";

  return `
Across this meal plan (${days} days), avoid repeating the same main protein anchor more than twice unless impossible while following the meal style.
${proteinGuidance}
Vary the cuisine style, cooking method, carb base, and meal format across the days.
Avoid generating multiple meals that are essentially the same structure (${structureExample}).
Include a balance of familiar family meals and slightly different options that still feel realistic for home cooking.
`.trim();
}

const PROTEIN_VARIETY = [
  "chicken thighs",
  "chicken breast",
  "turkey mince",
  "lean beef mince",
  "beef strips",
  "pork tenderloin",
  "pork mince",
  "salmon",
  "cod",
  "tuna",
  "prawns",
  "eggs",
  "tofu",
  "tempeh",
  "lentils",
  "chickpeas",
  "black beans",
  "kidney beans",
  "butter beans",
  "paneer",
  "halloumi",
  "Greek yogurt",
  "cottage cheese"
];

const PLANT_FORWARD_PROTEIN_ANCHORS = [
  "lentils",
  "chickpeas",
  "black beans",
  "kidney beans",
  "butter beans",
  "tofu",
  "tempeh",
  "paneer",
  "halloumi",
  "eggs",
  "Greek yogurt",
  "cottage cheese",
  "nuts/seeds",
  "quinoa"
];

const MAX_HISTORY_TITLES = Number(process.env.LLM_MAX_HISTORY_TITLES || 15);
const MAX_FAVOURITE_TITLES = Number(process.env.LLM_MAX_FAVOURITE_TITLES || 10);

function resolveMaxTokens(days: number): number {
  const fromEnv = Number(process.env.LLM_MAX_TOKENS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  // 7 full recipes routinely exceed the old 2800 default and truncate mid-JSON.
  return Math.min(16000, Math.max(4000, days * 1000 + 500));
}

function parseRecipesPayload(raw: string): { recipes: unknown[] } {
  let text = raw.trim();
  if (!text) {
    throw new Error("Empty LLM response");
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    text = fenceMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in LLM response");
  }

  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("recipes" in parsed) ||
    !Array.isArray((parsed as { recipes: unknown }).recipes)
  ) {
    throw new Error("LLM response missing recipes array");
  }

  return parsed as { recipes: unknown[] };
}

function processSseChunk(
  chunk: string,
  buffer: { value: string },
  usage: { current: LlmTokenUsage | null },
  onProgress: () => void
): boolean {
  if (chunk === "[DONE]") return true;

  try {
    const parsed = JSON.parse(chunk);
    const providerUsage = usageFromProviderPayload(parsed.usage);
    if (providerUsage) {
      usage.current = providerUsage;
    }
    const content = parsed.choices?.[0]?.delta?.content || "";
    if (content) {
      buffer.value += content;
      onProgress();
    }
  } catch {
    // Skip invalid JSON chunks
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { people, days, type, useFavourites } = body;

    const [favouriteRecipes, pastRecipeTitles] = await Promise.all([
      useFavourites
        ? prisma.recipe
            .findMany({
              where: { isFavourite: true },
              select: { title: true }
            })
            .catch((e) => {
              console.warn(
                "[meal-plan/generate] Could not load favourites (DB unavailable or permission denied).",
                e
              );
              return [] as { title: string }[];
            })
        : Promise.resolve([]),
      getRecentRecipeTitlesFromPlans()
    ]);

    const typeDescription = MEAL_TYPES[type] || type;
    const favouriteContext = favouriteRecipes.length > 0
      ? `\nPrefer similar style to these favourites when suitable: ${favouriteRecipes
          .slice(0, MAX_FAVOURITE_TITLES)
          .map(r => r.title)
          .join(", ")}`
      : '';
    
    const avoidContext = pastRecipeTitles.length > 0
      ? `\nAvoid repeating these recipe titles from meals in the last 30 days: ${pastRecipeTitles.slice(0, MAX_HISTORY_TITLES).join(", ")}`
      : '';

    const proteinRotationContext =
      type === "Vegetarian"
        ? `\nRotate distinct plant- and dairy-forward protein anchors across recipes (no meat or fish), drawing from: ${PLANT_FORWARD_PROTEIN_ANCHORS.join(", ")}.`
        : `\nPrefer rotating distinct main protein anchors across recipes from: ${PROTEIN_VARIETY.join(", ")}.`;

    const prompt = `Create ${days} unique dinner recipes for ${people} people.

Variety and repetition:
${mealVarietyRules(days, type === "Vegetarian")}
${proteinRotationContext}

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
          const maxTokens = resolveMaxTokens(days);

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
              max_tokens: maxTokens,
              response_format: { type: "json_object" },
              stream_options: { include_usage: true }
            })
          });

          if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            throw new Error(`LLM API error: ${response.status}${errorBody ? ` - ${errorBody}` : ""}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          const buffer = { value: "" };
          const usage = { current: null as LlmTokenUsage | null };
          let partialRead = "";

          const sendProgress = () => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ status: "processing", message: "Generating recipes..." })}\n\n`
              )
            );
          };

          const finishFromBuffer = async () => {
            try {
              const parsed = parseRecipesPayload(buffer.value);
              const recipes = parsed.recipes.slice(0, days) as Array<{
                title: string;
                ingredients: unknown;
                steps: unknown;
                prepTime: number;
                cookTime: number;
                servings?: number;
              }>;
              if (!recipes.length) {
                throw new Error("No recipes generated");
              }

              const resolvedUsage =
                usage.current ??
                estimateUsageFromTexts(prompt, buffer.value);
              const monthlyUsage = await recordLlmUsage({
                tokens: resolvedUsage.totalTokens,
                source: "meal-plan/generate"
              });

              const mealPlanId = randomUUID();
              const createdAt = new Date();
              const meals = [];

              for (let i = 0; i < recipes.length; i++) {
                const recipeData = recipes[i];
                const recipeId = randomUUID();
                const recipe = {
                  id: recipeId,
                  title: recipeData.title,
                  ingredients: recipeData.ingredients,
                  steps: recipeData.steps,
                  prepTime: recipeData.prepTime,
                  cookTime: recipeData.cookTime,
                  servings: recipeData.servings || people,
                  isGenerated: true,
                  isFavourite: false,
                  createdAt
                };
                meals.push({
                  id: randomUUID(),
                  recipeId,
                  dayNumber: i + 1,
                  mealPlanId,
                  recipe
                });
              }

              const completePlan = {
                id: mealPlanId,
                days,
                people,
                type,
                isSaved: false,
                createdAt,
                meals
              };

              const finalData = JSON.stringify({
                status: "completed",
                mealPlan: completePlan,
                tokenUsage: {
                  ...resolvedUsage,
                  monthly: monthlyUsage
                }
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch (e) {
              const detail = e instanceof Error ? e.message : "Unknown parse error";
              console.error("[meal-plan/generate] Failed to parse recipes:", detail, {
                bufferLength: buffer.value.length,
                bufferPreview: buffer.value.slice(0, 400)
              });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    status: "error",
                    message: `Failed to parse recipes: ${detail}`
                  })}\n\n`
                )
              );
            }
          };

          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split("\n");
            partialRead = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (processSseChunk(data, buffer, usage, sendProgress)) {
                await finishFromBuffer();
                return;
              }
            }
          }

          // Flush any trailing SSE line that arrived without a final newline.
          if (partialRead.startsWith("data: ")) {
            const data = partialRead.slice(6).trim();
            if (processSseChunk(data, buffer, usage, sendProgress)) {
              await finishFromBuffer();
              return;
            }
          }

          if (buffer.value.trim()) {
            await finishFromBuffer();
          } else {
            throw new Error("LLM stream ended with no content");
          }
        } catch (error) {
          console.error('Stream error:', error);
          const message =
            error instanceof Error ? error.message : "Generation failed";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message })}\n\n`));
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

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const base64Buffer = await file.arrayBuffer();
    const base64String = Buffer.from(base64Buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const prompt = `Analyze this recipe image and extract all the recipe information.

Extract:
1. Recipe title
2. All ingredients with quantities and units
3. Step-by-step cooking instructions
4. Prep time in minutes (estimate if not shown)
5. Cook time in minutes (estimate if not shown)
6. Number of servings (estimate if not shown)

IMPORTANT: Convert all measurements to British/metric units. Use grams (g), kilograms (kg), millilitres (ml), litres (L), tablespoons (tbsp), teaspoons (tsp). Do NOT use cups, ounces, pounds, or other imperial units.

For ingredients, categorize each into one of: Vegetables, Meat, Dairy, Pantry, Frozen, Other

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
    "servings": 4
  }
}

Respond with raw JSON only. Do not include code blocks or markdown.`;

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
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64String}` } }
                  ]
                }
              ],
              stream: true,
              max_tokens: 4000,
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

                    const recipe = await prisma.recipe.create({
                      data: {
                        title: recipeData.title || 'Untitled Recipe',
                        ingredients: recipeData.ingredients || [],
                        steps: recipeData.steps || [],
                        prepTime: recipeData.prepTime || 15,
                        cookTime: recipeData.cookTime || 30,
                        servings: recipeData.servings || 4,
                        isGenerated: false,
                        isFavourite: false
                      }
                    });

                    const finalData = JSON.stringify({
                      status: 'completed',
                      recipe
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (e) {
                    console.error('Parse error:', e);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse recipe from image' })}\n\n`));
                  }
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed.choices?.[0]?.delta?.content || '';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Analyzing image...' })}\n\n`));
                } catch (e) {}
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Image processing failed' })}\n\n`));
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
    return Response.json({ error: 'Failed to process image' }, { status: 500 });
  }
}

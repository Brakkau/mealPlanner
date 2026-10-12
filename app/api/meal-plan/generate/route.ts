export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { generateMealPlan } from "@/lib/generate-meal-plan";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive"
};

function encodeSse(encoder: TextEncoder, payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      people,
      days,
      type,
      useFavourites,
      focus,
      fillRemainingWithAi,
      cholesterolFriendly
    } = body as {
      people: number;
      days: number;
      type: string;
      useFavourites?: boolean;
      focus?: string | null;
      fillRemainingWithAi?: boolean;
      cholesterolFriendly?: boolean;
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (message: string) => {
          controller.enqueue(encodeSse(encoder, { status: "processing", message }));
        };
        const sendError = (message: string) => {
          controller.enqueue(encodeSse(encoder, { status: "error", message }));
        };

        try {
          const result = await generateMealPlan(
            {
              people,
              days,
              type,
              useFavourites,
              focus,
              fillRemainingWithAi,
              cholesterolFriendly
            },
            sendProgress
          );

          if (result.status === "need_fill") {
            controller.enqueue(encodeSse(encoder, result));
            return;
          }

          controller.enqueue(
            encodeSse(encoder, {
              status: "completed",
              mealPlan: result.mealPlan,
              ...(result.tokenUsage ? { tokenUsage: result.tokenUsage } : {})
            })
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Generation failed";
          console.error("[meal-plan/generate] Failed to generate recipes:", message);
          sendError(message);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to generate meal plan" }, { status: 500 });
  }
}

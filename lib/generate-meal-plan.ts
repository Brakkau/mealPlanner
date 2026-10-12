import { prisma } from "@/lib/db";
import { getRecentRecipeTitlesFromPlans } from "@/lib/meal-plan-history";
import {
  estimateUsageFromTexts,
  recordLlmUsage,
  usageFromProviderPayload,
  type LlmTokenUsage
} from "@/lib/llm-usage";
import {
  DEFAULT_AI_TYPE,
  buildGeneratePrompt,
  formatPlanTypeLabel,
  isFavouritesType,
  resolveFocus
} from "@/lib/meal-types";
import { pickFavouriteRecipes } from "@/lib/pick-favourite-recipes";
import { buildPreviewPlan, type PreviewRecipeInput } from "@/lib/meal-plan-preview";

const MAX_HISTORY_TITLES = Number(process.env.LLM_MAX_HISTORY_TITLES || 15);
const MAX_FAVOURITE_TITLES = Number(process.env.LLM_MAX_FAVOURITE_TITLES || 10);

type GeneratedRecipe = {
  title: string;
  ingredients: unknown;
  steps: unknown;
  prepTime: number;
  cookTime: number;
  servings?: number;
};

export type GenerateMealPlanOptions = {
  people: number;
  days: number;
  type: string;
  useFavourites?: boolean;
  focus?: string | null;
  fillRemainingWithAi?: boolean;
  cholesterolFriendly?: boolean;
};

export type GeneratedMealPlan = ReturnType<typeof buildPreviewPlan>;

export type GenerateMealPlanResult =
  | {
      status: "completed";
      mealPlan: GeneratedMealPlan;
      tokenUsage?: LlmTokenUsage & {
        monthly: Awaited<ReturnType<typeof recordLlmUsage>>;
      };
    }
  | {
      status: "need_fill";
      favouriteCount: number;
      requestedDays: number;
      message: string;
    };

function resolveMaxTokens(days: number): number {
  const fromEnv = Number(process.env.LLM_MAX_TOKENS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
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

function favouriteToPreview(recipe: {
  id: string;
  title: string;
  ingredients: unknown;
  steps: unknown;
  prepTime: number;
  cookTime: number;
  servings: number;
  isGenerated: boolean;
  isFavourite: boolean;
  createdAt: Date;
}): PreviewRecipeInput {
  return {
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    isGenerated: recipe.isGenerated,
    isFavourite: recipe.isFavourite,
    createdAt: recipe.createdAt
  };
}

function generatedToPreview(recipe: GeneratedRecipe, people: number): PreviewRecipeInput {
  return {
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings || people,
    isGenerated: true,
    isFavourite: false
  };
}

async function collectLlmRecipes(params: {
  prompt: string;
  days: number;
  onProgress: () => void;
}): Promise<{ recipes: GeneratedRecipe[]; usage: LlmTokenUsage; raw: string }> {
  const apiKey =
    process.env.ABACUSAI_API_KEY?.trim() || process.env.ABACUSAI_API_KEY_ALT?.trim();
  if (!apiKey) {
    throw new Error("ABACUSAI_API_KEY is missing");
  }
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const maxTokens = resolveMaxTokens(params.days);

  const response = await fetch("https://apps.abacus.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: params.prompt }],
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
  if (!reader) {
    throw new Error("LLM stream ended with no content");
  }

  const decoder = new TextDecoder();
  const buffer = { value: "" };
  const usage = { current: null as LlmTokenUsage | null };
  let partialRead = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    partialRead += decoder.decode(value, { stream: true });
    const lines = partialRead.split("\n");
    partialRead = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (processSseChunk(data, buffer, usage, params.onProgress)) {
        return finishLlmBuffer(params.prompt, params.days, buffer.value, usage.current);
      }
    }
  }

  if (partialRead.startsWith("data: ")) {
    const data = partialRead.slice(6).trim();
    if (processSseChunk(data, buffer, usage, params.onProgress)) {
      return finishLlmBuffer(params.prompt, params.days, buffer.value, usage.current);
    }
  }

  if (!buffer.value.trim()) {
    throw new Error("LLM stream ended with no content");
  }

  return finishLlmBuffer(params.prompt, params.days, buffer.value, usage.current);
}

function finishLlmBuffer(
  prompt: string,
  days: number,
  raw: string,
  providerUsage: LlmTokenUsage | null
): { recipes: GeneratedRecipe[]; usage: LlmTokenUsage; raw: string } {
  try {
    const parsed = parseRecipesPayload(raw);
    const recipes = parsed.recipes.slice(0, days) as GeneratedRecipe[];
    if (!recipes.length) {
      throw new Error("No recipes generated");
    }

    return {
      recipes,
      usage: providerUsage ?? estimateUsageFromTexts(prompt, raw),
      raw
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown parse error";
    console.error("[meal-plan/generate] Failed to parse recipes:", detail, {
      bufferLength: raw.length,
      bufferPreview: raw.slice(0, 400)
    });
    throw new Error(`Failed to parse recipes: ${detail}`);
  }
}

export async function generateMealPlan(
  options: GenerateMealPlanOptions,
  onProgress: (message: string) => void = () => undefined
): Promise<GenerateMealPlanResult> {
  const { people, days, type, useFavourites, fillRemainingWithAi } = options;
  const cholesterolFriendly = Boolean(options.cholesterolFriendly);
  const favouritesOnly = isFavouritesType(type);
  const styleType = favouritesOnly ? DEFAULT_AI_TYPE : type;
  const focus = resolveFocus(styleType, options.focus);
  const pastRecipeTitles = await getRecentRecipeTitlesFromPlans();

  if (favouritesOnly) {
    onProgress("Picking from your favourites...");
    const favouriteRecipes = await prisma.recipe
      .findMany({ where: { isFavourite: true } })
      .catch((e) => {
        console.warn(
          "[meal-plan/generate] Could not load favourites (DB unavailable or permission denied).",
          e
        );
        return [];
      });

    if (favouriteRecipes.length === 0) {
      throw new Error("Add some favourite meals first, then try again.");
    }

    const picked = pickFavouriteRecipes(favouriteRecipes, days, pastRecipeTitles);

    if (picked.length < days && !fillRemainingWithAi) {
      return {
        status: "need_fill",
        favouriteCount: favouriteRecipes.length,
        requestedDays: days,
        message: `You have ${favouriteRecipes.length} favourites but asked for ${days} days.`
      };
    }

    let generated: GeneratedRecipe[] = [];
    let tokenUsage:
      | (LlmTokenUsage & { monthly: Awaited<ReturnType<typeof recordLlmUsage>> })
      | undefined;

    if (picked.length < days) {
      const remaining = days - picked.length;
      const fillPrompt = buildGeneratePrompt({
        people,
        days: remaining,
        type: styleType,
        focus,
        favouriteTitles: [],
        pastRecipeTitles: [...pastRecipeTitles, ...picked.map((recipe) => recipe.title)],
        maxFavouriteTitles: MAX_FAVOURITE_TITLES,
        maxHistoryTitles: MAX_HISTORY_TITLES,
        cholesterolFriendly
      });

      onProgress("Generating extra recipes...");
      const llm = await collectLlmRecipes({
        prompt: fillPrompt,
        days: remaining,
        onProgress: () => onProgress("Generating extra recipes...")
      });

      generated = llm.recipes;
      const monthlyUsage = await recordLlmUsage({
        tokens: llm.usage.totalTokens,
        source: "meal-plan/generate"
      });
      tokenUsage = { ...llm.usage, monthly: monthlyUsage };
    }

    return {
      status: "completed",
      mealPlan: buildPreviewPlan({
        people,
        days,
        type: formatPlanTypeLabel({
          type: styleType,
          focus,
          isFavourites: true,
          fillWithAi: generated.length > 0,
          cholesterolFriendly
        }),
        recipes: [
          ...picked.map(favouriteToPreview),
          ...generated.map((recipe) => generatedToPreview(recipe, people))
        ]
      }),
      ...(tokenUsage ? { tokenUsage } : {})
    };
  }

  const favouriteTitles = useFavourites
    ? await prisma.recipe
        .findMany({
          where: { isFavourite: true },
          select: { title: true }
        })
        .then((rows) => rows.map((row) => row.title))
        .catch((e) => {
          console.warn(
            "[meal-plan/generate] Could not load favourites (DB unavailable or permission denied).",
            e
          );
          return [] as string[];
        })
    : [];

  const prompt = buildGeneratePrompt({
    people,
    days,
    type: styleType,
    focus,
    favouriteTitles,
    pastRecipeTitles,
    maxFavouriteTitles: MAX_FAVOURITE_TITLES,
    maxHistoryTitles: MAX_HISTORY_TITLES,
    cholesterolFriendly
  });

  onProgress("Generating recipes...");
  const llm = await collectLlmRecipes({
    prompt,
    days,
    onProgress: () => onProgress("Generating recipes...")
  });

  const monthlyUsage = await recordLlmUsage({
    tokens: llm.usage.totalTokens,
    source: "meal-plan/generate"
  });

  return {
    status: "completed",
    mealPlan: buildPreviewPlan({
      people,
      days,
      type: formatPlanTypeLabel({ type: styleType, focus, cholesterolFriendly }),
      recipes: llm.recipes.map((recipe) => generatedToPreview(recipe, people))
    }),
    tokenUsage: {
      ...llm.usage,
      monthly: monthlyUsage
    }
  };
}

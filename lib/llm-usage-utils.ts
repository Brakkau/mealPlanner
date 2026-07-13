export type LlmTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated: boolean;
};

export type MonthlyLlmUsageSummary = {
  monthKey: string;
  tokensUsed: number;
  requestCount: number;
  budget: number;
  remaining: number;
};

export function getMonthlyTokenBudget(): number {
  const fromEnv = Number(process.env.LLM_MONTHLY_TOKEN_BUDGET);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 30000;
}

export function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Rough OpenAI-style estimate when the provider omits usage. */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateUsageFromTexts(
  prompt: string,
  completion: string
): LlmTokenUsage {
  const promptTokens = estimateTokenCount(prompt);
  const completionTokens = estimateTokenCount(completion);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimated: true
  };
}

export function usageFromProviderPayload(usage: unknown): LlmTokenUsage | null {
  if (usage === null || typeof usage !== "object") return null;
  const record = usage as Record<string, unknown>;
  const promptTokens = Number(record.prompt_tokens ?? record.promptTokens);
  const completionTokens = Number(
    record.completion_tokens ?? record.completionTokens
  );
  const totalTokens = Number(record.total_tokens ?? record.totalTokens);

  if (!Number.isFinite(totalTokens) || totalTokens <= 0) {
    if (
      Number.isFinite(promptTokens) &&
      Number.isFinite(completionTokens) &&
      promptTokens + completionTokens > 0
    ) {
      return {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimated: false
      };
    }
    return null;
  }

  return {
    promptTokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completionTokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    totalTokens,
    estimated: false
  };
}

export function formatTokenCount(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
  }
  return String(value);
}

import { prisma } from "@/lib/db";
import {
  getCurrentMonthKey,
  getMonthlyTokenBudget,
  type MonthlyLlmUsageSummary
} from "@/lib/llm-usage-utils";

export type { LlmTokenUsage, MonthlyLlmUsageSummary } from "@/lib/llm-usage-utils";
export {
  estimateTokenCount,
  estimateUsageFromTexts,
  formatTokenCount,
  getCurrentMonthKey,
  getMonthlyTokenBudget,
  usageFromProviderPayload
} from "@/lib/llm-usage-utils";

export async function recordLlmUsage(params: {
  tokens: number;
  source: string;
}): Promise<MonthlyLlmUsageSummary | null> {
  const tokens = Math.max(0, Math.round(params.tokens));
  if (tokens <= 0) return getMonthlyLlmUsage();

  const monthKey = getCurrentMonthKey();
  const budget = getMonthlyTokenBudget();

  try {
    const row = await prisma.llmUsageMonth.upsert({
      where: { monthKey },
      create: {
        monthKey,
        tokensUsed: tokens,
        requestCount: 1
      },
      update: {
        tokensUsed: { increment: tokens },
        requestCount: { increment: 1 }
      }
    });

    return {
      monthKey,
      tokensUsed: row.tokensUsed,
      requestCount: row.requestCount,
      budget,
      remaining: Math.max(0, budget - row.tokensUsed)
    };
  } catch (error) {
    console.warn("[llm-usage] Failed to record usage:", params.source, error);
    return null;
  }
}

export async function getMonthlyLlmUsage(): Promise<MonthlyLlmUsageSummary> {
  const monthKey = getCurrentMonthKey();
  const budget = getMonthlyTokenBudget();

  try {
    const row = await prisma.llmUsageMonth.findUnique({
      where: { monthKey }
    });

    const tokensUsed = row?.tokensUsed ?? 0;
    return {
      monthKey,
      tokensUsed,
      requestCount: row?.requestCount ?? 0,
      budget,
      remaining: Math.max(0, budget - tokensUsed)
    };
  } catch (error) {
    console.warn("[llm-usage] Failed to load usage:", error);
    return {
      monthKey,
      tokensUsed: 0,
      requestCount: 0,
      budget,
      remaining: budget
    };
  }
}

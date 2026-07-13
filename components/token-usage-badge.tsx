"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTokenCount, type MonthlyLlmUsageSummary } from "@/lib/llm-usage-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

type TokenUsageBadgeProps = {
  refreshKey?: number;
};

export default function TokenUsageBadge({
  refreshKey = 0
}: TokenUsageBadgeProps): JSX.Element | null {
  const [usage, setUsage] = useState<MonthlyLlmUsageSummary | null>(null);

  const loadUsage = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/llm-usage", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as MonthlyLlmUsageSummary;
      setUsage(data);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage, refreshKey]);

  if (!usage) return null;

  const usedLabel = formatTokenCount(usage.tokensUsed);
  const budgetLabel = formatTokenCount(usage.budget);
  const remainingLabel = formatTokenCount(usage.remaining);
  const percentUsed =
    usage.budget > 0
      ? Math.min(100, Math.round((usage.tokensUsed / usage.budget) * 100))
      : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-[10px] leading-none px-2 py-1 rounded-md bg-gray-50 text-gray-500 font-mono hover:bg-gray-100 transition-colors"
            aria-label="Monthly AI token usage"
          >
            {usedLabel}/{budgetLabel}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs space-y-1">
          <p className="font-medium">AI tokens this month</p>
          <p>
            Used {usage.tokensUsed.toLocaleString()} of{" "}
            {usage.budget.toLocaleString()} ({percentUsed}%)
          </p>
          <p>{remainingLabel} remaining · {usage.requestCount} requests</p>
          <p className="text-[10px] opacity-80">Month {usage.monthKey} (UTC)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

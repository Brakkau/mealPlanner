import {
  estimateTokenCount,
  estimateUsageFromTexts,
  formatTokenCount,
  getCurrentMonthKey,
  usageFromProviderPayload
} from "./llm-usage-utils";

describe("estimateTokenCount", () => {
  it("returns 0 for empty text", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("estimates roughly 1 token per 4 characters", () => {
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcdefgh")).toBe(2);
  });
});

describe("estimateUsageFromTexts", () => {
  it("sums prompt and completion estimates", () => {
    const usage = estimateUsageFromTexts("abcd", "abcdefgh");
    expect(usage).toEqual({
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
      estimated: true
    });
  });
});

describe("usageFromProviderPayload", () => {
  it("reads OpenAI-style usage fields", () => {
    expect(
      usageFromProviderPayload({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      })
    ).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      estimated: false
    });
  });

  it("returns null for invalid payloads", () => {
    expect(usageFromProviderPayload(null)).toBeNull();
    expect(usageFromProviderPayload({})).toBeNull();
  });
});

describe("formatTokenCount", () => {
  it("formats large values compactly", () => {
    expect(formatTokenCount(420)).toBe("420");
    expect(formatTokenCount(1200)).toBe("1.2k");
    expect(formatTokenCount(12500)).toBe("12.5k");
    expect(formatTokenCount(30000)).toBe("30k");
  });
});

describe("getCurrentMonthKey", () => {
  it("formats UTC year-month", () => {
    expect(getCurrentMonthKey(new Date("2026-07-13T12:00:00.000Z"))).toBe(
      "2026-07"
    );
  });
});

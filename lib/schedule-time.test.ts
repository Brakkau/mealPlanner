import { getNextRunAt, isValidEmail, parseTimeHHmm } from "./schedule-time";

describe("parseTimeHHmm", () => {
  it("parses valid 24-hour times", () => {
    expect(parseTimeHHmm("18:00")).toEqual({ hours: 18, minutes: 0 });
    expect(parseTimeHHmm("9:05")).toEqual({ hours: 9, minutes: 5 });
  });

  it("rejects invalid times", () => {
    expect(parseTimeHHmm("25:00")).toBeNull();
    expect(parseTimeHHmm("abc")).toBeNull();
  });
});

describe("isValidEmail", () => {
  it("accepts a normal email", () => {
    expect(isValidEmail("matt@example.com")).toBe(true);
  });

  it("rejects missing domains", () => {
    expect(isValidEmail("matt")).toBe(false);
  });
});

describe("getNextRunAt", () => {
  it("picks the next matching weekday and time in Europe/London", () => {
    const from = new Date("2026-09-02T10:00:00.000Z");
    const next = getNextRunAt(0, "18:00", "Europe/London", from);
    expect(next.toISOString()).toBe("2026-09-06T17:00:00.000Z");
  });

  it("rolls forward a week when today's slot has already passed", () => {
    const from = new Date("2026-09-06T18:30:00.000Z");
    const next = getNextRunAt(0, "18:00", "Europe/London", from);
    expect(next.toISOString()).toBe("2026-09-13T17:00:00.000Z");
  });
});

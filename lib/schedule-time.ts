export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

export const DEFAULT_TIME_ZONE = "Europe/London";

export function parseTimeHHmm(value: string): { hours: number; minutes: number } | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function getZonedParts(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; weekday: number; hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    weekday: weekdayMap[read("weekday")] ?? 0,
    hours: Number(read("hour")),
    minutes: Number(read("minute"))
  };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}

export function zonedCivilToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const first = new Date(utcGuess - tzOffsetMs(new Date(utcGuess), timeZone));
  return new Date(utcGuess - tzOffsetMs(first, timeZone));
}

function addDays(year: number, month: number, day: number, extra: number): { year: number; month: number; day: number } {
  const next = new Date(Date.UTC(year, month - 1, day + extra));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  };
}

export function getNextRunAt(
  weekday: number,
  timeHHmm: string,
  timeZone: string,
  from: Date = new Date()
): Date {
  const parsed = parseTimeHHmm(timeHHmm);
  if (!parsed || weekday < 0 || weekday > 6) {
    throw new Error("Invalid schedule time");
  }

  const nowParts = getZonedParts(from, timeZone);
  const nowMinutes = nowParts.hours * 60 + nowParts.minutes;
  const targetMinutes = parsed.hours * 60 + parsed.minutes;

  let daysAhead = (weekday - nowParts.weekday + 7) % 7;
  if (daysAhead === 0 && nowMinutes >= targetMinutes) {
    daysAhead = 7;
  }

  const civil = addDays(nowParts.year, nowParts.month, nowParts.day, daysAhead);
  return zonedCivilToUtc(timeZone, civil.year, civil.month, civil.day, parsed.hours, parsed.minutes);
}

export function formatWeekdayTime(weekday: number, timeLocal: string, timeZone: string): string {
  const day = WEEKDAY_LABELS[weekday] ?? "Sunday";
  return `${day}s at ${timeLocal} (${timeZone})`;
}

export function padTime(hours: number, minutes: number): string {
  return `${pad(hours)}:${pad(minutes)}`;
}

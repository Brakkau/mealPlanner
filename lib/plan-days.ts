import { WEEKDAY_LABELS } from "@/lib/schedule-time";

export const PLAN_START_WEEKDAY = 1;

export function weekdayForDayNumber(
  dayNumber: number,
  startWeekday: number = PLAN_START_WEEKDAY
): number {
  return (startWeekday + (dayNumber - 1) + 7) % 7;
}

export function weekdayLabelForDayNumber(
  dayNumber: number,
  startWeekday: number = PLAN_START_WEEKDAY
): string {
  return WEEKDAY_LABELS[weekdayForDayNumber(dayNumber, startWeekday)] ?? `Day ${dayNumber}`;
}

export function sundayDayNumber(
  days: number,
  startWeekday: number = PLAN_START_WEEKDAY
): number | null {
  for (let dayNumber = 1; dayNumber <= days; dayNumber += 1) {
    if (weekdayForDayNumber(dayNumber, startWeekday) === 0) {
      return dayNumber;
    }
  }
  return null;
}

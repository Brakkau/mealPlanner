import { prisma } from "@/lib/db";
import { generateMealPlan } from "@/lib/generate-meal-plan";
import { persistMealPlan } from "@/lib/persist-meal-plan";
import { buildScheduleEmail, getAppBaseUrl, sendEmail } from "@/lib/email";
import { getNextRunAt } from "@/lib/schedule-time";
import { isFavouritesType } from "@/lib/meal-types";
import { leftoverNamesFromLastPlan } from "@/lib/leftovers";
import { getDislikes } from "@/lib/household-settings";

type ScheduleRow = {
  id: string;
  email: string;
  weekday: number;
  timeLocal: string;
  timeZone: string;
  people: number;
  days: number;
  type: string;
  focus: string | null;
  useFavourites: boolean;
  fillRemainingWithAi: boolean;
  cholesterolFriendly: boolean;
  useLeftovers?: boolean;
  sundayRoastMeat?: string | null;
  sundayRoastVeg?: string | null;
};

async function deliverSchedule(schedule: ScheduleRow): Promise<string> {
  const fillRemainingWithAi =
    isFavouritesType(schedule.type) ? true : schedule.fillRemainingWithAi;

  const roastMeat = schedule.sundayRoastMeat?.trim() ?? "";
  const roastVeg = schedule.sundayRoastVeg?.trim() ?? "";
  const generated = await generateMealPlan({
    people: schedule.people,
    days: schedule.days,
    type: schedule.type,
    useFavourites: schedule.useFavourites,
    focus: schedule.focus,
    fillRemainingWithAi,
    cholesterolFriendly: schedule.cholesterolFriendly,
    dislikes: await getDislikes().catch(() => [] as string[]),
    leftoverIngredientNames: schedule.useLeftovers
      ? await leftoverNamesFromLastPlan().catch(() => [] as string[])
      : [],
    sundayRoast: roastMeat && roastVeg ? { meat: roastMeat, veg: roastVeg } : null
  });

  if (generated.status !== "completed") {
    throw new Error(generated.message);
  }

  const plan = await persistMealPlan(generated.mealPlan, { asCurrent: false });
  const planUrl = `${getAppBaseUrl()}/plan/${plan.id}`;
  const email = buildScheduleEmail({ mealPlan: plan, planUrl });
  await sendEmail({
    to: schedule.email,
    subject: email.subject,
    html: email.html,
    text: email.text
  });

  return plan.id;
}

export async function runDueSchedules(now: Date = new Date()): Promise<{ ran: number; failed: number }> {
  const due = await prisma.mealPlanSchedule.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now }
    }
  });

  let ran = 0;
  let failed = 0;

  for (const schedule of due) {
    try {
      await deliverSchedule(schedule);
      ran += 1;
      await prisma.mealPlanSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastError: null,
          nextRunAt: getNextRunAt(schedule.weekday, schedule.timeLocal, schedule.timeZone, now)
        }
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Schedule run failed";
      console.error("[schedule] Failed to run", schedule.id, message);
      await prisma.mealPlanSchedule.update({
        where: { id: schedule.id },
        data: {
          lastError: message,
          nextRunAt: getNextRunAt(schedule.weekday, schedule.timeLocal, schedule.timeZone, now)
        }
      });
    }
  }

  return { ran, failed };
}

export async function runScheduleNow(scheduleId: string): Promise<{ planId: string }> {
  const schedule = await prisma.mealPlanSchedule.findUnique({
    where: { id: scheduleId }
  });
  if (!schedule) {
    throw new Error("Schedule not found");
  }

  const planId = await deliverSchedule(schedule);
  const now = new Date();
  await prisma.mealPlanSchedule.update({
    where: { id: schedule.id },
    data: {
      lastRunAt: now,
      lastError: null,
      nextRunAt: getNextRunAt(schedule.weekday, schedule.timeLocal, schedule.timeZone, now)
    }
  });

  return { planId };
}

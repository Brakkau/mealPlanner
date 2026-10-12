export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_AI_TYPE, isFavouritesType, resolveFocus } from "@/lib/meal-types";
import {
  DEFAULT_TIME_ZONE,
  getNextRunAt,
  isValidEmail,
  parseTimeHHmm
} from "@/lib/schedule-time";
import { isEmailConfigured } from "@/lib/email";

type ScheduleBody = {
  email?: string;
  weekday?: number;
  timeLocal?: string;
  timeZone?: string;
  enabled?: boolean;
  people?: number;
  days?: number;
  type?: string;
  focus?: string | null;
  useFavourites?: boolean;
  fillRemainingWithAi?: boolean;
  cholesterolFriendly?: boolean;
  useLeftovers?: boolean;
  sundayRoastMeat?: string | null;
  sundayRoastVeg?: string | null;
};

function parseScheduleInput(body: ScheduleBody) {
  const email = body.email?.trim() ?? "";
  const weekday = Number(body.weekday);
  const timeLocal = body.timeLocal?.trim() ?? "";
  const timeZone = body.timeZone?.trim() || DEFAULT_TIME_ZONE;
  const people = Number(body.people);
  const days = Number(body.days);
  const type = body.type?.trim() || DEFAULT_AI_TYPE;
  const focus = resolveFocus(isFavouritesType(type) ? DEFAULT_AI_TYPE : type, body.focus);

  if (!isValidEmail(email)) {
    throw new Error("Enter a valid email address");
  }
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("Choose a day of the week");
  }
  if (!parseTimeHHmm(timeLocal)) {
    throw new Error("Enter a time as HH:MM");
  }
  if (!Number.isInteger(people) || people < 1 || people > 12) {
    throw new Error("Choose a valid number of people");
  }
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    throw new Error("Choose a valid number of days");
  }

  const sundayRoastMeat = body.sundayRoastMeat?.trim() || null;
  const sundayRoastVeg = body.sundayRoastVeg?.trim() || null;
  if ((sundayRoastMeat && !sundayRoastVeg) || (sundayRoastVeg && !sundayRoastMeat)) {
    throw new Error("Choose meat and veg for the Sunday roast");
  }
  if (sundayRoastMeat && days < 7) {
    throw new Error("Choose 7 days so Sunday is included");
  }

  return {
    email,
    weekday,
    timeLocal,
    timeZone,
    enabled: body.enabled !== false,
    people,
    days,
    type,
    focus,
    useFavourites: Boolean(body.useFavourites),
    fillRemainingWithAi: body.fillRemainingWithAi !== false,
    cholesterolFriendly: Boolean(body.cholesterolFriendly),
    useLeftovers: Boolean(body.useLeftovers),
    sundayRoastMeat,
    sundayRoastVeg,
    nextRunAt: getNextRunAt(weekday, timeLocal, timeZone)
  };
}

export async function GET() {
  try {
    const schedules = await prisma.mealPlanSchedule.findMany({
      orderBy: { nextRunAt: "asc" }
    });
    return Response.json({
      schedules,
      emailConfigured: isEmailConfigured()
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to load schedules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScheduleBody;
    const data = parseScheduleInput(body);
    const schedule = await prisma.mealPlanSchedule.create({ data });
    return Response.json(schedule, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create schedule";
    const status = message.startsWith("Enter") || message.startsWith("Choose") ? 400 : 500;
    console.error("Error:", error);
    return Response.json({ error: message }, { status });
  }
}

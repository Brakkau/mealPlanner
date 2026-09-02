export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_AI_TYPE, isFavouritesType, resolveFocus } from "@/lib/meal-types";
import { getNextRunAt, isValidEmail, parseTimeHHmm } from "@/lib/schedule-time";
import { runScheduleNow } from "@/lib/run-schedules";

type SchedulePatch = {
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
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.mealPlanSchedule.findUnique({
      where: { id: params.id }
    });
    if (!existing) {
      return Response.json({ error: "Schedule not found" }, { status: 404 });
    }

    const body = (await request.json()) as SchedulePatch;
    const email = body.email?.trim() ?? existing.email;
    const weekday = body.weekday ?? existing.weekday;
    const timeLocal = body.timeLocal?.trim() ?? existing.timeLocal;
    const timeZone = body.timeZone?.trim() ?? existing.timeZone;
    const type = body.type?.trim() ?? existing.type;
    const people = body.people ?? existing.people;
    const days = body.days ?? existing.days;

    if (!isValidEmail(email)) {
      return Response.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return Response.json({ error: "Choose a day of the week" }, { status: 400 });
    }
    if (!parseTimeHHmm(timeLocal)) {
      return Response.json({ error: "Enter a time as HH:MM" }, { status: 400 });
    }

    const schedule = await prisma.mealPlanSchedule.update({
      where: { id: params.id },
      data: {
        email,
        weekday,
        timeLocal,
        timeZone,
        enabled: body.enabled ?? existing.enabled,
        people,
        days,
        type,
        focus: resolveFocus(isFavouritesType(type) ? DEFAULT_AI_TYPE : type, body.focus ?? existing.focus),
        useFavourites: body.useFavourites ?? existing.useFavourites,
        fillRemainingWithAi: body.fillRemainingWithAi ?? existing.fillRemainingWithAi,
        nextRunAt: getNextRunAt(weekday, timeLocal, timeZone)
      }
    });

    return Response.json(schedule);
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.mealPlanSchedule.delete({
      where: { id: params.id }
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "send-now") {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    const result = await runScheduleNow(params.id);
    return Response.json({ status: "sent", planId: result.planId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send schedule";
    console.error("Error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

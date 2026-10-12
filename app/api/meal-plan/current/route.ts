export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/prisma-connection";

export async function GET() {
  try {
    const currentPlan = await prisma.mealPlan.findFirst({
      where: { isSaved: true },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    if (!currentPlan) {
      return Response.json(null);
    }

    return Response.json(currentPlan);
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn(
        "[meal-plan/current] Database unreachable; responding with no current plan."
      );
      return Response.json(null);
    }
    console.error(
      "Error fetching current meal plan:",
      error instanceof Error ? error.message : error
    );
    return Response.json({ error: 'Failed to fetch current meal plan' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Unset the current meal plan
    await prisma.mealPlan.updateMany({
      where: { isSaved: true },
      data: { isSaved: false }
    });

    return Response.json({ success: true });
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn(
        "[meal-plan/current] Database unreachable; could not clear current plan."
      );
      return Response.json({ error: "Database unavailable" }, { status: 503 });
    }
    console.error(
      "Error clearing current meal plan:",
      error instanceof Error ? error.message : error
    );
    return Response.json({ error: 'Failed to clear current meal plan' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { shoppingChecked?: unknown };
    const shoppingChecked = Array.isArray(body.shoppingChecked)
      ? body.shoppingChecked.filter((entry): entry is string => typeof entry === "string")
      : null;
    if (!shoppingChecked) {
      return Response.json({ error: "shoppingChecked is required" }, { status: 400 });
    }

    const currentPlan = await prisma.mealPlan.findFirst({
      where: { isSaved: true },
      select: { id: true }
    });
    if (!currentPlan) {
      return Response.json({ error: "No current plan" }, { status: 404 });
    }

    const updated = await prisma.mealPlan.update({
      where: { id: currentPlan.id },
      data: { shoppingChecked }
    });
    return Response.json({ shoppingChecked: updated.shoppingChecked });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to save shopping list" }, { status: 500 });
  }
}

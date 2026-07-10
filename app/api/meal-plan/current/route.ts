export const dynamic = "force-dynamic";

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

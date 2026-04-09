export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mealPlanId } = body;

    if (!mealPlanId) {
      return Response.json({ error: 'Missing meal plan ID' }, { status: 400 });
    }

    // First, unset any currently saved meal plan
    await prisma.mealPlan.updateMany({
      where: { isSaved: true },
      data: { isSaved: false }
    });

    // Also reset all cooked statuses for the new current plan
    await prisma.meal.updateMany({
      where: { mealPlanId },
      data: { isCooked: false }
    });

    // Set the new meal plan as saved
    const savedPlan = await prisma.mealPlan.update({
      where: { id: mealPlanId },
      data: { isSaved: true },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    return Response.json(savedPlan);
  } catch (error) {
    console.error('Error saving meal plan:', error);
    return Response.json({ error: 'Failed to save meal plan' }, { status: 500 });
  }
}

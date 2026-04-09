export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipeIds, people } = body;

    if (!recipeIds || recipeIds.length === 0) {
      return Response.json({ error: 'No recipes selected' }, { status: 400 });
    }

    const mealPlan = await prisma.mealPlan.create({
      data: {
        days: recipeIds.length,
        people: people || 4,
        type: 'Custom'
      }
    });

    for (let i = 0; i < recipeIds.length; i++) {
      await prisma.meal.create({
        data: {
          recipeId: recipeIds[i],
          dayNumber: i + 1,
          mealPlanId: mealPlan.id
        }
      });
    }

    const completePlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlan.id },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    return Response.json(completePlan, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to create custom meal plan' }, { status: 500 });
  }
}

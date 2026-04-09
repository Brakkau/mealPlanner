export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealId = params.id;

    // Get current meal
    const meal = await prisma.meal.findUnique({
      where: { id: mealId }
    });

    if (!meal) {
      return Response.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Toggle cooked status
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: { isCooked: !meal.isCooked },
      include: { recipe: true }
    });

    return Response.json(updatedMeal);
  } catch (error) {
    console.error('Error toggling cooked status:', error);
    return Response.json({ error: 'Failed to toggle cooked status' }, { status: 500 });
  }
}

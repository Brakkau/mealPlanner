export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const mealPlans = await prisma.mealPlan.findMany({
      include: {
        meals: {
          include: {
            recipe: true
          },
          orderBy: {
            dayNumber: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return Response.json(mealPlans);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return Response.json({ error: 'Failed to fetch meal plans' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Missing meal plan ID' }, { status: 400 });
    }

    // Delete the meal plan (meals will cascade delete)
    await prisma.mealPlan.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return Response.json({ error: 'Failed to delete meal plan' }, { status: 500 });
  }
}

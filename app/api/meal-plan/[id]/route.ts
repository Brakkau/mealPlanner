export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      include: {
        meals: {
          include: { recipe: true },
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    if (!mealPlan) {
      return Response.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    return Response.json(mealPlan);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to fetch meal plan' }, { status: 500 });
  }
}

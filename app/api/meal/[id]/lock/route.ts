export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meal = await prisma.meal.findUnique({ where: { id: params.id } });
    if (!meal) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    const updated = await prisma.meal.update({
      where: { id: params.id },
      data: { isLocked: !meal.isLocked },
      include: { recipe: true }
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to toggle lock" }, { status: 500 });
  }
}

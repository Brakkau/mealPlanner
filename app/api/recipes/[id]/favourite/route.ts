export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    const recipe = await prisma.recipe.findUnique({
      where: { id }
    });

    if (!recipe) {
      return Response.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: { isFavourite: !recipe.isFavourite }
    });

    return Response.json(updated);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to toggle favourite' }, { status: 500 });
  }
}

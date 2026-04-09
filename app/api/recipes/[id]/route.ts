export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
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

    return Response.json(recipe);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const recipe = await prisma.recipe.update({
      where: { id },
      data: body
    });

    return Response.json(recipe);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    await prisma.meal.deleteMany({
      where: { recipeId: id }
    });
    
    await prisma.recipe.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}

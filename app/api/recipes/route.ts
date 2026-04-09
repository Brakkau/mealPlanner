export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return Response.json(recipes);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, ingredients, steps, prepTime, cookTime, servings } = body;

    const recipe = await prisma.recipe.create({
      data: {
        title,
        ingredients,
        steps,
        prepTime: parseInt(prepTime),
        cookTime: parseInt(cookTime),
        servings: parseInt(servings),
        isGenerated: false,
        isFavourite: false
      }
    });

    return Response.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}

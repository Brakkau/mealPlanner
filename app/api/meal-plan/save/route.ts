export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

type RecipeInput = {
  title: string;
  ingredients: unknown;
  steps: unknown;
  prepTime: number;
  cookTime: number;
  servings: number;
  isFavourite?: boolean;
};

type MealInput = {
  dayNumber: number;
  recipe: RecipeInput;
};

type MealPlanInput = {
  id: string;
  days: number;
  people: number;
  type: string;
  meals: MealInput[];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mealPlanId, mealPlan } = body as {
      mealPlanId?: string;
      mealPlan?: MealPlanInput;
    };

    const idFromBody = mealPlanId ?? mealPlan?.id;

    if (mealPlan?.meals?.length) {
      const existing = await prisma.mealPlan.findUnique({
        where: { id: mealPlan.id }
      });

      if (!existing) {
        const savedPlan = await prisma.$transaction(async (tx) => {
          await tx.mealPlan.updateMany({
            where: { isSaved: true },
            data: { isSaved: false }
          });

          const mp = await tx.mealPlan.create({
            data: {
              days: mealPlan.days,
              people: mealPlan.people,
              type: mealPlan.type,
              isSaved: true
            }
          });

          for (const meal of mealPlan.meals) {
            const r = meal.recipe;
            const recipe = await tx.recipe.create({
              data: {
                title: r.title,
                ingredients: r.ingredients as object,
                steps: r.steps as object,
                prepTime: r.prepTime,
                cookTime: r.cookTime,
                servings: r.servings || mealPlan.people,
                isGenerated: true,
                isFavourite: r.isFavourite ?? false
              }
            });

            await tx.meal.create({
              data: {
                recipeId: recipe.id,
                mealPlanId: mp.id,
                dayNumber: meal.dayNumber
              }
            });
          }

          return tx.mealPlan.findUnique({
            where: { id: mp.id },
            include: {
              meals: {
                include: { recipe: true },
                orderBy: { dayNumber: 'asc' }
              }
            }
          });
        });

        return Response.json(savedPlan);
      }
    }

    if (!idFromBody) {
      return Response.json({ error: 'Missing meal plan ID' }, { status: 400 });
    }

    const planRow = await prisma.mealPlan.findUnique({
      where: { id: idFromBody }
    });
    if (!planRow) {
      return Response.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    await prisma.mealPlan.updateMany({
      where: { isSaved: true },
      data: { isSaved: false }
    });

    await prisma.meal.updateMany({
      where: { mealPlanId: idFromBody },
      data: { isCooked: false }
    });

    const savedPlan = await prisma.mealPlan.update({
      where: { id: idFromBody },
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

import { prisma } from "@/lib/db";
import type { GeneratedMealPlan } from "@/lib/generate-meal-plan";
import type { Ingredient, MealPlan } from "@/lib/types";

function asMealPlan(
  plan: NonNullable<Awaited<ReturnType<typeof persistMealPlanRow>>>
): MealPlan {
  return {
    ...plan,
    meals: plan.meals.map((meal) => ({
      ...meal,
      recipe: {
        ...meal.recipe,
        ingredients: (Array.isArray(meal.recipe.ingredients)
          ? meal.recipe.ingredients
          : []) as unknown as Ingredient[],
        steps: (Array.isArray(meal.recipe.steps) ? meal.recipe.steps : []) as string[]
      }
    }))
  };
}

async function persistMealPlanRow(
  mealPlan: GeneratedMealPlan,
  options: { asCurrent: boolean }
) {
  return prisma.$transaction(async (tx) => {
    if (options.asCurrent) {
      await tx.mealPlan.updateMany({
        where: { isSaved: true },
        data: { isSaved: false }
      });
    }

    const mp = await tx.mealPlan.create({
      data: {
        days: mealPlan.days,
        people: mealPlan.people,
        type: mealPlan.type,
        isSaved: options.asCurrent
      }
    });

    for (const meal of mealPlan.meals) {
      const recipe = meal.recipe;
      const existingRecipeId = recipe.id
        ? (
            await tx.recipe.findUnique({
              where: { id: recipe.id },
              select: { id: true }
            })
          )?.id
        : null;

      const recipeId =
        existingRecipeId ??
        (
          await tx.recipe.create({
            data: {
              title: recipe.title,
              ingredients: recipe.ingredients as object,
              steps: recipe.steps as object,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              servings: recipe.servings || mealPlan.people,
              isGenerated: recipe.isGenerated ?? true,
              isFavourite: recipe.isFavourite ?? false
            }
          })
        ).id;

      await tx.meal.create({
        data: {
          recipeId,
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
          orderBy: { dayNumber: "asc" }
        }
      }
    });
  });
}

export async function persistMealPlan(
  mealPlan: GeneratedMealPlan,
  options: { asCurrent: boolean }
): Promise<MealPlan> {
  const saved = await persistMealPlanRow(mealPlan, options);
  if (!saved) {
    throw new Error("Failed to store meal plan");
  }
  return asMealPlan(saved);
}

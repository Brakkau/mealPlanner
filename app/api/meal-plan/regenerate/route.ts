export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateMealPlan } from "@/lib/generate-meal-plan";
import { persistMealPlan } from "@/lib/persist-meal-plan";
import { getDislikes } from "@/lib/household-settings";
import type { PreviewRecipeInput } from "@/lib/meal-plan-preview";
import type { MealPlan } from "@/lib/types";

function asLockedMeals(plan: MealPlan): PreviewRecipeInput[] {
  return (plan.meals ?? [])
    .filter((meal) => meal.isLocked)
    .map((meal) => ({
      id: meal.recipe.id,
      title: meal.recipe.title,
      ingredients: meal.recipe.ingredients,
      steps: meal.recipe.steps,
      prepTime: meal.recipe.prepTime,
      cookTime: meal.recipe.cookTime,
      servings: meal.recipe.servings,
      isGenerated: meal.recipe.isGenerated,
      isFavourite: meal.recipe.isFavourite,
      createdAt: meal.recipe.createdAt,
      dayNumber: meal.dayNumber,
      isLocked: true
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mealPlanId?: string;
      draft?: boolean;
      mealPlanSnapshot?: MealPlan;
      lockedMealIds?: string[];
    };

    let plan: MealPlan | null = null;
    if (body.draft && body.mealPlanSnapshot) {
      plan = {
        ...body.mealPlanSnapshot,
        meals: (body.mealPlanSnapshot.meals ?? []).map((meal) => ({
          ...meal,
          isLocked: body.lockedMealIds?.includes(meal.id) ? true : Boolean(meal.isLocked)
        }))
      };
    } else if (body.mealPlanId) {
      const stored = await prisma.mealPlan.findUnique({
        where: { id: body.mealPlanId },
        include: {
          meals: { include: { recipe: true }, orderBy: { dayNumber: "asc" } }
        }
      });
      if (stored) {
        plan = stored as unknown as MealPlan;
        if (body.lockedMealIds) {
          plan = {
            ...plan,
            meals: plan.meals.map((meal) => ({
              ...meal,
              isLocked: body.lockedMealIds?.includes(meal.id) ?? Boolean(meal.isLocked)
            }))
          };
        }
      }
    }

    if (!plan) {
      return Response.json({ error: "Meal plan not found" }, { status: 404 });
    }

    const lockedMeals = asLockedMeals(plan);
    if (lockedMeals.length >= plan.days) {
      return Response.json({ error: "Unlock at least one night to regenerate" }, { status: 400 });
    }

    const dislikes = await getDislikes().catch(() => [] as string[]);
    const result = await generateMealPlan({
      people: plan.people,
      days: plan.days,
      type: plan.type,
      cholesterolFriendly: /Cholesterol/i.test(plan.type),
      dislikes,
      lockedMeals,
      fillRemainingWithAi: true
    });

    if (result.status !== "completed") {
      return Response.json(result, { status: 400 });
    }

    if (!body.draft && plan.isSaved) {
      const saved = await persistMealPlan(result.mealPlan, { asCurrent: true });
      return Response.json({ status: "completed", mealPlan: saved });
    }

    return Response.json({
      status: "completed",
      mealPlan: {
        ...result.mealPlan,
        isSaved: Boolean(plan.isSaved)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate";
    console.error("Error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

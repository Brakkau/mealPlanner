import { prisma } from "@/lib/db";
import { aggregateIngredients } from "@/lib/shopping-list";
import type { Ingredient, MealPlan } from "@/lib/types";

const SKIP_CATEGORIES = new Set(["Condiments"]);

export function leftoverNamesFromPlan(plan: MealPlan, limit = 12): string[] {
  const items = aggregateIngredients(plan, plan.people);
  const names: string[] = [];
  for (const item of items) {
    if (SKIP_CATEGORIES.has(item.category)) continue;
    if (!item.name) continue;
    if (!names.some((name) => name.toLowerCase() === item.name.toLowerCase())) {
      names.push(item.name);
    }
    if (names.length >= limit) break;
  }
  return names;
}

export async function leftoverNamesFromLastPlan(limit = 12): Promise<string[]> {
  const lastPlan = await prisma.mealPlan.findFirst({
    where: { isSaved: true },
    include: {
      meals: {
        include: { recipe: true },
        orderBy: { dayNumber: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  }).catch(() => null);

  if (!lastPlan) return [];

  const plan = {
    ...lastPlan,
    meals: lastPlan.meals.map((meal) => ({
      ...meal,
      recipe: {
        ...meal.recipe,
        ingredients: (Array.isArray(meal.recipe.ingredients)
          ? meal.recipe.ingredients
          : []) as unknown as Ingredient[],
        steps: (Array.isArray(meal.recipe.steps) ? meal.recipe.steps : []) as string[]
      }
    }))
  } as MealPlan;

  return leftoverNamesFromPlan(plan, limit);
}

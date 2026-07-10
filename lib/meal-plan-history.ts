import { prisma } from "@/lib/db";
import { isPrismaConnectionError } from "@/lib/prisma-connection";

/** Rolling window: recipes from plans created in this window are excluded from new generation. */
const EXCLUDE_DAYS = 30;

export function getRecentPlansCutoff(): Date {
  const since = new Date();
  since.setDate(since.getDate() - EXCLUDE_DAYS);
  return since;
}

/** Distinct recipe titles from meal plans created in the last EXCLUDE_DAYS days. */
export async function getRecentRecipeTitlesFromPlans(): Promise<string[]> {
  try {
    const since = getRecentPlansCutoff();

    const meals = await prisma.meal.findMany({
      where: {
        mealPlan: { createdAt: { gte: since } }
      },
      select: { recipe: { select: { title: true } } }
    });

    return [...new Set(meals.map((m) => m.recipe.title))];
  } catch (e) {
    const detail =
      isPrismaConnectionError(e)
        ? "database unreachable"
        : e instanceof Error
          ? e.message
          : String(e);
    console.warn(
      `[meal-plan-history] Could not load recent plan titles (${detail}). Continuing without duplicate avoidance.`
    );
    return [];
  }
}

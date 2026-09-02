export interface PreviewRecipeInput {
  id?: string;
  title: string;
  ingredients: unknown;
  steps: unknown;
  prepTime: number;
  cookTime: number;
  servings?: number;
  isGenerated?: boolean;
  isFavourite?: boolean;
  createdAt?: Date;
}

export interface PreviewPlanInput {
  people: number;
  days: number;
  type: string;
  recipes: PreviewRecipeInput[];
}

export function buildPreviewPlan(input: PreviewPlanInput) {
  const createdAt = new Date();
  const mealPlanId = globalThis.crypto.randomUUID();
  const meals = input.recipes.map((recipeData, index) => {
    const recipeId = recipeData.id || globalThis.crypto.randomUUID();
    return {
      id: globalThis.crypto.randomUUID(),
      recipeId,
      dayNumber: index + 1,
      mealPlanId,
      recipe: {
        id: recipeId,
        title: recipeData.title,
        ingredients: recipeData.ingredients,
        steps: recipeData.steps,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings || input.people,
        isGenerated: recipeData.isGenerated ?? true,
        isFavourite: recipeData.isFavourite ?? false,
        createdAt: recipeData.createdAt ?? createdAt
      }
    };
  });

  return {
    id: mealPlanId,
    days: input.days,
    people: input.people,
    type: input.type,
    isSaved: false,
    createdAt,
    meals
  };
}

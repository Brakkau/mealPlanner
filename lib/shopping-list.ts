import { MealPlan, ShoppingItem, Ingredient } from "./types";

export function aggregateIngredients(mealPlan: MealPlan, targetPeople: number): ShoppingItem[] {
  const ingredientMap = new Map<string, ShoppingItem>();

  mealPlan?.meals?.forEach((meal) => {
    const recipe = meal?.recipe;
    const ingredients = (recipe?.ingredients as Ingredient[]) || [];
    const servings = recipe?.servings || 4;
    const scaleFactor = targetPeople / servings;

    ingredients.forEach((ing) => {
      const key = `${ing?.name?.toLowerCase?.() ?? ""}-${ing?.unit?.toLowerCase?.() ?? ""}`;
      const scaledQuantity = (ing?.quantity || 0) * scaleFactor;

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        existing.quantity += scaledQuantity;
      } else {
        ingredientMap.set(key, {
          name: ing?.name ?? "",
          quantity: scaledQuantity,
          unit: ing?.unit ?? "",
          category: ing?.category ?? "Other",
          checked: false
        });
      }
    });
  });

  return Array.from(ingredientMap.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

export function formatShoppingQuantity(quantity: number): string {
  const rounded = Math.round(quantity * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

export function groupShoppingItems(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  return items.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);
}

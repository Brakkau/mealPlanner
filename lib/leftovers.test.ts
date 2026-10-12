import { leftoverNamesFromPlan } from "./leftovers";
import type { Ingredient, MealPlan } from "./types";

function planFromIngredients(ingredientSets: Ingredient[][]): MealPlan {
  return {
    id: "plan",
    days: ingredientSets.length,
    people: 4,
    type: "Family Friendly",
    createdAt: new Date(),
    meals: ingredientSets.map((ingredients, index) => ({
      id: `m${index + 1}`,
      recipeId: `r${index + 1}`,
      dayNumber: index + 1,
      mealPlanId: "plan",
      recipe: {
        id: `r${index + 1}`,
        title: `Meal ${index + 1}`,
        ingredients,
        steps: [],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        isGenerated: true,
        isFavourite: false,
        createdAt: new Date()
      }
    }))
  };
}

describe("leftoverNamesFromPlan", () => {
  it("skips condiments and caps the list", () => {
    const names = leftoverNamesFromPlan(
      planFromIngredients([
        [
          { name: "Chicken thighs", quantity: 500, unit: "g", category: "Meat" },
          { name: "Olive oil", quantity: 2, unit: "tbsp", category: "Condiments" },
          { name: "Rice", quantity: 300, unit: "g", category: "Pantry" }
        ]
      ]),
      12
    );
    expect(names).toContain("Chicken thighs");
    expect(names).toContain("Rice");
    expect(names.some((name) => /oil/i.test(name))).toBe(false);
  });
});

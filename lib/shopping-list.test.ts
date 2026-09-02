import { aggregateIngredients, formatShoppingQuantity, groupShoppingItems } from "./shopping-list";
import type { MealPlan } from "./types";

const plan = {
  id: "plan",
  days: 2,
  people: 4,
  type: "Family Friendly",
  createdAt: new Date(),
  meals: [
    {
      id: "m1",
      recipeId: "r1",
      dayNumber: 1,
      mealPlanId: "plan",
      recipe: {
        id: "r1",
        title: "Tacos",
        ingredients: [
          { name: "Beef", quantity: 200, unit: "g", category: "Meat" },
          { name: "Tomato", quantity: 1, unit: "g", category: "Vegetables" }
        ],
        steps: [],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        isGenerated: true,
        isFavourite: false,
        createdAt: new Date()
      }
    },
    {
      id: "m2",
      recipeId: "r2",
      dayNumber: 2,
      mealPlanId: "plan",
      recipe: {
        id: "r2",
        title: "Tacos again",
        ingredients: [{ name: "Beef", quantity: 100, unit: "g", category: "Meat" }],
        steps: [],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        isGenerated: true,
        isFavourite: false,
        createdAt: new Date()
      }
    }
  ]
} as MealPlan;

describe("aggregateIngredients", () => {
  it("combines matching ingredient names and units", () => {
    const items = aggregateIngredients(plan, 4);
    const beef = items.find((item) => item.name === "Beef");
    expect(beef?.quantity).toBe(300);
  });
});

describe("formatShoppingQuantity", () => {
  it("keeps whole numbers without decimals", () => {
    expect(formatShoppingQuantity(2)).toBe("2");
    expect(formatShoppingQuantity(1.25)).toBe("1.3");
  });
});

describe("groupShoppingItems", () => {
  it("groups by category", () => {
    const grouped = groupShoppingItems(aggregateIngredients(plan, 4));
    expect(Object.keys(grouped).sort()).toEqual(["Meat", "Vegetables"]);
  });
});

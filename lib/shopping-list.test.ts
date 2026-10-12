import {
  aggregateIngredients,
  formatShoppingItemLabel,
  formatShoppingQuantity,
  groupShoppingItems,
  shoppingCategoryNames
} from "./shopping-list";
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

  it("merges passata, oil, and stock variants", () => {
    const items = aggregateIngredients(
      planFromIngredients([
        [
          { name: "Passata", quantity: 500, unit: "g", category: "Pantry" },
          { name: "Rapeseed oil", quantity: 4, unit: "tbsp", category: "Pantry" },
          { name: "Vegetable stock", quantity: 200, unit: "ml", category: "Pantry" }
        ],
        [
          { name: "Passata or pizza sauce", quantity: 100, unit: "ml", category: "Pantry" },
          { name: "Rapeseed oil", quantity: 1, unit: "tsp", category: "Pantry" },
          { name: "Vegetable stock cube", quantity: 1, unit: "item", category: "Pantry" }
        ]
      ]),
      4
    );

    const passata = items.filter((item) => /passata/i.test(item.name));
    expect(passata.length).toBe(1);
    expect(passata[0]?.quantity).toBe(600);
    expect(passata[0]?.unit).toBe("g");

    const oil = items.filter((item) => /rapeseed oil/i.test(item.name));
    expect(oil.length).toBe(1);
    expect(Math.round((oil[0]?.quantity ?? 0) * 10) / 10).toBe(4.3);
    expect(oil[0]?.unit).toBe("tbsp");
    expect(oil[0]?.category).toBe("Condiments");

    const stock = items.filter((item) => /stock/i.test(item.name));
    expect(stock.length).toBe(1);
    expect(stock[0]?.quantity).toBe(700);
    expect(stock[0]?.unit).toBe("ml");
    expect(stock[0]?.category).toBe("Pantry");
  });

  it("puts herbs, spices, and oils in Condiments", () => {
    const items = aggregateIngredients(
      planFromIngredients([
        [
          { name: "Dried oregano", quantity: 1, unit: "tsp", category: "Pantry" },
          { name: "Curry powder (mild/medium)", quantity: 2, unit: "tbsp", category: "Pantry" },
          { name: "Extra virgin olive oil", quantity: 2, unit: "tbsp", category: "Pantry" },
          { name: "Tinned chickpeas (drained & rinsed)", quantity: 400, unit: "g", category: "Pantry" }
        ]
      ]),
      4
    );

    expect(items.find((item) => /oregano/i.test(item.name))?.category).toBe("Condiments");
    expect(items.find((item) => /curry powder/i.test(item.name))?.category).toBe("Condiments");
    expect(items.find((item) => /olive oil/i.test(item.name))?.category).toBe("Condiments");
    expect(items.find((item) => /chickpeas/i.test(item.name))?.category).toBe("Pantry");
  });

  it("merges singular and plural produce names", () => {
    const items = aggregateIngredients(
      planFromIngredients([
        [
          { name: "Carrot", quantity: 1, unit: "item", category: "Vegetables" },
          { name: "Lemon for dressing", quantity: 1, unit: "item", category: "Vegetables" },
          { name: "Green pepper", quantity: 1, unit: "item", category: "Vegetables" }
        ],
        [
          { name: "Carrots", quantity: 2, unit: "item", category: "Vegetables" },
          { name: "Lemon", quantity: 1, unit: "item", category: "Vegetables" }
        ]
      ]),
      4
    );

    const carrots = items.filter((item) => /carrot/i.test(item.name));
    expect(carrots.length).toBe(1);
    expect(carrots[0]?.quantity).toBe(3);

    const lemons = items.filter((item) => /lemon/i.test(item.name));
    expect(lemons.length).toBe(1);
    expect(lemons[0]?.quantity).toBe(2);

    expect(items.find((item) => /green pepper/i.test(item.name))?.category).toBe("Vegetables");
  });

  it("rounds partial whole items up to a shoppable amount", () => {
    const items = aggregateIngredients(
      planFromIngredients([
        [{ name: "Cucumber", quantity: 0.5, unit: "item", category: "Vegetables" }]
      ]),
      4
    );
    expect(items[0]?.quantity).toBe(1);
    expect(formatShoppingItemLabel(items[0]!)).toBe("1 Cucumber");
  });

  it("puts tofu in Pantry and splits garlic paste from garlic cloves", () => {
    const items = aggregateIngredients(
      planFromIngredients([
        [
          { name: "Firm tofu", quantity: 300, unit: "g", category: "Dairy" },
          { name: "Garlic (minced fresh or paste)", quantity: 1, unit: "tsp", category: "Pantry" },
          { name: "Garlic cloves", quantity: 4, unit: "item", category: "Pantry" }
        ]
      ]),
      4
    );

    expect(items.find((item) => /tofu/i.test(item.name))?.category).toBe("Pantry");
    expect(items.find((item) => item.name === "Garlic")?.category).toBe("Condiments");
    const cloves = items.find((item) => /clove/i.test(item.name));
    expect(cloves?.category).toBe("Vegetables");
    expect(formatShoppingItemLabel(cloves!)).toBe("4 Garlic cloves");
  });

  it("skips zero-quantity seasoning lines", () => {
    const items = aggregateIngredients(
      planFromIngredients([
        [{ name: "Salt & black pepper", quantity: 0, unit: "g", category: "Pantry" }]
      ]),
      4
    );
    expect(items.length).toBe(0);
  });
});

describe("formatShoppingQuantity", () => {
  it("keeps whole numbers without decimals", () => {
    expect(formatShoppingQuantity(2)).toBe("2");
    expect(formatShoppingQuantity(1.25)).toBe("1.3");
  });
});

describe("formatShoppingItemLabel", () => {
  it("drops item and pluralises whole foods", () => {
    expect(
      formatShoppingItemLabel({
        name: "Carrot",
        quantity: 3,
        unit: "item",
        category: "Vegetables"
      })
    ).toBe("3 Carrots");
  });

  it("omits quantities for condiments", () => {
    expect(
      formatShoppingItemLabel({
        name: "Dried oregano",
        quantity: 1,
        unit: "tsp",
        category: "Condiments"
      })
    ).toBe("Dried oregano");
  });
});

describe("groupShoppingItems", () => {
  it("groups by category", () => {
    const grouped = groupShoppingItems(aggregateIngredients(plan, 4));
    expect(shoppingCategoryNames(grouped)).toEqual(["Vegetables", "Meat"]);
  });
});

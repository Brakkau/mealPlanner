import type { Ingredient, IngredientCategory } from "@/lib/types";
import type { PreviewRecipeInput } from "@/lib/meal-plan-preview";

export type SundayRoastOptions = {
  meat: string;
  veg: string;
};

function ingredient(
  name: string,
  quantity: number,
  unit: string,
  category: IngredientCategory
): Ingredient {
  return { name, quantity, unit, category };
}

function splitVeg(veg: string): string[] {
  return veg
    .split(/,|&| and /i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildSundayRoastRecipe(
  options: SundayRoastOptions & { people: number; cholesterolFriendly?: boolean }
): PreviewRecipeInput {
  const people = Math.max(1, options.people);
  const meat = options.meat.trim() || "chicken";
  const vegList = splitVeg(options.veg);
  const vegLabel = vegList.length > 0 ? vegList.join(", ") : "seasonal vegetables";
  const oil = options.cholesterolFriendly ? "Rapeseed oil" : "Olive oil";
  const meatGrams = /chicken|turkey/i.test(meat) ? people * 300 : people * 250;

  const ingredients: Ingredient[] = [
    ingredient(meat, meatGrams, "g", "Meat"),
    ingredient("Maris Piper potatoes", people * 200, "g", "Vegetables"),
    ...vegList.map((name) => ingredient(name, people * 120, "g", "Vegetables")),
    ingredient(oil, Math.max(2, people), "tbsp", "Condiments"),
    ingredient("Reduced-salt gravy granules", people * 10, "g", "Pantry"),
    ingredient("Fresh thyme or rosemary", 1, "tbsp", "Condiments"),
    ingredient("Garlic cloves", Math.max(2, people), "item", "Vegetables")
  ];

  if (!options.cholesterolFriendly && /beef|lamb/i.test(meat)) {
    ingredients.push(ingredient("Plain flour", people * 20, "g", "Pantry"));
    ingredients.push(ingredient("Eggs", Math.max(1, Math.round(people / 2)), "item", "Dairy"));
    ingredients.push(ingredient("Semi-skimmed milk", people * 40, "ml", "Dairy"));
  }

  return {
    title: `Sunday Roast: ${meat} with ${vegLabel}`,
    ingredients,
    steps: [
      `Heat the oven to 200°C (180°C fan). Pat the ${meat} dry, rub with ${oil.toLowerCase()}, thyme, and garlic, then season.`,
      "Parboil the potatoes for 8 minutes, drain, shake to roughen, then roast in oil until golden.",
      `Spread the ${vegLabel} on a tray, toss with a little oil, and roast until tender.`,
      `Roast the ${meat} until cooked through, then rest for 15 minutes before carving.`,
      "Make gravy with the roasting juices and granules, then serve the carved meat with roast potatoes and vegetables."
    ],
    prepTime: 25,
    cookTime: 90,
    servings: people,
    isGenerated: true,
    isFavourite: false,
    isLocked: true,
    isSundayRoast: true
  };
}

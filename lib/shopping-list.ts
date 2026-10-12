import { MealPlan, ShoppingItem, Ingredient, IngredientCategory } from "./types";

export const SHOPPING_CATEGORY_ORDER: IngredientCategory[] = [
  "Vegetables",
  "Meat",
  "Dairy",
  "Pantry",
  "Frozen",
  "Condiments",
  "Other"
];

const FILLER_WORDS =
  /\b(optional|to taste|to serve|for garnish|for serving|for dressing|for topping|drained|rinsed|tinned|canned|tin|can)\b/gi;
const PARENS = /\([^)]*\)/g;
const STOCK_CUBE_ML = 500;
const TSP_ML = 5;
const TBSP_TSP = 3;

const NAME_ALIASES: Record<string, string> = {
  "extra virgin olive oil": "olive oil",
  evoo: "olive oil",
  "passata pizza sauce": "passata",
  "pizza sauce": "passata",
  "vegetable stock cube": "vegetable stock",
  "veg stock": "vegetable stock",
  "chicken stock cube": "chicken stock",
  bouillon: "stock"
};

const CONDIMENT_RE =
  /\b(oil|vinegar|soy sauce|tamari|teriyaki|worcestershire|fish sauce|oyster sauce|hot sauce|sriracha|sweet chilli|sweet chili|ketchup|mayonnaise|mayo|mustard|salt|black pepper|white pepper|ground pepper|curry powder|taco seasoning|paprika|cumin|turmeric|chilli flakes|chili flakes|cayenne|cinnamon|nutmeg|garam masala|five spice|mixed herbs|mixed spice|italian seasoning|oregano|basil|thyme|rosemary|parsley|dill|bay|garlic granules|garlic powder|garlic paste|ginger paste|ginger powder|sesame seeds|stock cube|bouillon|tomato puree|tomato purée|harissa|chilli powder|chili powder)\b/i;

const PLURAL_ALIASES: Record<string, string> = {
  carrots: "carrot",
  onions: "onion",
  peppers: "pepper",
  cloves: "clove",
  lemons: "lemon",
  limes: "lime",
  tomatoes: "tomato",
  potatoes: "potato",
  breads: "bread"
};

function canonicalIngredientName(name: string): string {
  let value = (name || "").toLowerCase();
  value = value.replace(PARENS, " ");
  const orIndex = value.search(/\s+or\s+/);
  if (orIndex >= 0) {
    value = value.slice(0, orIndex);
  }
  value = value.replace(FILLER_WORDS, " ");
  value = value.replace(/[/_,]+/g, " ");
  value = value.replace(/\bcubes?\b/g, " ");
  value = value.replace(/\s+/g, " ").trim();
  value = value
    .split(" ")
    .map((word) => PLURAL_ALIASES[word] ?? word)
    .join(" ");
  return NAME_ALIASES[value] ?? value;
}

function isPourable(canonical: string): boolean {
  return /\b(oil|passata|stock|sauce|vinegar|milk|juice|wine|water|puree|purée|broth|soup|coconut milk)\b/.test(
    canonical
  );
}

export function isCountUnit(unit: string): boolean {
  const value = (unit || "").toLowerCase().trim();
  return value === "item" || value === "items" || value === "clove" || value === "cloves";
}

function isPlantProtein(canonical: string): boolean {
  return /\b(tofu|tempeh|seitan|bean curd)\b/.test(canonical);
}

function isFreshGarlicOrGinger(name: string, canonical: string, unit: string): boolean {
  if (!/\b(garlic|ginger)\b/.test(canonical)) return false;
  const original = name.toLowerCase();
  const rawUnit = (unit || "").toLowerCase();
  return (
    /\b(cloves?|bulb|root)\b/.test(original) ||
    rawUnit === "item" ||
    rawUnit === "items" ||
    rawUnit === "clove" ||
    rawUnit === "cloves"
  );
}

function isCondimentName(name: string, canonical: string, unit = ""): boolean {
  const original = name.toLowerCase();
  const rawUnit = (unit || "").toLowerCase();
  if (/\bfresh\b/.test(original) && /\b(parsley|coriander|cilantro|basil|mint|dill|chives)\b/.test(original)) {
    return false;
  }
  if (/\b(leaves|bunch|sprigs?)\b/.test(original)) {
    return false;
  }
  if (isFreshGarlicOrGinger(name, canonical, unit)) {
    return false;
  }
  if (
    /\b(garlic|ginger)\b/.test(canonical) &&
    (rawUnit === "tsp" ||
      rawUnit === "tbsp" ||
      /\b(paste|granules|powder|dried|minced)\b/.test(original))
  ) {
    return true;
  }
  if (/\bstock\b/.test(canonical) && /\b(cube|granules|bouillon)\b/.test(original)) {
    return true;
  }
  if (/\bstock\b/.test(canonical) && !/\b(cube|granules|bouillon)\b/.test(original)) {
    return false;
  }
  return CONDIMENT_RE.test(original) || CONDIMENT_RE.test(canonical);
}

function resolveCategory(name: string, canonical: string, fallback: string, unit = ""): string {
  if (isPlantProtein(canonical)) return "Pantry";
  if (isFreshGarlicOrGinger(name, canonical, unit)) return "Vegetables";
  if (isCondimentName(name, canonical, unit)) return "Condiments";
  if (fallback && fallback !== "Other") return fallback;
  return "Other";
}

function roundCountQuantity(unit: string, quantity: number): number {
  if (!isCountUnit(unit)) return quantity;
  return Math.max(1, Math.ceil(quantity - 1e-9));
}

function matchWordCase(sample: string, next: string): string {
  if (!sample) return next;
  if (sample === sample.toUpperCase()) return next.toUpperCase();
  if (sample[0] === sample[0].toUpperCase()) {
    return next.charAt(0).toUpperCase() + next.slice(1);
  }
  return next;
}

function isAlreadyPlural(word: string): boolean {
  const lower = word.toLowerCase();
  if (["couscous", "spinach", "broccoli", "rice", "oats"].includes(lower)) return true;
  return /s$/i.test(word) && !/(ss|us)$/i.test(word);
}

function pluralizeWord(word: string): string {
  if (isAlreadyPlural(word)) return word;
  const lower = word.toLowerCase();
  if (lower.endsWith("potato")) return matchWordCase(word, `${word.slice(0, -6)}potatoes`);
  if (lower.endsWith("tomato")) return matchWordCase(word, `${word.slice(0, -6)}tomatoes`);
  if (/(ch|sh|x|z)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

export function pluralizeShoppingName(name: string, quantity: number): string {
  if (quantity === 1 || !name) return name;
  const words = name.split(" ");
  const last = words[words.length - 1];
  words[words.length - 1] = pluralizeWord(last);
  return words.join(" ");
}

export function formatShoppingItemLabel(item: {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}): string {
  if (item.category === "Condiments") {
    return item.name;
  }
  if (isCountUnit(item.unit)) {
    const quantity = roundCountQuantity(item.unit, item.quantity);
    return `${quantity} ${pluralizeShoppingName(item.name, quantity)}`;
  }
  return `${formatShoppingQuantity(item.quantity)} ${item.unit} ${item.name}`.replace(/\s+/g, " ").trim();
}

function toMergeAmount(
  name: string,
  canonical: string,
  quantity: number,
  unit: string
): { key: string; quantity: number; unit: string } {
  const rawUnit = (unit || "").toLowerCase().trim();
  const isStockCube =
    /\bstock\b/.test(canonical) &&
    (/\bcubes?\b/.test(name.toLowerCase()) || rawUnit === "item" || rawUnit === "items");

  if (isStockCube) {
    return { key: `${canonical}|ml`, quantity: quantity * STOCK_CUBE_ML, unit: "ml" };
  }

  if (rawUnit === "kg") {
    const unitName = isPourable(canonical) ? "ml" : "g";
    return { key: `${canonical}|${unitName}`, quantity: quantity * 1000, unit: unitName };
  }
  if (rawUnit === "g") {
    const unitName = isPourable(canonical) ? "ml" : "g";
    return { key: `${canonical}|${unitName}`, quantity, unit: unitName };
  }
  if (rawUnit === "l") {
    return { key: `${canonical}|ml`, quantity: quantity * 1000, unit: "ml" };
  }
  if (rawUnit === "ml") {
    return { key: `${canonical}|ml`, quantity, unit: "ml" };
  }
  if (rawUnit === "tbsp" || rawUnit === "tsp") {
    const asTsp = rawUnit === "tbsp" ? quantity * TBSP_TSP : quantity;
    if (isPourable(canonical)) {
      return { key: `${canonical}|ml`, quantity: asTsp * TSP_ML, unit: "ml" };
    }
    return { key: `${canonical}|tsp`, quantity: asTsp, unit: "tsp" };
  }

  const countUnit = rawUnit === "items" || rawUnit === "" ? "item" : rawUnit;
  return { key: `${canonical}|${countUnit}`, quantity, unit: countUnit };
}

function preferredDisplayName(names: string[]): string {
  const cleaned = names
    .map((name) =>
      name
        .replace(PARENS, "")
        .replace(/\s+or\s+.+$/i, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
  const pool = cleaned.length > 0 ? cleaned : names;
  return [...pool].sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ?? "";
}

function toDisplayAmount(
  canonical: string,
  quantity: number,
  unit: string
): { quantity: number; unit: string } {
  if (unit === "tsp" && quantity >= TBSP_TSP) {
    return { quantity: quantity / TBSP_TSP, unit: "tbsp" };
  }
  if (unit === "ml" && /\b(passata|puree|purée)\b/.test(canonical)) {
    return { quantity, unit: "g" };
  }
  if (unit === "ml" && quantity < 100 && (/\boil\b/.test(canonical) || CONDIMENT_RE.test(canonical))) {
    return { quantity: quantity / 15, unit: "tbsp" };
  }
  if (unit === "g" && quantity >= 1000) {
    return { quantity: quantity / 1000, unit: "kg" };
  }
  if (unit === "ml" && quantity >= 1000) {
    return { quantity: quantity / 1000, unit: "L" };
  }
  return { quantity, unit };
}

type MergeBucket = {
  names: string[];
  quantity: number;
  unit: string;
  canonical: string;
  category: string;
};

export function aggregateIngredients(mealPlan: MealPlan, targetPeople: number): ShoppingItem[] {
  const buckets = new Map<string, MergeBucket>();

  mealPlan?.meals?.forEach((meal) => {
    const recipe = meal?.recipe;
    const ingredients = (recipe?.ingredients as Ingredient[]) || [];
    const servings = recipe?.servings || 4;
    const scaleFactor = targetPeople / servings;

    ingredients.forEach((ing) => {
      const name = ing?.name?.trim?.() ?? "";
      if (!name) return;

      const scaledQuantity = (ing?.quantity || 0) * scaleFactor;
      if (scaledQuantity <= 0) return;

      const canonical = canonicalIngredientName(name);
      if (!canonical) return;

      const merged = toMergeAmount(name, canonical, scaledQuantity, ing?.unit ?? "");
      const category = resolveCategory(name, canonical, ing?.category ?? "Other", merged.unit);
      const existing = buckets.get(merged.key);

      if (existing) {
        existing.quantity += merged.quantity;
        existing.names.push(name);
        if (category === "Condiments") existing.category = "Condiments";
      } else {
        buckets.set(merged.key, {
          names: [name],
          quantity: merged.quantity,
          unit: merged.unit,
          canonical,
          category
        });
      }
    });
  });

  return Array.from(buckets.values())
    .map((bucket) => {
      const display = toDisplayAmount(bucket.canonical, bucket.quantity, bucket.unit);
      const quantity = roundCountQuantity(display.unit, display.quantity);
      const name = preferredDisplayName(bucket.names);
      const fromCondiment = bucket.names.some((entry) =>
        isCondimentName(entry, bucket.canonical, bucket.unit)
      );
      const volumeStock = /\bstock\b/.test(bucket.canonical) && display.unit === "ml";
      const plantProtein = isPlantProtein(bucket.canonical);
      const freshGarlicOrGinger = bucket.names.some((entry) =>
        isFreshGarlicOrGinger(entry, bucket.canonical, bucket.unit)
      );
      let category = bucket.category;
      if (volumeStock || plantProtein) category = "Pantry";
      else if (freshGarlicOrGinger) category = "Vegetables";
      else if (fromCondiment) category = "Condiments";
      return {
        name,
        quantity,
        unit: display.unit,
        category,
        checked: false
      };
    })
    .sort((a, b) => {
      const categoryDelta =
        SHOPPING_CATEGORY_ORDER.indexOf(a.category as IngredientCategory) -
        SHOPPING_CATEGORY_ORDER.indexOf(b.category as IngredientCategory);
      if (categoryDelta !== 0) return categoryDelta;
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

export function shoppingCategoryNames(grouped: Record<string, ShoppingItem[]>): string[] {
  const known = SHOPPING_CATEGORY_ORDER.filter((category) => grouped[category]?.length);
  const extras = Object.keys(grouped)
    .filter((category) => !SHOPPING_CATEGORY_ORDER.includes(category as IngredientCategory))
    .sort();
  return [...known, ...extras];
}

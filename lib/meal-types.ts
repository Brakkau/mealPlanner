// ============= Imports =============
import { INGREDIENT_CATEGORIES } from "@/lib/types";

// ============= Types =============

export const FAVOURITES_TYPE = "Favourites";
export const DEFAULT_AI_TYPE = "Family Friendly";

export const AI_MEAL_TYPES = [
  "Quick",
  "High Protein",
  "Vegetarian",
  "Meat",
  "Budget",
  "Family Friendly"
] as const;

export const WEEKLY_FOCUSES = ["Quick", "Meat", "Vegetarian", "Pasta"] as const;

export const CHOLESTEROL_LABEL = "Cholesterol";

export type AiMealType = (typeof AI_MEAL_TYPES)[number];
export type WeeklyFocus = (typeof WEEKLY_FOCUSES)[number];

export interface MealTypeOption {
  value: string;
  label: string;
}

export interface ParsedPlanType {
  isFavourites: boolean;
  styleType: string;
  focus: string | null;
  cholesterolFriendly: boolean;
}

// ============= Constants =============

export const MEAL_TYPE_OPTIONS: MealTypeOption[] = [
  ...AI_MEAL_TYPES.map((type) => ({ value: type, label: type })),
  { value: FAVOURITES_TYPE, label: "Favourites Only" }
];

const MEAL_TYPE_DESCRIPTIONS: Record<AiMealType, string> = {
  Quick:
    "quick and easy weeknight dinners ready in 30 minutes or less, with minimal prep, simple cooking methods, and everyday supermarket ingredients. Prioritise variety by rotating proteins such as fish, prawns, turkey mince, beef strips, pork, eggs, tofu, beans, lentils, halloumi, paneer, and chickpeas instead of relying mainly on chicken. Include different meal formats such as stir-fries, tray bakes, rice bowls, tacos, wraps, noodle dishes, loaded salads, soups, skillet meals, omelettes, flatbreads, and one-pan meals. Use shortcuts where helpful, such as microwave rice, frozen vegetables, canned beans, pre-chopped vegetables, jarred sauces, spice pastes, couscous, quick-cook noodles, or air-fryer methods. Meals should still feel balanced, with a protein source, vegetables, and a filling carb or fibre-rich base.",

  "High Protein":
    "high-protein balanced dinners targeting about 30-45g protein per serving, designed to be filling, nutritious, and practical for home cooking. Rotate protein sources widely, including lean beef, turkey, pork tenderloin, salmon, tuna, prawns, cod, eggs, tofu, tempeh, lentils, chickpeas, black beans, edamame, paneer, cottage cheese, Greek yogurt sauces, and occasional chicken without making chicken the default. Pair proteins with vegetables, wholegrains, potatoes, beans, pulses, or high-fibre carbs to create complete meals. Include a mix of cuisines and formats such as burrito bowls, curries, stews, grain bowls, tray bakes, chilli, kebabs, stir-fries, frittatas, protein pasta dishes, stuffed peppers, and hearty salads. Avoid bland bodybuilding-style meals; prioritise flavour, sauces, herbs, spices, marinades, and texture contrast while keeping the meal family-appropriate.",

  Vegetarian:
    "vegetarian dinners with no meat or fish, focused on satisfying, filling meals that do not feel like side dishes. Build meals around varied protein sources such as lentils, chickpeas, black beans, kidney beans, butter beans, tofu, tempeh, paneer, halloumi, eggs where suitable, Greek yogurt, cottage cheese, nuts, seeds, quinoa, and wholegrains. Include a wide range of vegetables, grains, legumes, herbs, spices, and sauces to create meals with strong texture and flavour. Suggest varied dinner formats including curries, dahls, chilli, bean tacos, veggie burgers, shakshuka, frittatas, tray bakes, stuffed peppers, noodle bowls, grain bowls, pasta bakes, risottos, soups, flatbreads, mezze-style plates, and hearty salads. Avoid overusing cheese, pasta, or mushrooms as the main solution. Meals should be satisfying for a family and suitable for people who usually eat meat.",

  Meat:
    "meat-based dinners where animal protein is the main feature, but with strong variety across chicken, turkey, beef, pork, lamb, fish, prawns, salmon, cod, tuna, sausages, lean mince, meatballs, and slow-cooked cuts. Do not default to chicken repeatedly; rotate different proteins, cuts, cuisines, and cooking methods throughout the plan. Pair meat with vegetables, salads, grains, potatoes, rice, pasta, beans, lentils, or flatbreads for complete balanced meals. Include varied formats such as tray bakes, tacos, kebabs, burgers, meatballs, stews, curries, stir-fries, noodle bowls, rice bowls, roasts, skillet meals, pasta dishes, soups, wraps, and grilled or air-fried meals. Use marinades, spice blends, sauces, herbs, and side dishes to make meals feel distinct rather than variations of the same protein and carb combination.",

  Budget:
    "budget-friendly dinners that maximise value while still offering variety, flavour, and balanced nutrition. Prioritise low-cost staples such as lentils, beans, chickpeas, eggs, tinned tomatoes, rice, pasta, potatoes, oats, couscous, frozen vegetables, seasonal vegetables, canned fish, cheaper cuts of meat, mince, sausages, tofu, and supermarket own-brand ingredients. Use meat strategically rather than as the only focus, stretching it with beans, lentils, vegetables, grains, or sauces. Include meals that reuse ingredients across multiple days to reduce waste, but avoid making the meals feel repetitive. Suggest varied formats such as chilli, curries, soups, stews, fried rice, pasta bakes, jacket potatoes, bean tacos, lentil bolognese, frittatas, tray bakes, casseroles, stir-fries, and rice bowls. Meals should be affordable, filling, family-friendly, and realistic for batch cooking or leftovers.",

  "Family Friendly":
    "family dinners for a typical home week: familiar flavours, mild to moderate spice, and meals children will actually eat while adults can still enjoy them. Customise at the table — serve chilli flakes, extra herbs, sauces, cheese, or crunchy toppings on the side so adults can add flavour without making the whole pan too strong for children. Rotate through formats a family really repeats rather than seven variations of the same plate: a pasta night, a tray bake, tacos or wraps, a meat-and-sides plate, a fish night, a sausage or mince night, and a veg-forward night. Do not default to chicken, and do not make pasta the answer every evening. Keep timings realistic for weeknights with everyday UK supermarket ingredients. Include vegetables in approachable ways such as roasted, mixed into sauces or rice, served as sticks, or offered as sides. Meals should feel comforting, colourful, and balanced — kid-appealing without being bland."
};

const FOCUS_DESCRIPTIONS: Record<WeeklyFocus, string> = {
  Quick:
    "This week's extra focus is speed: every meal should be ready in 30 minutes or less, with minimal prep, simple methods, and supermarket shortcuts such as microwave rice, frozen vegetables, jarred sauces, couscous, quick-cook noodles, or an air-fryer. Keep meals balanced, not beige.",

  Meat:
    "This week's extra focus is meat: animal protein should be the main feature of each meal, with variety across beef, pork, turkey, lamb, sausages, mince, and fish rather than chicken every night.",

  Vegetarian:
    "This week's extra focus is vegetarian: no meat or fish in any meal. Build filling dinners around legumes, tofu, tempeh, eggs, paneer, halloumi, and grains so they do not feel like side dishes.",

  Pasta:
    "This week's extra focus is pasta: include pasta as a main format across the plan, with variety in shapes, sauces, and styles (one tomato-based, one creamy or cheesy, one baked, one with a different protein or vegetable). Do not serve nearly identical pasta bowls every night, and keep some non-pasta nights if the plan is longer than four days."
};

const PROTEIN_VARIETY = [
  "chicken thighs",
  "chicken breast",
  "turkey mince",
  "lean beef mince",
  "beef strips",
  "pork tenderloin",
  "pork mince",
  "salmon",
  "cod",
  "tuna",
  "prawns",
  "eggs",
  "tofu",
  "tempeh",
  "lentils",
  "chickpeas",
  "black beans",
  "kidney beans",
  "butter beans",
  "paneer",
  "halloumi",
  "Greek yogurt",
  "cottage cheese"
];

const CHOLESTEROL_PROTEIN_ANCHORS = [
  "oily fish (salmon, mackerel, sardines, trout)",
  "lentils",
  "chickpeas",
  "beans",
  "tofu",
  "tempeh",
  "soya mince",
  "turkey mince",
  "skinless chicken",
  "unsalted nuts",
  "seeds",
  "oats/barley"
];

const PLANT_FORWARD_PROTEIN_ANCHORS = [
  "lentils",
  "chickpeas",
  "black beans",
  "kidney beans",
  "butter beans",
  "tofu",
  "tempeh",
  "paneer",
  "halloumi",
  "eggs",
  "Greek yogurt",
  "cottage cheese",
  "nuts/seeds",
  "quinoa"
];

const FOCUS_SET = new Set<string>(WEEKLY_FOCUSES);
const AI_TYPE_SET = new Set<string>(AI_MEAL_TYPES);

// ============= Helpers =============

export function isAiMealType(value: string): value is AiMealType {
  return AI_TYPE_SET.has(value);
}

export function isWeeklyFocus(value: string): value is WeeklyFocus {
  return FOCUS_SET.has(value);
}

export function isFavouritesType(type: string): boolean {
  return type === FAVOURITES_TYPE || type === "Favourites Only";
}

export function isFocusAllowed(primary: string, focus: string | null | undefined): boolean {
  if (!focus) return true;
  if (!isWeeklyFocus(focus)) return false;
  if (primary === focus) return false;
  if (primary === "Vegetarian" && focus === "Meat") return false;
  if (primary === "Meat" && focus === "Vegetarian") return false;
  return true;
}

export function getAllowedFocuses(primary: string): WeeklyFocus[] {
  return WEEKLY_FOCUSES.filter((focus) => isFocusAllowed(primary, focus));
}

export function resolveFocus(primary: string, focus: string | null | undefined): string | null {
  if (!focus || focus === "None") return null;
  if (!isFocusAllowed(primary, focus)) return null;
  return focus;
}

export function isVegetarianStyle(type: string, focus: string | null | undefined): boolean {
  return type === "Vegetarian" || focus === "Vegetarian";
}

export function getTypeDescription(type: string): string {
  if (isAiMealType(type)) {
    return MEAL_TYPE_DESCRIPTIONS[type];
  }
  return type;
}

export function getFocusDescription(focus: string): string | null {
  if (!isWeeklyFocus(focus)) return null;
  return FOCUS_DESCRIPTIONS[focus];
}

export function getCholesterolGuidance(): string {
  return `Cholesterol-lowering dinners: every meal must follow a heart-healthy pattern to help lower LDL cholesterol. Favour soluble fibre (oats, barley, beans, lentils, chickpeas, vegetables, fruit), oily fish, unsalted nuts and seeds, tofu or soya, extra virgin olive oil or rapeseed oil, and wholegrains. Cook by grilling, baking, steaming, poaching, or air-frying rather than deep-frying. Avoid or keep to a rare exception: butter, ghee, lard, coconut oil, cream, cheese-heavy sauces, pastry, pies, biscuits, sausages, bacon, salami, fatty red meat, processed meat, and takeaway-style fried food. Do not make eggs, cheese, or creamy pasta the default. If this conflicts with the meal type or weekly focus (for example creamy pasta or a sausage night), the cholesterol-lowering rules win. Meals should still be filling, flavourful, and realistic for a UK supermarket shop.`;
}

export function formatPlanTypeLabel(options: {
  type: string;
  focus?: string | null;
  isFavourites?: boolean;
  fillWithAi?: boolean;
  cholesterolFriendly?: boolean;
}): string {
  const focus = options.focus?.trim() || null;
  const cholesterol = options.cholesterolFriendly ? ` · ${CHOLESTEROL_LABEL}` : "";
  if (options.isFavourites) {
    if (options.fillWithAi) {
      const style = isAiMealType(options.type) ? options.type : DEFAULT_AI_TYPE;
      const base = focus
        ? `${FAVOURITES_TYPE} · ${style} · ${focus}`
        : `${FAVOURITES_TYPE} · ${style}`;
      return `${base}${cholesterol}`;
    }
    return `${FAVOURITES_TYPE}${cholesterol}`;
  }
  const base = focus ? `${options.type} · ${focus}` : options.type;
  return `${base}${cholesterol}`;
}

export function parsePlanType(stored: string): ParsedPlanType {
  const parts = stored
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      isFavourites: false,
      styleType: DEFAULT_AI_TYPE,
      focus: null,
      cholesterolFriendly: false
    };
  }

  const cholesterolFriendly = parts.includes(CHOLESTEROL_LABEL);

  if (isFavouritesType(parts[0])) {
    const rest = parts.slice(1);
    let styleType = DEFAULT_AI_TYPE;
    let focus: string | null = null;
    for (const part of rest) {
      if (isAiMealType(part)) styleType = part;
      else if (isWeeklyFocus(part)) focus = part;
    }
    return { isFavourites: true, styleType, focus, cholesterolFriendly };
  }

  const styleType = parts[0];
  const focus = parts.slice(1).find((part) => isWeeklyFocus(part)) ?? null;
  return { isFavourites: false, styleType, focus, cholesterolFriendly };
}

export function mealVarietyRules(
  days: number,
  isVegetarian: boolean,
  cholesterolFriendly = false
): string {
  let proteinGuidance: string;
  if (cholesterolFriendly) {
    proteinGuidance = isVegetarian
      ? `Do not default to cheese, creamy pasta, or fried food. Actively rotate legumes, tofu, tempeh, soya, oats, nuts, and seeds.`
      : `Do not default to sausages, processed meat, fatty red meat, or creamy sauces. Actively rotate oily fish, legumes, tofu, turkey, and skinless chicken.`;
  } else if (isVegetarian) {
    proteinGuidance = `Do not default to cheese, pasta, or mushrooms as the main answer for most meals. Actively rotate legumes, tofu, tempeh, paneer, halloumi, eggs, yogurt, grains, nuts, and seeds.`;
  } else {
    proteinGuidance = `Do not default to chicken as the safest option. Actively rotate between chicken, beef, pork, turkey, fish, seafood, eggs, tofu, beans, lentils, chickpeas, paneer, halloumi, and other protein sources that fit the meal style.`;
  }

  const structureExample = isVegetarian
    ? "for example three nights of cheese pasta with different herbs"
    : "for example chicken with rice, chicken pasta, and chicken wraps";

  return `
Across this meal plan (${days} days), avoid repeating the same main protein anchor more than twice unless impossible while following the meal style.
${proteinGuidance}
Vary the cuisine style, cooking method, carb base, and meal format across the days.
Avoid generating multiple meals that are essentially the same structure (${structureExample}).
Include a balance of familiar family meals and slightly different options that still feel realistic for home cooking.
`.trim();
}

export function proteinRotationContext(
  isVegetarian: boolean,
  cholesterolFriendly = false
): string {
  if (cholesterolFriendly) {
    return isVegetarian
      ? `For cholesterol-lowering vegetarian meals, rotate legumes, tofu, tempeh, soya, oats, nuts, and seeds. Do not use cheese, cream, pastry, or fried food as the main answer.`
      : `For cholesterol-lowering meals, rotate distinct protein anchors from: ${CHOLESTEROL_PROTEIN_ANCHORS.join(", ")}. Limit fatty red meat and skip processed meat.`;
  }
  return isVegetarian
    ? `Rotate distinct plant- and dairy-forward protein anchors across recipes (no meat or fish), drawing from: ${PLANT_FORWARD_PROTEIN_ANCHORS.join(", ")}.`
    : `Prefer rotating distinct main protein anchors across recipes from: ${PROTEIN_VARIETY.join(", ")}.`;
}

export function buildStylePrompt(
  type: string,
  focus: string | null,
  cholesterolFriendly = false
): string {
  const description = getTypeDescription(type);
  const focusDescription = focus ? getFocusDescription(focus) : null;
  const cholesterolDescription = cholesterolFriendly ? getCholesterolGuidance() : null;
  return [description, focusDescription, cholesterolDescription].filter(Boolean).join(" ");
}

export function buildGeneratePrompt(input: {
  people: number;
  days: number;
  type: string;
  focus: string | null;
  favouriteTitles: string[];
  pastRecipeTitles: string[];
  maxFavouriteTitles: number;
  maxHistoryTitles: number;
  cholesterolFriendly?: boolean;
}): string {
  const {
    people,
    days,
    type,
    focus,
    favouriteTitles,
    pastRecipeTitles,
    maxFavouriteTitles,
    maxHistoryTitles,
    cholesterolFriendly = false
  } = input;
  const vegetarian = isVegetarianStyle(type, focus);
  const favouriteContext =
    favouriteTitles.length > 0
      ? `\nPrefer similar style to these favourites when suitable: ${favouriteTitles
          .slice(0, maxFavouriteTitles)
          .join(", ")}`
      : "";
  const avoidContext =
    pastRecipeTitles.length > 0
      ? `\nAvoid repeating these recipe titles from meals in the last 30 days: ${pastRecipeTitles
          .slice(0, maxHistoryTitles)
          .join(", ")}`
      : "";

  return `Create ${days} unique dinner recipes for ${people} people.

Variety and repetition:
${mealVarietyRules(days, vegetarian, cholesterolFriendly)}
${proteinRotationContext(vegetarian, cholesterolFriendly)}

Meal style: ${buildStylePrompt(type, focus, cholesterolFriendly)}.${favouriteContext}${avoidContext}

Output strict JSON only with:
{
  "recipes": [{
    "title": "string",
    "ingredients": [{"name":"string","quantity":number,"unit":"g|kg|ml|L|tbsp|tsp","category":"${INGREDIENT_CATEGORIES.join("|")}"}],
    "steps": ["4-6 concise cooking steps"],
    "prepTime": number,
    "cookTime": number,
    "servings": ${people}
  }]
}

Rules:
- Exactly ${days} recipes
- Metric/British units only (g, kg, ml, L, tbsp, tsp)
- Put herbs, spices, oils, vinegars, soy sauce, and stock cubes in Condiments
- Use the same ingredient name for the same product across recipes (for example Passata, Rapeseed oil, Vegetable stock)
- No markdown or code fences
- Keep each recipe practical and concise`;
}

export function buildSwapStylePrompt(storedType: string): string {
  const parsed = parsePlanType(storedType);
  return buildStylePrompt(parsed.styleType, parsed.focus, parsed.cholesterolFriendly);
}

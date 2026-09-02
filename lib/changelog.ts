export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const APP_VERSION = "1.9.0";

export const changelog: ChangelogEntry[] = [
  {
    version: "1.9.0",
    date: "2 Sep 2026",
    changes: [
      "Schedule a weekly meal plan email with your chosen type, people, days, and focus",
      "At the set time the app builds the plan, emails a link, and includes the shopping list",
      "Open the emailed link to view meals and save the plan as current"
    ]
  },
  {
    version: "1.8.0",
    date: "2 Sep 2026",
    changes: [
      "Optional weekly focus stacks on your meal type (for example Family Friendly plus Meat, Quick, Vegetarian, or Pasta)",
      "Family Friendly plans are written for a real family week: table customising, mixed formats, and less defaulting to chicken or pasta every night",
      "Favourites Only builds a plan from your saved favourites with no AI; if you do not have enough, you can fill the remaining days with AI"
    ]
  },
  {
    version: "1.7.0",
    date: "9 Aug 2026",
    changes: [
      "Upload multiple recipe images at once — each photo is processed one at a time with AI OCR",
      "Progress shows which image is being processed (e.g. 2 of 5) across the full batch",
      "Partial failures are reported clearly so successful recipes still appear in your library"
    ]
  },
  {
    version: "1.6.0",
    date: "9 Aug 2026",
    changes: [
      "Switched the app database to Supabase Postgres (transaction + session pooler)",
      "Configured Supabase Storage (S3-compatible) for recipe image uploads via the mealRecipies bucket",
      "Environment setup updated for Hostinger-friendly pooler connections and Supabase API keys"
    ]
  },
  {
    version: "1.5.0",
    date: "11 May 2026",
    changes: [
      "Meal generation prompts rewritten so plans rotate proteins, cuisines, cooking methods, and meal formats instead of defaulting to chicken or pasta",
      "Built-in variety rules cap repeating the same main protein and discourage copy-paste meal structures across the week",
      "Vegetarian generation gets its own protein rotation hints so prompts stay consistent with no meat or fish",
      "When the database is offline (e.g. local dev without Postgres), the app logs briefly and the Current Plan API responds gracefully instead of flooding errors"
    ]
  },
  {
    version: "1.4.0",
    date: "9 Apr 2026",
    changes: [
      "Favourite meals from the Current Meal Plan page (heart button on each meal)",
      "Generated meal plans stay as a preview until you choose Save as current — recipes are only stored in the database then, and your shopping list is built after you save",
      "Swap while previewing a new plan updates the draft without saving; after saving, swaps update the shopping list as before",
      "New plans avoid repeating any recipe title from meal plans created in the last 30 days (older history can appear again)",
      "Meal Plan page shows a reminder and disables shopping list links until the plan is saved"
    ]
  },
  {
    version: "1.3.0",
    date: "25 Feb 2026",
    changes: [
      "All recipes now use British/metric measurements (g, kg, ml, L, tbsp, tsp)",
      "No more cups, ounces, or pounds in any recipes",
      "OCR recipe uploads automatically convert imperial to metric",
      "Improved generation progress with status messages"
    ]
  },
  {
    version: "1.2.0",
    date: "17 Feb 2026",
    changes: [
      "Added 'Save as Current' feature to save meal plans for active cooking",
      "New Current Meal Plan page with cooking progress tracker",
      "Mark meals as 'Cooked' with visual strike-through effect",
      "Progress bar shows how many meals you've completed",
      "Quick access to shopping list from current plan",
      "Clear current plan when you're done cooking"
    ]
  },
  {
    version: "1.1.0",
    date: "17 Feb 2026",
    changes: [
      "Added Past Meal Plans history page to view and restore previous plans",
      "New recipe generation now avoids duplicating meals from past plans",
      "Swap meal feature now also avoids previously used recipes",
      "Added History icon in navigation for quick access to past plans",
      "Can delete old meal plans from history"
    ]
  },
  {
    version: "1.0.0",
    date: "17 Feb 2026",
    changes: [
      "Initial release of Meal Planner app",
      "AI-powered meal plan generation based on preferences",
      "Customizable options: number of people, days, and meal types",
      "Swap individual meals with one click",
      "Automatic shopping list generation with ingredient aggregation",
      "Category-sorted shopping list (Vegetables, Meat, Dairy, etc.)",
      "Upload your own recipes via image with AI-powered OCR",
      "Favourite system to save your best recipes",
      "Create custom meal plans from saved recipes",
      "Mobile-friendly responsive design"
    ]
  }
];

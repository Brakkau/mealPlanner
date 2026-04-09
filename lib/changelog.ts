export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const APP_VERSION = "1.3.0";

export const changelog: ChangelogEntry[] = [
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

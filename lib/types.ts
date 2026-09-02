export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: 'Vegetables' | 'Meat' | 'Dairy' | 'Pantry' | 'Frozen' | 'Other';
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  steps: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  isGenerated: boolean;
  isFavourite: boolean;
  createdAt: Date;
}

export interface Meal {
  id: string;
  recipeId: string;
  dayNumber: number;
  mealPlanId: string;
  recipe: Recipe;
}

export interface MealPlan {
  id: string;
  days: number;
  people: number;
  type: string;
  meals: Meal[];
  createdAt: Date;
  /** Persisted in DB and set as the active "current" plan */
  isSaved?: boolean;
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
}

export interface GenerateMealPlanInput {
  people: number;
  days: number;
  type: string;
  useFavourites: boolean;
  focus?: string | null;
  fillRemainingWithAi?: boolean;
}

export interface MealPlanSchedule {
  id: string;
  email: string;
  weekday: number;
  timeLocal: string;
  timeZone: string;
  enabled: boolean;
  people: number;
  days: number;
  type: string;
  focus: string | null;
  useFavourites: boolean;
  fillRemainingWithAi: boolean;
  nextRunAt: Date;
  lastRunAt: Date | null;
  lastError: string | null;
}

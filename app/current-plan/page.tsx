"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Clock, Users, Check, ChevronDown, ChevronUp, Trash2, ShoppingCart, Heart } from "lucide-react";
import { useAppContext } from "@/lib/context";

interface Recipe {
  id: string;
  title: string;
  ingredients: Array<{ name: string; quantity: number; unit: string; category: string }>;
  steps: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  isFavourite: boolean;
}

interface Meal {
  id: string;
  dayNumber: number;
  recipe: Recipe;
  isCooked: boolean;
}

interface MealPlan {
  id: string;
  days: number;
  people: number;
  type: string;
  meals: Meal[];
  isSaved: boolean;
  createdAt: string;
}

export default function CurrentPlanPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { setCurrentMealPlan, generateShoppingList } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch('/api/meal-plan/current');
      const data = await response.json();
      setMealPlan(data);
    } catch (error) {
      console.error('Error fetching current plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavourite = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favourite`, {
        method: 'POST'
      });
      if (!response.ok) return;
      const updatedRecipe = await response.json();

      setMealPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          meals: prev.meals.map(m =>
            m.recipe.id === recipeId ? { ...m, recipe: { ...m.recipe, isFavourite: updatedRecipe.isFavourite } } : m
          )
        };
      });
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  const toggleCooked = async (mealId: string) => {
    setTogglingId(mealId);
    try {
      const response = await fetch(`/api/meal/${mealId}/cooked`, {
        method: 'POST'
      });
      const updatedMeal = await response.json();
      
      setMealPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          meals: prev.meals.map(m => 
            m.id === mealId ? { ...m, isCooked: updatedMeal.isCooked } : m
          )
        };
      });
    } catch (error) {
      console.error('Error toggling cooked:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const clearCurrentPlan = async () => {
    if (!confirm('Are you sure you want to clear the current meal plan?')) return;
    
    try {
      await fetch('/api/meal-plan/current', { method: 'DELETE' });
      setMealPlan(null);
    } catch (error) {
      console.error('Error clearing plan:', error);
    }
  };

  const goToShoppingList = () => {
    if (mealPlan) {
      setCurrentMealPlan(mealPlan as any);
      generateShoppingList(mealPlan as any, mealPlan.people);
      router.push('/shopping-list');
    }
  };

  const cookedCount = mealPlan?.meals.filter(m => m.isCooked).length || 0;
  const totalMeals = mealPlan?.meals.length || 0;
  const progressPercent = totalMeals > 0 ? (cookedCount / totalMeals) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Current Meal Plan</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Current Meal Plan</h1>
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No meal plan saved</p>
          <p className="text-sm text-gray-400 mb-4">Generate a meal plan and click "Save as Current" to track your cooking progress</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Create Meal Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Current Meal Plan</h1>
        <button
          onClick={clearCurrentPlan}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear current plan"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Plan Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-800">{mealPlan.days}-Day {mealPlan.type} Plan</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {mealPlan.people} people
              </span>
            </div>
          </div>
          <button
            onClick={goToShoppingList}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Shopping List</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Cooking Progress</span>
            <span className="font-medium text-green-600">{cookedCount} / {totalMeals} cooked</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent === 100 && (
            <p className="text-center text-green-600 font-medium mt-2">🎉 All meals cooked! Great job!</p>
          )}
        </div>
      </div>

      {/* Meals List */}
      <div className="space-y-3">
        {mealPlan.meals.map(meal => (
          <div 
            key={meal.id} 
            className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
              meal.isCooked ? 'opacity-60' : ''
            }`}
          >
            {/* Meal Header */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                >
                  <span className="text-xs font-medium text-green-600">Day {meal.dayNumber}</span>
                  <h3 className={`font-semibold text-gray-800 ${
                    meal.isCooked ? 'line-through text-gray-400' : ''
                  }`}>
                    {meal.recipe.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{meal.recipe.prepTime + meal.recipe.cookTime} min total</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavourite(meal.recipe.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      meal.recipe.isFavourite
                        ? 'text-red-500 bg-red-50'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                    title={meal.recipe.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                    aria-label={meal.recipe.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    <Heart className="w-5 h-5" fill={meal.recipe.isFavourite ? 'currentColor' : 'none'} />
                  </button>
                  {/* Cook/Cooked Button */}
                  <button
                    onClick={() => toggleCooked(meal.id)}
                    disabled={togglingId === meal.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      meal.isCooked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-green-500 hover:text-white'
                    } disabled:opacity-50`}
                  >
                    {togglingId === meal.id ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : meal.isCooked ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Cooked</span>
                      </>
                    ) : (
                      <>
                        <ChefHat className="w-4 h-4" />
                        <span>Cook</span>
                      </>
                    )}
                  </button>

                  {/* Expand/Collapse */}
                  <button
                    onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedMeal === meal.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedMeal === meal.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                {/* Ingredients */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Ingredients</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {meal.recipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-green-500">•</span>
                        {ing.quantity} {ing.unit} {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Steps */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    {meal.recipe.steps.map((step, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

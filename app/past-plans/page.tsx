"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/context";
import { Heart, Trash2, ChevronDown, ChevronUp, Clock, Users, Calendar } from "lucide-react";

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
}

interface MealPlan {
  id: string;
  days: number;
  people: number;
  type: string;
  meals: Meal[];
  createdAt: string;
}

export default function PastPlansPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { setCurrentMealPlan } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    fetchMealPlans();
  }, []);

  const fetchMealPlans = async () => {
    try {
      const response = await fetch('/api/meal-plans');
      const data = await response.json();
      setMealPlans(data);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) return;
    
    setDeletingId(id);
    try {
      await fetch(`/api/meal-plans?id=${id}`, { method: 'DELETE' });
      setMealPlans(plans => plans.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting meal plan:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewPlan = (plan: MealPlan) => {
    setCurrentMealPlan({
      id: plan.id,
      days: plan.days,
      people: plan.people,
      type: plan.type,
      createdAt: plan.createdAt,
      meals: plan.meals.map(m => ({
        id: m.id,
        dayNumber: m.dayNumber,
        recipeId: m.recipe.id,
        mealPlanId: plan.id,
        recipe: m.recipe
      }))
    } as any);
    router.push('/meal-plan');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleFavourite = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favourite`, {
        method: 'POST'
      });
      const updated = await response.json();
      
      setMealPlans(plans => plans.map(plan => ({
        ...plan,
        meals: plan.meals.map(meal => 
          meal.recipe.id === recipeId 
            ? { ...meal, recipe: { ...meal.recipe, isFavourite: updated.isFavourite } }
            : meal
        )
      })));
    } catch (error) {
      console.error('Error toggling favourite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Past Meal Plans</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Past Meal Plans</h1>

      {mealPlans.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No meal plans yet</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Create Your First Plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mealPlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Plan Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(plan.createdAt)}
                    </div>
                    <h3 className="font-semibold text-gray-800">
                      {plan.days}-Day {plan.type} Plan
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {plan.people} people
                      </span>
                      <span>{plan.meals.length} meals</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPlan(plan);
                      }}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(plan.id);
                      }}
                      disabled={deletingId === plan.id}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedPlan === plan.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Meals */}
              {expandedPlan === plan.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="space-y-3">
                    {plan.meals.map(meal => (
                      <div key={meal.id} className="bg-white p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-green-600">Day {meal.dayNumber}</span>
                          <p className="font-medium text-gray-800">{meal.recipe.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{meal.recipe.prepTime + meal.recipe.cookTime} min</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFavourite(meal.recipe.id)}
                          className={`p-2 rounded-full transition-colors ${
                            meal.recipe.isFavourite 
                              ? 'text-red-500 bg-red-50' 
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <Heart className="w-5 h-5" fill={meal.recipe.isFavourite ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

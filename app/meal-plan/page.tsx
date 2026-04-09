"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ShoppingCart, ArrowLeft, Sparkles, Save, Check } from "lucide-react";
import { useAppContext } from "@/lib/context";
import RecipeCard from "@/components/recipe-card";
import Link from "next/link";

export default function MealPlanPage() {
  const router = useRouter();
  const { currentMealPlan, setCurrentMealPlan, generateShoppingList } = useAppContext();
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveAsCurrent = async () => {
    if (!currentMealPlan) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/meal-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealPlanId: currentMealPlan.id })
      });
      
      if (!response.ok) throw new Error('Failed to save');

      generateShoppingList(currentMealPlan, currentMealPlan.people);
      setSaved(true);
      router.push('/current-plan');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save meal plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwap = async (mealId: string) => {
    if (!currentMealPlan) return;
    
    setSwappingMealId(mealId);

    try {
      const response = await fetch('/api/meal-plan/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealId,
          mealPlanId: currentMealPlan.id
        })
      });

      if (!response.ok) throw new Error('Swap failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.status === 'completed' && parsed.meal) {
                const updatedPlan = {
                  ...currentMealPlan,
                  meals: currentMealPlan.meals.map(m =>
                    m.id === mealId ? parsed.meal : m
                  )
                };
                setCurrentMealPlan(updatedPlan);
                generateShoppingList(updatedPlan, currentMealPlan.people);
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to swap meal. Please try again.');
    } finally {
      setSwappingMealId(null);
    }
  };

  const handleFavourite = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favourite`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to toggle favourite');
      
      const updatedRecipe = await response.json();
      
      if (currentMealPlan) {
        const updatedPlan = {
          ...currentMealPlan,
          meals: currentMealPlan.meals.map(m =>
            m.recipe.id === recipeId ? { ...m, recipe: updatedRecipe } : m
          )
        };
        setCurrentMealPlan(updatedPlan);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!currentMealPlan) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <div className="card">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Meal Plan Yet</h2>
          <p className="text-gray-500 mb-6">
            Generate a meal plan to see your weekly recipes here.
          </p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={20} />
            Create Meal Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Meal Plan</h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentMealPlan.days} days • {currentMealPlan.people} people • {currentMealPlan.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAsCurrent}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              saved 
                ? 'bg-green-100 text-green-700'
                : 'bg-green-500 text-white hover:bg-green-600'
            } disabled:opacity-70`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <Check size={20} />
            ) : (
              <Save size={20} />
            )}
            <span className="hidden sm:inline">{saved ? 'Saved!' : 'Save as Current'}</span>
          </button>
          <Link
            href="/shopping-list"
            className="btn-primary flex items-center gap-2"
          >
            <ShoppingCart size={20} />
            <span className="hidden sm:inline">Shopping List</span>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {(currentMealPlan?.meals ?? []).map((meal) => (
          <RecipeCard
            key={meal?.id}
            recipe={meal?.recipe}
            dayNumber={meal?.dayNumber}
            people={currentMealPlan?.people}
            onSwap={() => handleSwap(meal?.id)}
            onFavourite={() => handleFavourite(meal?.recipe?.id)}
            isSwapping={swappingMealId === meal?.id}
          />
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="flex-1 btn-secondary flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} />
          New Plan
        </Link>
        <Link
          href="/shopping-list"
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          <ShoppingCart size={20} />
          View Shopping List
        </Link>
      </div>
    </div>
  );
}

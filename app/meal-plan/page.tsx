"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, ShoppingCart, ArrowLeft, Sparkles, Save, Check, Lock, Trash2, RefreshCw } from "lucide-react";
import { useAppContext } from "@/lib/context";
import RecipeCard from "@/components/recipe-card";
import Link from "next/link";
import { weekdayLabelForDayNumber } from "@/lib/plan-days";
import type { MealPlan } from "@/lib/types";

export default function MealPlanPage() {
  const { currentMealPlan, setCurrentMealPlan, generateShoppingList } = useAppContext();
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(!currentMealPlan);
  const [cookingId, setCookingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const loadCurrentPlan = useCallback(async () => {
    try {
      const response = await fetch("/api/meal-plan/current");
      const data: unknown = await response.json();
      if (data && typeof data === "object" && data !== null && "id" in data) {
        const plan = data as MealPlan;
        setCurrentMealPlan(plan);
        generateShoppingList(plan, plan.people);
        setSaved(Boolean(plan.isSaved));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [generateShoppingList, setCurrentMealPlan]);

  useEffect(() => {
    if (currentMealPlan) {
      setIsLoading(false);
      return;
    }
    void loadCurrentPlan();
    // Load the saved plan once if this page was opened with an empty preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAsCurrent = async () => {
    if (!currentMealPlan) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/meal-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          currentMealPlan.isSaved
            ? { mealPlanId: currentMealPlan.id }
            : { mealPlan: currentMealPlan }
        )
      });
      
      if (!response.ok) throw new Error('Failed to save');

      const savedPlan = await response.json();
      setCurrentMealPlan(savedPlan);
      generateShoppingList(savedPlan, savedPlan.people);
      setSaved(true);
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
        body: JSON.stringify(
          currentMealPlan.isSaved
            ? { mealId, mealPlanId: currentMealPlan.id }
            : {
                draft: true,
                mealId,
                mealPlanId: currentMealPlan.id,
                mealPlanSnapshot: currentMealPlan
              }
        )
      });

      const contentType = response.headers.get('content-type') ?? '';

      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const data: unknown = await response.json();
          const message =
            data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
              ? data.error
              : 'Swap failed';
          throw new Error(message);
        }
        throw new Error('Swap failed');
      }

      const applyMeal = (updatedMeal: (typeof currentMealPlan.meals)[number]) => {
        const updatedPlan = {
          ...currentMealPlan,
          meals: currentMealPlan.meals.map((m) =>
            m.id === mealId ? updatedMeal : m
          )
        };
        setCurrentMealPlan(updatedPlan);
        if (currentMealPlan.isSaved) {
          generateShoppingList(updatedPlan, currentMealPlan.people);
        }
      };

      if (contentType.includes('application/json')) {
        const parsed: unknown = await response.json();
        if (
          parsed &&
          typeof parsed === 'object' &&
          'status' in parsed &&
          parsed.status === 'completed' &&
          'meal' in parsed &&
          parsed.meal
        ) {
          applyMeal(parsed.meal as (typeof currentMealPlan.meals)[number]);
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          'message' in parsed &&
          typeof parsed.message === 'string'
        ) {
          throw new Error(parsed.message);
        } else {
          throw new Error('Swap failed');
        }
        return;
      }

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
                if (currentMealPlan.isSaved) {
                  generateShoppingList(updatedPlan, currentMealPlan.people);
                }
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to swap meal. Please try again.'
      );
    } finally {
      setSwappingMealId(null);
    }
  };

  const handleLock = async (mealId: string) => {
    if (!currentMealPlan) return;
    const meal = currentMealPlan.meals.find((entry) => entry.id === mealId);
    if (!meal) return;

    const nextLocked = !meal.isLocked;
    setCurrentMealPlan({
      ...currentMealPlan,
      meals: currentMealPlan.meals.map((entry) =>
        entry.id === mealId ? { ...entry, isLocked: nextLocked } : entry
      )
    });

    if (!currentMealPlan.isSaved) return;
    try {
      const response = await fetch(`/api/meal/${mealId}/lock`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to lock meal");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to lock that night.");
    }
  };

  const handleCook = async (mealId: string) => {
    if (!currentMealPlan?.isSaved) return;
    setCookingId(mealId);
    try {
      const response = await fetch(`/api/meal/${mealId}/cooked`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to update cooked");
      const updated = await response.json();
      setCurrentMealPlan({
        ...currentMealPlan,
        meals: currentMealPlan.meals.map((entry) =>
          entry.id === mealId ? { ...entry, isCooked: Boolean(updated.isCooked) } : entry
        )
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to update cooked.");
    } finally {
      setCookingId(null);
    }
  };

  const handleRegenerate = async () => {
    if (!currentMealPlan) return;
    const lockedCount = currentMealPlan.meals.filter((meal) => meal.isLocked).length;
    if (lockedCount === 0) {
      alert("Lock the nights you want to keep, then regenerate the rest.");
      return;
    }
    setRegenerating(true);
    try {
      const response = await fetch("/api/meal-plan/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          currentMealPlan.isSaved
            ? {
                mealPlanId: currentMealPlan.id,
                lockedMealIds: currentMealPlan.meals.filter((meal) => meal.isLocked).map((meal) => meal.id)
              }
            : {
                draft: true,
                mealPlanSnapshot: currentMealPlan,
                lockedMealIds: currentMealPlan.meals.filter((meal) => meal.isLocked).map((meal) => meal.id)
              }
        )
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to regenerate"
        );
      }
      if (data && typeof data === "object" && "mealPlan" in data && data.mealPlan) {
        const plan = data.mealPlan as MealPlan;
        setCurrentMealPlan(plan);
        if (plan.isSaved) generateShoppingList(plan, plan.people);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error instanceof Error ? error.message : "Failed to regenerate unlocked nights.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleClear = async () => {
    if (!currentMealPlan?.isSaved) {
      setCurrentMealPlan(null);
      return;
    }
    if (!confirm("Clear the current meal plan?")) return;
    try {
      await fetch("/api/meal-plan/current", { method: "DELETE" });
      setCurrentMealPlan(null);
      setSaved(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to clear the plan.");
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

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center text-gray-500">
        Loading meal plan...
      </div>
    );
  }

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
          {!currentMealPlan.isSaved && (
            <p className="text-amber-700 text-sm mt-2">
              Save as current to store recipes and build your shopping list.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentMealPlan.isSaved && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
              aria-label="Clear current plan"
            >
              <Trash2 size={20} />
            </button>
          )}
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
            className={`btn-primary flex items-center gap-2 ${!currentMealPlan.isSaved ? 'pointer-events-none opacity-50' : ''}`}
            aria-disabled={!currentMealPlan.isSaved}
            title={!currentMealPlan.isSaved ? 'Save as current first' : undefined}
          >
            <ShoppingCart size={20} />
            <span className="hidden sm:inline">Shopping List</span>
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {regenerating ? <RefreshCw size={18} className="animate-spin" /> : <Lock size={18} />}
          {regenerating ? "Regenerating..." : "Regenerate unlocked nights"}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Lock the meals you want to keep, then regenerate the rest.
        </p>
      </div>

      <div className="space-y-4">
        {(currentMealPlan?.meals ?? []).map((meal) => (
          <RecipeCard
            key={meal?.id}
            recipe={meal?.recipe}
            dayNumber={meal?.dayNumber}
            dayLabel={weekdayLabelForDayNumber(meal?.dayNumber)}
            people={currentMealPlan?.people}
            isLocked={Boolean(meal?.isLocked)}
            isCooked={Boolean(meal?.isCooked)}
            isCooking={cookingId === meal?.id}
            onLock={() => handleLock(meal?.id)}
            onCook={currentMealPlan.isSaved ? () => handleCook(meal?.id) : undefined}
            onSwap={() => handleSwap(meal?.id)}
            onFavourite={
              currentMealPlan.isSaved
                ? () => handleFavourite(meal?.recipe?.id)
                : undefined
            }
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
          className={`flex-1 btn-primary flex items-center justify-center gap-2 ${!currentMealPlan.isSaved ? 'pointer-events-none opacity-50' : ''}`}
          aria-disabled={!currentMealPlan.isSaved}
        >
          <ShoppingCart size={20} />
          View Shopping List
        </Link>
      </div>
    </div>
  );
}

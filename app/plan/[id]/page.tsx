"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ShoppingCart, Save, Loader2 } from "lucide-react";
import RecipeCard from "@/components/recipe-card";
import { useAppContext } from "@/lib/context";
import { MealPlan } from "@/lib/types";
import {
  aggregateIngredients,
  formatShoppingItemLabel,
  groupShoppingItems,
  shoppingCategoryNames
} from "@/lib/shopping-list";

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: "bg-green-100 text-green-700",
  Meat: "bg-red-100 text-red-700",
  Dairy: "bg-blue-100 text-blue-700",
  Pantry: "bg-amber-100 text-amber-700",
  Frozen: "bg-cyan-100 text-cyan-700",
  Condiments: "bg-purple-100 text-purple-700",
  Other: "bg-gray-100 text-gray-700"
};

export default function SharedPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setCurrentMealPlan, generateShoppingList } = useAppContext();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/meal-plan/${id}`);
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            data && typeof data === "object" && "error" in data && typeof data.error === "string"
              ? data.error
              : "Meal plan not found"
          );
        }
        if (!cancelled) {
          setPlan(data as MealPlan);
          setError(null);
        }
      } catch (err) {
        console.error("Error:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load meal plan");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  const handleSaveAsCurrent = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const response = await fetch("/api/meal-plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlanId: plan.id })
      });
      if (!response.ok) throw new Error("Failed to save");
      const savedPlan = (await response.json()) as MealPlan;
      setCurrentMealPlan(savedPlan);
      generateShoppingList(savedPlan, savedPlan.people);
      router.push("/current-plan");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to save meal plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Loading meal plan...
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <div className="card">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Meal plan not found</h2>
          <p className="text-gray-500 mb-6">{error || "This link may have expired."}</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            Create Meal Plan
          </Link>
        </div>
      </div>
    );
  }

  const shopping = aggregateIngredients(plan, plan.people);
  const grouped = groupShoppingItems(shopping);
  const categories = shoppingCategoryNames(grouped);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled meal plan</h1>
          <p className="text-gray-500 text-sm mt-1">
            {plan.days} days · {plan.people} people · {plan.type}
          </p>
        </div>
        <button
          onClick={handleSaveAsCurrent}
          disabled={saving || plan.isSaved}
          className="btn-primary flex items-center gap-2 disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {plan.isSaved ? "Current plan" : "Save as current"}
        </button>
      </div>

      <div className="space-y-4 mb-10">
        {(plan.meals ?? []).map((meal) => (
          <RecipeCard
            key={meal.id}
            recipe={meal.recipe}
            dayNumber={meal.dayNumber}
            people={plan.people}
          />
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <ShoppingCart size={20} className="text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Shopping list</h2>
      </div>
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category} className="card">
            <span
              className={`px-3 py-1 rounded-lg text-sm font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}
            >
              {category}
            </span>
            <ul className="mt-3 space-y-2">
              {grouped[category].map((item) => (
                <li key={`${item.name}-${item.unit}`} className="text-sm text-gray-700">
                  {formatShoppingItemLabel(item)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

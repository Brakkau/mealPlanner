"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, Users, Calendar, Utensils, Star, Loader2, Sparkles, Clock, Activity } from "lucide-react";
import { useAppContext } from "@/lib/context";
import { formatTokenCount } from "@/lib/llm-usage-utils";
import {
  DEFAULT_AI_TYPE,
  MEAL_TYPE_OPTIONS,
  getAllowedFocuses,
  isFavouritesType
} from "@/lib/meal-types";

export default function HomePage() {
  const router = useRouter();
  const { setCurrentMealPlan, clearShoppingList } = useAppContext();

  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(7);
  const [mealType, setMealType] = useState(DEFAULT_AI_TYPE);
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [useFavourites, setUseFavourites] = useState(false);
  const [cholesterolFriendly, setCholesterolFriendly] = useState(false);
  const [favouriteCount, setFavouriteCount] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastTokenUsage, setLastTokenUsage] = useState<{
    totalTokens: number;
    estimated: boolean;
    monthlyRemaining?: number;
  } | null>(null);

  const favouritesOnly = isFavouritesType(mealType);
  const focusPrimary = favouritesOnly ? DEFAULT_AI_TYPE : mealType;
  const allowedFocuses = getAllowedFocuses(focusPrimary);
  const hasShortfall =
    favouritesOnly && favouriteCount !== null && favouriteCount > 0 && favouriteCount < days;
  const hasNoFavourites = favouritesOnly && favouriteCount === 0;
  const showWeeklyFocus = !favouritesOnly || hasShortfall;
  const showCholesterolToggle = !favouritesOnly || hasShortfall;

  useEffect(() => {
    if (!favouritesOnly) {
      setFavouriteCount(null);
      return;
    }

    let cancelled = false;

    const loadFavouriteCount = async () => {
      try {
        const response = await fetch("/api/recipes");
        const data: unknown = await response.json();
        if (cancelled) return;
        const recipes = Array.isArray(data) ? data : [];
        const count = recipes.filter(
          (recipe: { isFavourite?: boolean }) => recipe.isFavourite
        ).length;
        setFavouriteCount(count);
      } catch (error) {
        console.error("Error:", error);
        if (!cancelled) setFavouriteCount(null);
      }
    };

    void loadFavouriteCount();
    return () => {
      cancelled = true;
    };
  }, [favouritesOnly]);

  const handleMealTypeChange = (nextType: string) => {
    setMealType(nextType);
    if (isFavouritesType(nextType)) {
      setUseFavourites(false);
    }
    const nextFocusPrimary = isFavouritesType(nextType) ? DEFAULT_AI_TYPE : nextType;
    const nextAllowed = getAllowedFocuses(nextFocusPrimary);
    if (weeklyFocus && !nextAllowed.includes(weeklyFocus as (typeof nextAllowed)[number])) {
      setWeeklyFocus("");
    }
  };

  const handleGenerate = async (fillRemainingWithAi = false) => {
    if (hasNoFavourites) return;
    if (hasShortfall && !fillRemainingWithAi) return;

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage(
      favouritesOnly && !fillRemainingWithAi
        ? "Picking from your favourites..."
        : favouritesOnly
          ? "Picking favourites and generating extra meals..."
          : "Generating recipes with AI..."
    );
    setLastTokenUsage(null);

    try {
      const response = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people,
          days,
          type: mealType,
          useFavourites: favouritesOnly ? false : useFavourites,
          focus: weeklyFocus || null,
          fillRemainingWithAi,
          cholesterolFriendly
        })
      });

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split("\n");
        partialRead = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.status === "processing") {
              if (parsed.message) setStatusMessage(parsed.message);
              setProgress((prev) => Math.min(prev + 2, 45));
            } else if (parsed.status === "need_fill") {
              setFavouriteCount(
                typeof parsed.favouriteCount === "number" ? parsed.favouriteCount : favouriteCount
              );
              throw new Error("shortfall");
            } else if (parsed.status === "completed" && parsed.mealPlan) {
              setProgress(90);
              if (parsed.tokenUsage?.totalTokens) {
                setLastTokenUsage({
                  totalTokens: parsed.tokenUsage.totalTokens,
                  estimated: Boolean(parsed.tokenUsage.estimated),
                  monthlyRemaining: parsed.tokenUsage.monthly?.remaining
                });
              }
              setStatusMessage("Finalizing meal plan...");
              clearShoppingList();
              setCurrentMealPlan(parsed.mealPlan);
              setProgress(100);
              setStatusMessage("Done! Redirecting...");
              router.push("/meal-plan");
              return;
            } else if (parsed.status === "error") {
              throw new Error(parsed.message || "Generation failed");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof Error && error.message === "shortfall") {
        return;
      }
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate meal plan. Please try again."
      );
    } finally {
      setIsGenerating(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
          <ChefHat className="text-green-600" size={32} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Meal Plan Generator
        </h1>
        <p className="text-gray-500">
          Create personalized meal plans powered by AI
        </p>
      </div>

      <div className="card space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Users size={18} className="text-green-600" />
            Number of People
          </label>
          <select
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
            className="select-field"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? "person" : "people"}
              </option>
            ))}
            <option value={12}>10+ people</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar size={18} className="text-green-600" />
            Number of Days
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="select-field"
          >
            {[...Array(14)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? "day" : "days"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Utensils size={18} className="text-green-600" />
            Type of Meals
          </label>
          <select
            value={mealType}
            onChange={(e) => handleMealTypeChange(e.target.value)}
            className="select-field"
          >
            {MEAL_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {showWeeklyFocus && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Sparkles size={18} className="text-green-600" />
              This week&apos;s focus
            </label>
            <select
              value={weeklyFocus}
              onChange={(e) => setWeeklyFocus(e.target.value)}
              className="select-field"
            >
              <option value="">None</option>
              {allowedFocuses.map((focus) => (
                <option key={focus} value={focus}>
                  {focus}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {hasShortfall
                ? "Optional. Used for the extra AI meals, which default to Family Friendly."
                : "Optional. Stacks on the meal type above — for example Family Friendly plus Meat."}
            </p>
          </div>
        )}

        {favouritesOnly && favouriteCount !== null && (
          <p className="text-sm text-gray-600">
            You have {favouriteCount} favourite {favouriteCount === 1 ? "recipe" : "recipes"}.
          </p>
        )}

        {hasNoFavourites && (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">
            Add some favourite meals first, then come back to build a plan from them.{" "}
            <Link href="/favourites" className="font-medium text-green-700 underline">
              Go to Favourites
            </Link>
          </p>
        )}

        {hasShortfall && (
          <div className="space-y-3 p-4 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-900">
              You have {favouriteCount} favourites but asked for {days} days.
            </p>
            <p className="text-sm text-amber-800">
              Fill the remaining {days - (favouriteCount ?? 0)}{" "}
              {(days - (favouriteCount ?? 0)) === 1 ? "meal" : "meals"} with AI, or use fewer days.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                className="btn-primary flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Fill remaining with AI
              </button>
              <button
                type="button"
                onClick={() => setDays(favouriteCount ?? days)}
                disabled={isGenerating}
                className="btn-secondary flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                Use {favouriteCount} {(favouriteCount ?? 0) === 1 ? "day" : "days"} instead
              </button>
            </div>
          </div>
        )}

        {!favouritesOnly && (
          <label className="flex items-center gap-3 p-4 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-colors">
            <input
              type="checkbox"
              checked={useFavourites}
              onChange={(e) => setUseFavourites(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div className="flex items-center gap-2">
              <Star size={18} className="text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                Use favourited meals when possible
              </span>
            </div>
          </label>
        )}

        {showCholesterolToggle && (
          <label className="flex items-start gap-3 p-4 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-colors">
            <input
              type="checkbox"
              checked={cholesterolFriendly}
              onChange={(e) => setCholesterolFriendly(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">Cholesterol meals</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Generated meals favour foods that help lower cholesterol and avoid those that raise it.
              </p>
            </div>
          </label>
        )}

        <button
          onClick={() => handleGenerate(false)}
          disabled={isGenerating || hasNoFavourites || hasShortfall}
          className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span>Generating... {progress}%</span>
            </>
          ) : (
            <>
              <ChefHat size={24} />
              <span>Generate Meal Plan</span>
            </>
          )}
        </button>

        {isGenerating && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {statusMessage && (
              <p className="text-sm text-center text-gray-600 animate-pulse">
                {statusMessage}
              </p>
            )}
          </div>
        )}

        {lastTokenUsage && (
          <p className="text-[11px] text-center text-gray-400">
            Last run used {formatTokenCount(lastTokenUsage.totalTokens)} tokens
            {lastTokenUsage.estimated ? " (est.)" : ""}
            {typeof lastTokenUsage.monthlyRemaining === "number"
              ? ` · ${formatTokenCount(lastTokenUsage.monthlyRemaining)} left this month`
              : ""}
          </p>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
        >
          <Clock size={16} />
          Schedule a weekly email instead
        </Link>
      </div>
    </div>
  );
}

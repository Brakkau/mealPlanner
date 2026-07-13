"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Users, Calendar, Utensils, Star, Loader2 } from "lucide-react";
import { useAppContext } from "@/lib/context";
import { formatTokenCount } from "@/lib/llm-usage-utils";

const MEAL_TYPES = [
  "Quick",
  "High Protein",
  "Vegetarian",
  "Meat",
  "Budget",
  "Family Friendly"
];

export default function HomePage() {
  const router = useRouter();
  const { setCurrentMealPlan, clearShoppingList } = useAppContext();

  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(7);
  const [mealType, setMealType] = useState("Family Friendly");
  const [useFavourites, setUseFavourites] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastTokenUsage, setLastTokenUsage] = useState<{
    totalTokens: number;
    estimated: boolean;
    monthlyRemaining?: number;
  } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Generating recipes with AI...");
    setLastTokenUsage(null);

    try {
      const response = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people,
          days,
          type: mealType,
          useFavourites
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
              setProgress((prev) => Math.min(prev + 2, 45));
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
            onChange={(e) => setMealType(e.target.value)}
            className="select-field"
          >
            {MEAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

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

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
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
    </div>
  );
}

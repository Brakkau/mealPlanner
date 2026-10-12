"use client";

import { useState } from "react";
import { Clock, Users, Heart, RefreshCw, ChevronDown, ChevronUp, Trash2, Lock, Unlock, ChefHat, Check } from "lucide-react";
import { Recipe, Ingredient } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  dayNumber?: number;
  people?: number;
  onSwap?: () => void;
  onFavourite?: () => void;
  onDelete?: () => void;
  onLock?: () => void;
  onCook?: () => void;
  isSwapping?: boolean;
  isLocked?: boolean;
  isCooked?: boolean;
  isCooking?: boolean;
  dayLabel?: string;
  showDelete?: boolean;
}

export default function RecipeCard({
  recipe,
  dayNumber,
  people,
  onSwap,
  onFavourite,
  onDelete,
  onLock,
  onCook,
  isSwapping,
  isLocked,
  isCooked,
  isCooking,
  dayLabel,
  showDelete
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const ingredients = (recipe?.ingredients as Ingredient[]) || [];
  const steps = (recipe?.steps as string[]) || [];
  const servings = recipe?.servings || 4;
  const scaleFactor = people ? people / servings : 1;

  const formatQuantity = (qty: number) => {
    const scaled = qty * scaleFactor;
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  };

  return (
    <div className="card bg-white border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {dayNumber && (
            <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-lg mb-2">
              {dayLabel ? `${dayLabel} · Day ${dayNumber}` : `Day ${dayNumber}`}
            </span>
          )}
          {isLocked && (
            <span className="inline-block ml-2 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-lg mb-2">
              Locked
            </span>
          )}
          <h3 className={`font-semibold text-gray-900 text-lg leading-tight ${isCooked ? "line-through text-gray-400" : ""}`}>
            {recipe?.title ?? 'Untitled Recipe'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onLock && (
            <button
              onClick={onLock}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isLocked
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-700"
              }`}
              aria-label={isLocked ? "Unlock night" : "Lock night"}
            >
              {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
          )}
          {onFavourite && (
            <button
              onClick={onFavourite}
              className={`p-2 rounded-xl transition-all duration-200 ${
                recipe?.isFavourite
                  ? "bg-red-50 text-red-500"
                  : "bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
              }`}
              aria-label="Toggle favourite"
            >
              <Heart size={20} fill={recipe?.isFavourite ? "currentColor" : "none"} />
            </button>
          )}
          {showDelete && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
              aria-label="Delete recipe"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Clock size={16} />
          <span>{(recipe?.prepTime ?? 0) + (recipe?.cookTime ?? 0)} min</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{people || recipe?.servings || 4} servings</span>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mt-4 text-green-600 font-medium text-sm hover:text-green-700 transition-colors"
      >
        {expanded ? "Hide Details" : "Show Details"}
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Ingredients</h4>
            <ul className="space-y-1">
              {ingredients.map((ing, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>
                    {formatQuantity(ing?.quantity || 0)} {ing?.unit ?? ''} {ing?.name ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Instructions</h4>
            <ol className="space-y-2">
              {steps.map((step, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {onCook && (
          <button
            onClick={onCook}
            disabled={isCooking}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium disabled:opacity-50 ${
              isCooked
                ? "bg-green-100 text-green-700"
                : "btn-secondary"
            }`}
          >
            {isCooked ? <Check size={18} /> : <ChefHat size={18} />}
            {isCooked ? "Cooked" : "Cook"}
          </button>
        )}
        {onSwap && (
          <button
            onClick={onSwap}
            disabled={isSwapping || isLocked}
            className="flex-1 btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={isSwapping ? "animate-spin" : ""} />
            {isSwapping ? "Swapping..." : "Swap Meal"}
          </button>
        )}
      </div>
    </div>
  );
}

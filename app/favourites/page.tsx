"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2, Calendar } from "lucide-react";
import RecipeCard from "@/components/recipe-card";
import { Recipe } from "@/lib/types";
import Link from "next/link";

export default function FavouritesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavourites();
  }, []);

  const fetchFavourites = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.filter((r: Recipe) => r.isFavourite));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfavourite = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favourite`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setRecipes(prev => prev.filter(r => r.id !== recipeId));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setRecipes(prev => prev.filter(r => r.id !== recipeId));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Favourite Recipes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your saved favourite recipes for meal planning
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto text-green-500" size={40} />
          <p className="text-gray-500 mt-4">Loading favourites...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="card text-center py-12">
          <Heart className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Favourites Yet</h2>
          <p className="text-gray-500 mb-6">
            Heart recipes from your meal plans to save them here.
          </p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <Calendar size={20} />
            Generate Meal Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavourite={() => handleUnfavourite(recipe.id)}
              onDelete={() => handleDelete(recipe.id)}
              showDelete
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Upload, Plus, Loader2, Image as ImageIcon, X } from "lucide-react";
import RecipeCard from "@/components/recipe-card";
import { Recipe } from "@/lib/types";
import Link from "next/link";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setShowUploadModal(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/recipes/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

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
              if (parsed.status === 'processing') {
                setUploadProgress(prev => Math.min(prev + 3, 95));
              } else if (parsed.status === 'completed' && parsed.recipe) {
                setRecipes(prev => [parsed.recipe, ...prev]);
                setUploadProgress(100);
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFavourite = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favourite`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const updatedRecipe = await response.json();
        setRecipes(prev =>
          prev.map(r => r.id === recipeId ? updatedRecipe : r)
        );
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
        setSelectedRecipes(prev => prev.filter(id => id !== recipeId));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipes(prev =>
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleCreateCustomPlan = async () => {
    if (selectedRecipes.length === 0) {
      alert('Please select at least one recipe');
      return;
    }

    setIsCreatingPlan(true);

    try {
      const response = await fetch('/api/meal-plan/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeIds: selectedRecipes,
          people: 4
        })
      });

      if (response.ok) {
        alert('Custom meal plan created! Check Meal Plan page.');
        setSelectedRecipes([]);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create custom plan');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const userRecipes = recipes.filter(r => !r.isGenerated);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Recipes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload and manage your own recipes
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
          disabled={isUploading}
        >
          <Upload size={20} />
          <span className="hidden sm:inline">Upload Recipe</span>
        </button>
      </div>

      {isUploading && (
        <div className="card mb-6 bg-green-50">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-green-600" size={24} />
            <div className="flex-1">
              <p className="font-medium text-green-800">Processing image...</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecipes.length > 0 && (
        <div className="card mb-6 bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <p className="text-green-800 font-medium">
              {selectedRecipes.length} recipe{selectedRecipes.length > 1 ? 's' : ''} selected
            </p>
            <button
              onClick={handleCreateCustomPlan}
              disabled={isCreatingPlan}
              className="btn-primary flex items-center gap-2"
            >
              {isCreatingPlan ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              Create Custom Plan
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto text-green-500" size={40} />
          <p className="text-gray-500 mt-4">Loading recipes...</p>
        </div>
      ) : userRecipes.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Recipes Yet</h2>
          <p className="text-gray-500 mb-6">
            Upload photos of your recipes to get started.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Upload size={20} />
            Upload First Recipe
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {userRecipes.map((recipe) => (
            <div key={recipe.id} className="relative">
              <div
                className={`absolute -left-2 top-0 bottom-0 w-1 rounded-full transition-all duration-200 ${
                  selectedRecipes.includes(recipe.id) ? 'bg-green-500' : 'bg-transparent'
                }`}
              />
              <div
                onClick={() => toggleRecipeSelection(recipe.id)}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedRecipes.includes(recipe.id) ? 'ring-2 ring-green-500 rounded-2xl' : ''
                }`}
              >
                <RecipeCard
                  recipe={recipe}
                  onFavourite={() => handleFavourite(recipe.id)}
                  onDelete={() => handleDelete(recipe.id)}
                  showDelete
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Recipe Image</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Upload a photo of a recipe from a cookbook, website, or handwritten note. 
              AI will extract all the details automatically.
            </p>
            <label className="block w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all duration-200">
                <ImageIcon className="mx-auto text-gray-400 mb-3" size={40} />
                <p className="font-medium text-gray-700">Click to upload image</p>
                <p className="text-sm text-gray-500 mt-1">JPG, PNG or WEBP</p>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

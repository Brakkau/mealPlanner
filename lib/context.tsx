"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MealPlan, ShoppingItem, Ingredient } from './types';

interface AppContextType {
  currentMealPlan: MealPlan | null;
  setCurrentMealPlan: (plan: MealPlan | null) => void;
  shoppingList: ShoppingItem[];
  generateShoppingList: (mealPlan: MealPlan, people: number) => void;
  toggleShoppingItem: (index: number) => void;
  clearShoppingList: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function aggregateIngredients(mealPlan: MealPlan, targetPeople: number): ShoppingItem[] {
  const ingredientMap = new Map<string, ShoppingItem>();

  mealPlan?.meals?.forEach(meal => {
    const recipe = meal?.recipe;
    const ingredients = (recipe?.ingredients as Ingredient[]) || [];
    const servings = recipe?.servings || 4;
    const scaleFactor = targetPeople / servings;

    ingredients.forEach(ing => {
      const key = `${ing?.name?.toLowerCase?.() ?? ''}-${ing?.unit?.toLowerCase?.() ?? ''}`;
      const scaledQuantity = (ing?.quantity || 0) * scaleFactor;

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        existing.quantity += scaledQuantity;
      } else {
        ingredientMap.set(key, {
          name: ing?.name ?? '',
          quantity: scaledQuantity,
          unit: ing?.unit ?? '',
          category: ing?.category ?? 'Other',
          checked: false
        });
      }
    });
  });

  return Array.from(ingredientMap.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const generateShoppingList = (mealPlan: MealPlan, people: number) => {
    const items = aggregateIngredients(mealPlan, people);
    setShoppingList(items);
  };

  const toggleShoppingItem = (index: number) => {
    setShoppingList(prev => {
      const newList = [...prev];
      if (newList[index]) {
        newList[index] = { ...newList[index], checked: !newList[index].checked };
      }
      return newList;
    });
  };

  const clearShoppingList = () => {
    setShoppingList([]);
  };

  return (
    <AppContext.Provider value={{
      currentMealPlan,
      setCurrentMealPlan,
      shoppingList,
      generateShoppingList,
      toggleShoppingItem,
      clearShoppingList
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

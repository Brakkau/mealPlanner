"use client";

import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { MealPlan, ShoppingItem } from './types';
import { aggregateIngredients, applyShoppingChecks, shoppingItemKey } from './shopping-list';

function checkedKeysFromPlan(plan: MealPlan): string[] {
  return Array.isArray(plan.shoppingChecked)
    ? plan.shoppingChecked.filter((entry): entry is string => typeof entry === "string")
    : [];
}

interface AppContextType {
  currentMealPlan: MealPlan | null;
  setCurrentMealPlan: (plan: MealPlan | null) => void;
  shoppingList: ShoppingItem[];
  generateShoppingList: (mealPlan: MealPlan, people: number) => void;
  toggleShoppingItem: (index: number) => void;
  clearShoppingList: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const savedPlanRef = useRef(false);
  savedPlanRef.current = Boolean(currentMealPlan?.isSaved);

  const generateShoppingList = useCallback((mealPlan: MealPlan, people: number) => {
    const items = applyShoppingChecks(
      aggregateIngredients(mealPlan, people),
      checkedKeysFromPlan(mealPlan)
    );
    setShoppingList(items);
    setCurrentMealPlan(mealPlan);
  }, []);

  const persistChecked = useCallback((items: ShoppingItem[]) => {
    if (!savedPlanRef.current) return;
    const keys = items.filter((item) => item.checked).map((item) => shoppingItemKey(item));
    void fetch("/api/meal-plan/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shoppingChecked: keys })
    }).catch((error) => console.error("Error:", error));
  }, []);

  const handleToggleShoppingItem = useCallback((index: number) => {
    setShoppingList((prev) => {
      if (!prev[index]) return prev;
      const next = prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, checked: !item.checked } : item
      );
      const keys = next.filter((item) => item.checked).map((item) => shoppingItemKey(item));
      queueMicrotask(() => {
        persistChecked(next);
        setCurrentMealPlan((plan) => (plan ? { ...plan, shoppingChecked: keys } : plan));
      });
      return next;
    });
  }, [persistChecked]);

  const clearShoppingList = useCallback(() => {
    setShoppingList([]);
  }, []);

  return (
    <AppContext.Provider value={{
      currentMealPlan,
      setCurrentMealPlan,
      shoppingList,
      generateShoppingList,
      toggleShoppingItem: handleToggleShoppingItem,
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

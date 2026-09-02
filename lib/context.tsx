"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MealPlan, ShoppingItem } from './types';
import { aggregateIngredients } from './shopping-list';

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

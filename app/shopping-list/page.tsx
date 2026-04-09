"use client";

import { useAppContext } from "@/lib/context";
import { ShoppingCart, Check, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: 'bg-green-100 text-green-700',
  Meat: 'bg-red-100 text-red-700',
  Dairy: 'bg-blue-100 text-blue-700',
  Pantry: 'bg-amber-100 text-amber-700',
  Frozen: 'bg-cyan-100 text-cyan-700',
  Other: 'bg-gray-100 text-gray-700'
};

export default function ShoppingListPage() {
  const { shoppingList, toggleShoppingItem, currentMealPlan } = useAppContext();

  const groupedItems = (shoppingList ?? []).reduce((acc, item) => {
    const category = item?.category ?? 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof shoppingList>);

  const categories = Object.keys(groupedItems).sort();
  const totalItems = shoppingList?.length ?? 0;
  const checkedItems = shoppingList?.filter(item => item?.checked)?.length ?? 0;

  if (totalItems === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <div className="card">
          <ShoppingCart className="mx-auto text-gray-300 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Shopping List Empty</h2>
          <p className="text-gray-500 mb-6">
            Generate a meal plan first to create your shopping list.
          </p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <Calendar size={20} />
            Create Meal Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
          <span className="text-sm text-gray-500">
            {checkedItems}/{totalItems} items
          </span>
        </div>
        {currentMealPlan && (
          <p className="text-gray-500 text-sm mt-1">
            For {currentMealPlan.days} days • {currentMealPlan.people} people
          </p>
        )}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category} className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}>
                {category}
              </span>
              <span className="text-sm text-gray-400">
                {groupedItems[category]?.length ?? 0} items
              </span>
            </div>
            <ul className="space-y-2">
              {(groupedItems[category] ?? []).map((item, idx) => {
                const globalIndex = shoppingList?.findIndex(
                  (i) => i?.name === item?.name && i?.unit === item?.unit
                ) ?? -1;
                return (
                  <li key={idx}>
                    <button
                      onClick={() => globalIndex >= 0 && toggleShoppingItem(globalIndex)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        item?.checked
                          ? 'bg-green-50 text-gray-400 line-through'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        item?.checked ? 'bg-green-500 text-white' : 'border-2 border-gray-300'
                      }`}>
                        {item?.checked && <Check size={14} />}
                      </div>
                      <span className="flex-1 text-left">
                        {(item?.quantity ?? 0) % 1 === 0 
                          ? Math.round(item?.quantity ?? 0) 
                          : (item?.quantity ?? 0).toFixed(1)
                        } {item?.unit ?? ''} {item?.name ?? ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/meal-plan"
          className="w-full btn-secondary flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Meal Plan
        </Link>
      </div>
    </div>
  );
}

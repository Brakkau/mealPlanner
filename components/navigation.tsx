"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ShoppingCart, BookOpen, Heart, History, ChefHat } from "lucide-react";
import ChangelogModal from "./changelog-modal";
import TokenUsageBadge from "./token-usage-badge";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/current-plan", icon: ChefHat, label: "Current" },
  { href: "/meal-plan", icon: Calendar, label: "Meal Plan" },
  { href: "/shopping-list", icon: ShoppingCart, label: "Shopping" },
  { href: "/past-plans", icon: History, label: "History" },
  { href: "/recipes", icon: BookOpen, label: "Recipes" },
  { href: "/favourites", icon: Heart, label: "Favourites" }
];

export default function Navigation() {
  const pathname = usePathname();
  const buildVersion = (process.env.NEXT_PUBLIC_APP_VERSION || "dev").trim();
  const runtimeLabel = (process.env.NEXT_PUBLIC_RUNTIME_LABEL || "local").trim();

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="font-semibold text-gray-900 text-lg">Meal Planner</span>
              </Link>
              <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-mono">
                {runtimeLabel} v{buildVersion}
              </span>
              <TokenUsageBadge />
              <ChangelogModal />
            </div>
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith?.(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-green-500 text-white shadow-md"
                        : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-900">Meal Planner</span>
          </Link>
          <span className="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-mono">
            {runtimeLabel} v{buildVersion}
          </span>
          <TokenUsageBadge />
          <ChangelogModal />
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith?.(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[64px] ${
                  isActive
                    ? "bg-green-50 text-green-600"
                    : "text-gray-500"
                }`}
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

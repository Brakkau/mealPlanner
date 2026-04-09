"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { APP_VERSION, changelog, ChangelogEntry } from "@/lib/changelog";

export default function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create portal container on mount
    const portalContainer = document.createElement("div");
    portalContainer.id = "changelog-modal-portal";
    document.body.appendChild(portalContainer);
    portalRef.current = portalContainer;

    return () => {
      if (portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
    };
  }, []);

  useEffect(() => {
    if (!portalRef.current) return;

    if (isOpen) {
      portalRef.current.innerHTML = "";
      const modalRoot = document.createElement("div");
      modalRoot.className = "fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4";
      modalRoot.onclick = () => setIsOpen(false);

      modalRoot.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 class="text-lg font-semibold text-gray-800">What's New</h2>
              <p class="text-sm text-gray-500">Changelog & version history</p>
            </div>
            <button id="close-changelog-modal" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="overflow-y-auto max-h-[60vh] p-4 space-y-6">
            ${changelog.map((entry: ChangelogEntry, index: number) => `
              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="px-2.5 py-1 rounded-full text-sm font-medium ${index === 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}">
                    v${entry.version}
                  </span>
                  <span class="text-sm text-gray-400">${entry.date}</span>
                  ${index === 0 ? '<span class="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Latest</span>' : ''}
                </div>
                <ul class="space-y-2 ml-1">
                  ${entry.changes.map((change: string) => `
                    <li class="flex items-start gap-2 text-sm text-gray-600">
                      <span class="text-green-500 mt-1">•</span>
                      <span>${change}</span>
                    </li>
                  `).join('')}
                </ul>
                ${index < changelog.length - 1 ? '<div class="border-b border-gray-100 mt-4"></div>' : ''}
              </div>
            `).join('')}
          </div>
          <div class="p-4 border-t border-gray-100 bg-gray-50">
            <p class="text-xs text-gray-400 text-center">Meal Planner • Built with ❤️</p>
          </div>
        </div>
      `;

      portalRef.current.appendChild(modalRoot);

      // Add close button listener
      const closeBtn = document.getElementById("close-changelog-modal");
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          setIsOpen(false);
        };
      }

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      portalRef.current.innerHTML = "";
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition-colors group"
    >
      <span>v{APP_VERSION}</span>
      <Sparkles className="w-3 h-3 group-hover:text-green-500" />
      <span className="hidden sm:inline text-gray-400">What&apos;s New</span>
    </button>
  );
}

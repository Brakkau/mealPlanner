"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { APP_VERSION, changelog } from "@/lib/changelog";

export default function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const modal =
    isOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
            role="presentation"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="changelog-title"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <h2 id="changelog-title" className="text-lg font-semibold text-gray-800">
                    What&apos;s New
                  </h2>
                  <p className="text-sm text-gray-500">Changelog &amp; version history</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close changelog"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh] p-4 space-y-6">
                {changelog.map((entry, index) => (
                  <div key={entry.version}>
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                          index === 0
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        v{entry.version}
                      </span>
                      <span className="text-sm text-gray-400">{entry.date}</span>
                      {index === 0 ? (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Latest
                        </span>
                      ) : null}
                    </div>
                    <ul className="space-y-2 ml-1">
                      {entry.changes.map((change) => (
                        <li
                          key={change}
                          className="flex items-start gap-2 text-sm text-gray-600"
                        >
                          <span className="text-green-500 mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                    {index < changelog.length - 1 ? (
                      <div className="border-b border-gray-100 mt-4" />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  Meal Planner • v{APP_VERSION}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 transition-colors group"
      >
        <span>v{APP_VERSION}</span>
        <Sparkles className="w-3 h-3 group-hover:text-green-500" />
        <span className="hidden sm:inline text-gray-400">What&apos;s New</span>
      </button>
      {modal}
    </>
  );
}

"use client";

import { useState } from "react";
import { APP_PRESETS, AppPreset } from "@/lib/window/presets";

interface AppLauncherProps {
  onLaunchApp: (app: AppPreset) => void;
  disabled?: boolean;
}

export default function AppLauncher({ onLaunchApp, disabled }: AppLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(APP_PRESETS.map((app) => app.category))];

  const filteredApps = selectedCategory
    ? APP_PRESETS.filter((app) => app.category === selectedCategory)
    : APP_PRESETS;

  return (
    <div className="flex items-center gap-2">
      {/* App launcher button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
            ${disabled 
              ? "opacity-50 cursor-not-allowed border-border bg-bg-secondary" 
              : "border-accent bg-accent/10 text-accent hover:bg-accent/20"
            }
          `}
        >
          <span className="text-lg">➕</span>
          <span className="text-sm font-medium">Add Window</span>
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-bg-secondary border border-border rounded-lg shadow-xl z-50">
            {/* Category filter */}
            <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                  selectedCategory === null
                    ? "bg-accent text-white"
                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap capitalize ${
                    selectedCategory === cat
                      ? "bg-accent text-white"
                      : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* App grid */}
            <div className="p-2 grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
              {filteredApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    onLaunchApp(app);
                    setIsOpen(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded hover:bg-bg-tertiary transition-colors"
                >
                  <span className="text-xl">{app.icon}</span>
                  <span className="text-[10px] text-text-secondary truncate w-full text-center">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick launch buttons for common apps */}
      <div className="flex items-center gap-1 ml-2">
        {APP_PRESETS.slice(0, 4).map((app) => (
          <button
            key={app.id}
            onClick={() => {
              onLaunchApp(app);
              setIsOpen(false);
            }}
            disabled={disabled}
            title={app.name}
            className="w-8 h-8 rounded bg-bg-tertiary hover:bg-border flex items-center justify-center text-sm transition-colors disabled:opacity-50"
          >
            {app.icon}
          </button>
        ))}
        {APP_PRESETS.length > 4 && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 rounded bg-bg-tertiary hover:bg-border flex items-center justify-center text-xs text-text-tertiary"
          >
            ...
          </button>
        )}
      </div>
    </div>
  );
}

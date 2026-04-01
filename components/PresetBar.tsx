"use client";

import { Monitor } from "@/lib/monitors/types";
import { PRESET_MONITORS } from "@/lib/monitors/presets";

interface PresetBarProps {
  selectedMonitors: Monitor[];
  onToggle: (m: Monitor) => void;
  maxSelect?: number;
}

export default function PresetBar({
  selectedMonitors,
  onToggle,
  maxSelect = 6,
}: PresetBarProps) {
  const selectedIds = new Set(selectedMonitors.map((m) => m.id));
  const isFull = selectedMonitors.length >= maxSelect;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Popularne monitory
        </h2>
        <span className="text-xs text-text-tertiary">
          ({selectedMonitors.length}/{maxSelect} wybrane)
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {PRESET_MONITORS.map((monitor) => {
          const isSelected = selectedIds.has(monitor.id);
          const disabled = !isSelected && isFull;

          return (
            <button
              key={monitor.id}
              onClick={() => !disabled && onToggle(monitor)}
              disabled={disabled}
              className={`
                flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl border
                transition-all duration-200 min-w-[110px]
                ${isSelected
                  ? "border-accent bg-bg-tertiary text-text-primary"
                  : disabled
                  ? "border-border bg-bg-secondary text-text-tertiary opacity-40 cursor-not-allowed"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-text-tertiary hover:text-text-primary"
                }
              `}
            >
              {/* Mini monitor icon */}
              <div className="w-10 h-7 bg-monitor-bezel rounded-md flex items-center justify-center relative">
                <div className="w-8 h-5 bg-gradient-to-br from-gray-700 to-gray-900 rounded-sm" />
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                    ✓
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs font-medium leading-tight">
                  {monitor.diagonal}&quot; {monitor.widthPx >= 3840 ? "4K" : monitor.widthPx >= 2560 ? "QHD" : "FHD"}
                </p>
                <p className="text-[10px] text-text-tertiary">
                  {monitor.widthPx >= 3840 ? "4K" : monitor.widthPx >= 2560 ? "QHD" : "FHD"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

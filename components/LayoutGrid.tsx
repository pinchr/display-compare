"use client";

import { Monitor } from "@/lib/monitors/types";
import { getWindowSize, calcWidthCm, calcHeightCm } from "@/lib/monitors/calculations";
import { useState } from "react";

interface LayoutGridProps {
  monitors: Monitor[];
  selectedLayout: 2 | 3 | 4 | 6;
  onLayoutChange: (l: 2 | 3 | 4 | 6) => void;
}

const LAYOUTS: { label: string; value: 2 | 3 | 4 | 6 }[] = [
  { label: "2 okna", value: 2 },
  { label: "3 okna", value: 3 },
  { label: "4 okna", value: 4 },
  { label: "6 okien", value: 6 },
];

export default function LayoutGrid({ monitors, selectedLayout, onLayoutChange }: LayoutGridProps) {
  const [hoveredMonitor, setHoveredMonitor] = useState<string | null>(null);
  const [hoveredWindow, setHoveredWindow] = useState<{ mid: string; idx: number } | null>(null);

  if (monitors.length === 0) {
    return null;
  }

  const getGridClass = (windows: number) => {
    switch (windows) {
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-2";
      case 6:
        return "grid-cols-3";
      default:
        return "grid-cols-2";
    }
  };

  const getRowCount = (windows: number) => {
    return windows === 6 ? 2 : 1;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Layout Preview
        </h2>
        <div className="flex gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              onClick={() => onLayoutChange(l.value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${selectedLayout === l.value
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                }
              `}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-6 pb-2" style={{ minWidth: 0 }}>
          {monitors.map((monitor) => {
            const win = getWindowSize(monitor, selectedLayout);
            const widthCm = calcWidthCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
            const heightCm = calcHeightCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
            const windowWidthCm = widthCm / (selectedLayout === 6 ? 3 : selectedLayout === 4 ? 2 : selectedLayout);
            const windowHeightCm = heightCm / getRowCount(selectedLayout);
            const isHovered = hoveredMonitor === monitor.id;
            const rows = getRowCount(selectedLayout);
            const cols = selectedLayout / rows;

            return (
              <div
                key={monitor.id}
                className="flex-shrink-0"
                onMouseEnter={() => setHoveredMonitor(monitor.id)}
                onMouseLeave={() => setHoveredMonitor(null)}
              >
                {/* Monitor label */}
                <p className="text-xs font-medium text-text-secondary mb-2 truncate max-w-[200px]">
                  {monitor.diagonal}&quot; {monitor.name}
                </p>

                {/* Layout grid */}
                <div
                  className={`
                    grid ${getGridClass(selectedLayout)} gap-1 p-2 rounded-xl border
                    ${isHovered ? "border-accent bg-bg-tertiary" : "border-border bg-bg-secondary"}
                    transition-all
                  `}
                  style={{
                    width: `${Math.min(cols * 80, 240)}px`,
                    height: `${Math.min(rows * 60, 140)}px`,
                  }}
                >
                  {Array.from({ length: selectedLayout }).map((_, idx) => {
                    const isWindowHovered =
                      hoveredWindow?.mid === monitor.id && hoveredWindow?.idx === idx;

                    return (
                      <div
                        key={idx}
                        className={`
                          rounded-md border flex flex-col items-center justify-center
                          transition-all cursor-pointer
                          ${isWindowHovered
                            ? "border-accent bg-accent/20 text-accent"
                            : "border-text-tertiary/30 bg-bg-primary/50 hover:border-text-tertiary"
                          }
                        `}
                        onMouseEnter={() => setHoveredWindow({ mid: monitor.id, idx })}
                        onMouseLeave={() => setHoveredWindow(null)}
                      >
                        <span className="text-[8px] font-mono opacity-70">
                          {win.widthPx}px
                        </span>
                        <span className="text-[7px] opacity-40">
                          {windowWidthCm.toFixed(1)}cm
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Window size summary */}
                <div className="mt-2 text-[10px] text-text-tertiary text-center">
                  <span className="font-mono">
                    {win.widthPx} × {win.heightPx} px
                  </span>
                  <span className="mx-1">|</span>
                  <span>
                    {windowWidthCm.toFixed(1)} × {windowHeightCm.toFixed(1)} cm
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison summary */}
      {monitors.length >= 2 && (
        <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-border">
          <p className="text-xs text-text-tertiary mb-2">Porównanie rozmiaru okna:</p>
          <div className="space-y-1">
            {monitors.map((m) => {
              const win = getWindowSize(m, selectedLayout);
              const wCm = (calcWidthCm(m.diagonal, m.widthPx, m.heightPx) / (selectedLayout === 6 ? 3 : selectedLayout === 4 ? 2 : selectedLayout));
              const allCm = monitors.map((mon) => {
                const w = getWindowSize(mon, selectedLayout);
                return w.widthPx * w.heightPx;
              });
              const maxPx = Math.max(...allCm);
              const minPx = Math.min(...allCm);
              const ratio = maxPx / minPx;

              return (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary truncate w-24">
                    {m.diagonal}&quot; {m.name.split(" ")[0]}
                  </span>
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{
                        width: `${((win.widthPx * win.heightPx) / maxPx) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-primary w-16 text-right">
                    {win.widthPx}×{win.heightPx}
                  </span>
                  {ratio > 1.1 && (
                    <span className="text-[10px] text-success">
                      {(ratio - 1).toFixed(0)}% większy
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

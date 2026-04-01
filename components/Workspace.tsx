"use client";

import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm, calcPPI, formatResolution } from "@/lib/monitors/calculations";
import { useState } from "react";

interface WorkspaceProps {
  monitors: Monitor[];
  onRemove: (id: string) => void;
  onHighlight: (id: string | null) => void;
  highlightedId: string | null;
}

export default function Workspace({
  monitors,
  onRemove,
  onHighlight,
  highlightedId,
}: WorkspaceProps) {
  const [selectedPreset, setSelectedPreset] = useState<Monitor | null>(null);

  if (monitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-16 bg-bg-tertiary rounded-xl mb-4 flex items-center justify-center">
          <span className="text-4xl opacity-30">🖥️</span>
        </div>
        <h3 className="text-lg font-semibold text-text-secondary mb-1">
          Wybierz monitory do porównania
        </h3>
        <p className="text-sm text-text-tertiary max-w-xs">
          Kliknij powyżej na popularne monitory lub dodaj własne parametry
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Workspace ({monitors.length} monitorów)
        </h2>
        <button
          onClick={() => {
            monitors.forEach((m) => onRemove(m.id));
          }}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Wyczyść wszystko
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {monitors.map((monitor, idx) => {
          const widthCm = calcWidthCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
          const heightCm = calcHeightCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
          const ppi = calcPPI(monitor.widthPx, monitor.heightPx, monitor.diagonal);
          const isHighlighted = highlightedId === monitor.id;

          return (
            <div
              key={monitor.id}
              className={`
                relative rounded-xl border transition-all duration-200
                ${isHighlighted
                  ? "border-accent bg-bg-tertiary shadow-[0_0_24px_rgba(245,158,11,0.25)]"
                  : "border-border bg-bg-secondary hover:border-text-tertiary"
                }
              `}
              onMouseEnter={() => onHighlight(monitor.id)}
              onMouseLeave={() => onHighlight(null)}
            >
              {/* Remove button */}
              <button
                onClick={() => onRemove(monitor.id)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold
                           opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center
                           hover:bg-red-600 z-10"
              >
                ✕
              </button>

              {/* Monitor number badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold">
                #{idx + 1}
              </div>

              {/* Monitor visual — proportions preserved */}
              <div className="p-4">
                <div className="flex justify-center mb-4">
                  {/* Scale monitor to fit nicely while keeping aspect ratio */}
                  <div
                    className="bg-monitor-bezel rounded-lg relative"
                    style={{
                      // Fit within ~180px wide
                      width: `${Math.min(180, widthCm * 8)}px`,
                      height: `${Math.min(120, heightCm * 8)}px`,
                      boxShadow: isHighlighted
                        ? "0 0 20px 4px rgba(99,102,241,0.4), inset 0 0 30px rgba(99,102,241,0.1)"
                        : "0 4px 20px rgba(0,0,0,0.5), inset 0 0 30px rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="absolute inset-1 rounded-sm bg-gradient-to-br from-gray-800 to-gray-950" />
                    {/* Stand */}
                    <div
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                      style={{
                        width: `${Math.min(180, widthCm * 8) * 0.25}px`,
                        height: `${Math.min(120, heightCm * 8) * 0.12}px`,
                        background: "#1a1a1a",
                        clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
                      }}
                    />
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-text-primary text-sm truncate" title={monitor.name}>
                    {monitor.name}
                  </h3>
                  <p className="text-text-tertiary text-xs">{monitor.brand}</p>

                  <div className="mt-3 space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Rozdzielczość</span>
                      <span className="text-text-primary font-mono">{formatResolution(monitor.widthPx, monitor.heightPx)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Przekątna</span>
                      <span className="text-text-primary">{monitor.diagonal}&quot;</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Wymiary</span>
                      <span className="text-text-primary font-mono">{widthCm.toFixed(1)} × {heightCm.toFixed(1)} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">PPI</span>
                      <span className="text-text-primary font-mono">{ppi.toFixed(0)}</span>
                    </div>
                    {monitor.panelType && (
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Matryca</span>
                        <span className="text-text-primary">{monitor.panelType}</span>
                      </div>
                    )}
                    {/* Refresh rate removed — not visually representable */}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

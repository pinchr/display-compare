"use client";

import { Monitor } from "@/lib/monitors/types";
import { calcPPI, calcWidthCm, calcHeightCm, formatResolution } from "@/lib/monitors/calculations";

interface MonitorCardProps {
  monitor: Monitor;
  selected?: boolean;
  onSelect?: (m: Monitor) => void;
  onRemove?: (id: string) => void;
  showRemove?: boolean;
  compact?: boolean;
}

export default function MonitorCard({
  monitor,
  selected = false,
  onSelect,
  onRemove,
  showRemove = false,
  compact = false,
}: MonitorCardProps) {
  const widthCm = calcWidthCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
  const heightCm = calcHeightCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
  const ppi = calcPPI(monitor.widthPx, monitor.heightPx, monitor.diagonal);

  const aspectRatio = monitor.widthPx / monitor.heightPx;
  const maxW = compact ? 120 : 200;
  const maxH = maxW / aspectRatio;

  return (
    <div
      className={`
        relative group rounded-xl border transition-all duration-200 cursor-pointer
        ${selected
          ? "border-accent bg-bg-tertiary shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          : "border-border bg-bg-secondary hover:border-text-tertiary hover:bg-bg-tertiary"
        }
        ${compact ? "p-3" : "p-4"}
      `}
      onClick={() => onSelect?.(monitor)}
    >
      {/* Remove button */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(monitor.id);
          }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold
                     opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center
                     hover:bg-red-600 z-10"
        >
          ✕
        </button>
      )}

      {/* Monitor preview (scaled rectangle) */}
      <div className="flex justify-center mb-3">
        <div
          className="bg-monitor-bezel rounded-lg relative"
          style={{
            width: `${maxW}px`,
            height: `${maxH}px`,
            boxShadow: selected
              ? "0 0 16px 2px rgba(99,102,241,0.5), inset 0 0 20px rgba(255,255,255,0.05)"
              : "0 4px 12px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.03)",
          }}
        >
          {/* Screen inner glow */}
          <div
            className="absolute inset-1 rounded-sm"
            style={{
              background: selected
                ? "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(30,30,50,0.9) 100%)"
                : "linear-gradient(135deg, rgba(50,50,80,0.9) 0%, rgba(20,20,35,0.95) 100%)",
            }}
          />
          {/* Stand hint */}
          {!compact && (
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2"
              style={{
                width: `${maxW * 0.3}px`,
                height: `${maxH * 0.15}px`,
                background: "#1a1a1a",
                clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
              }}
            />
          )}
        </div>
      </div>

      {/* Info */}
      <div className={compact ? "text-xs" : "text-sm"}>
        <p className="font-semibold text-text-primary truncate" title={monitor.name}>
          {monitor.name}
        </p>
        {!compact && (
          <p className="text-text-tertiary text-xs mt-0.5">
            {monitor.brand}
          </p>
        )}
        <div className={`mt-2 space-y-0.5 ${compact ? "text-xs" : "text-xs"}`}>
          <p className="text-text-secondary">
            {formatResolution(monitor.widthPx, monitor.heightPx)}
          </p>
          <p className="text-text-tertiary">
            {widthCm.toFixed(1)} × {heightCm.toFixed(1)} cm • {ppi.toFixed(0)} DPI
          </p>
          {!compact && monitor.panelType && (
            <p className="text-text-tertiary">{monitor.panelType}</p>
          )}
          {!compact && monitor.refreshRate && (
            <p className="text-text-tertiary">{monitor.refreshRate}Hz</p>
          )}
          {!compact && monitor.price !== undefined && monitor.price > 0 && (
            <p className="text-accent font-medium mt-1">${monitor.price}</p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm, OVERLAY_COLORS } from "@/lib/monitors/calculations";
import { useState, useRef, useEffect } from "react";

interface OverlayCanvasProps {
  monitors: Monitor[];
}

export default function OverlayCanvas({ monitors }: OverlayCanvasProps) {
  const [opacity, setOpacity] = useState(70);
  const [visibleMonitors, setVisibleMonitors] = useState<Set<string>>(new Set(monitors.map((m) => m.id)));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState<"real" | "normalized">("normalized");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || monitors.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find max dimensions for normalization
    const maxWidthCm = Math.max(...monitors.map((m) => calcWidthCm(m.diagonal, m.widthPx, m.heightPx)));
    const maxHeightCm = Math.max(...monitors.map((m) => calcHeightCm(m.diagonal, m.widthPx, m.heightPx)));
    const maxDim = Math.max(maxWidthCm, maxHeightCm);
    const scaleFactor = 300 / maxDim; // canvas is 320x320ish

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const offsetX = (canvasW - maxDim * scaleFactor) / 2;
    const offsetY = (canvasH - maxDim * scaleFactor) / 2;

    // Draw each visible monitor
    monitors.forEach((monitor, idx) => {
      if (!visibleMonitors.has(monitor.id)) return;

      const widthCm = calcWidthCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
      const heightCm = calcHeightCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
      const color = OVERLAY_COLORS[idx % OVERLAY_COLORS.length];

      const pixelW = scale === "real"
        ? (monitor.widthPx / 1920) * (maxDim * scaleFactor)
        : widthCm * scaleFactor;
      const pixelH = scale === "real"
        ? (monitor.heightPx / 1080) * (maxDim * scaleFactor)
        : heightCm * scaleFactor;

      const x = offsetX + (scale === "real"
        ? (monitor.widthPx - 1920) * -0.05 * scaleFactor
        : 0);
      const y = offsetY + (scale === "real"
        ? (monitor.heightPx - 1080) * -0.05 * scaleFactor
        : 0);

      // Outline
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = opacity / 100;
      ctx.strokeRect(x, y, pixelW, pixelH);

      // Label
      ctx.fillStyle = color;
      ctx.font = "bold 9px Inter, sans-serif";
      ctx.globalAlpha = 1;
      ctx.fillText(
        `${monitor.diagonal}" ${monitor.widthPx}×${monitor.heightPx}`,
        x + 2,
        y + 12
      );

      // Resolution
      ctx.font = "8px Inter, sans-serif";
      ctx.globalAlpha = 0.7;
      ctx.fillText(
        `${widthCm.toFixed(1)}×${heightCm.toFixed(1)} cm`,
        x + 2,
        y + 22
      );
      ctx.globalAlpha = 1;
    });
  }, [monitors, opacity, visibleMonitors, scale]);

  const toggleMonitor = (id: string) => {
    const next = new Set(visibleMonitors);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id);
    } else {
      next.add(id);
    }
    setVisibleMonitors(next);
  };

  if (monitors.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Overlay Comparison
        </h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Opacity slider */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-tertiary">Opacity</label>
          <input
            type="range"
            min="10"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-24 accent-accent"
          />
          <span className="text-xs text-text-secondary w-8">{opacity}%</span>
        </div>

        {/* Scale toggle */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-tertiary">Scale</label>
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setScale("normalized")}
              className={`px-2 py-1 text-xs transition-colors ${
                scale === "normalized" ? "bg-accent text-black font-medium" : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              1:1 cm
            </button>
            <button
              onClick={() => setScale("real")}
              className={`px-2 py-1 text-xs transition-colors ${
                scale === "real" ? "bg-accent text-black font-medium" : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              Real px
            </button>
          </div>
        </div>

        {/* Monitor visibility toggles */}
        <div className="flex gap-2 ml-auto">
          {monitors.map((m, idx) => {
            const isVisible = visibleMonitors.has(m.id);
            const color = OVERLAY_COLORS[idx % OVERLAY_COLORS.length];

            return (
              <button
                key={m.id}
                onClick={() => toggleMonitor(m.id)}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all
                  ${isVisible
                    ? "border-current"
                    : "border-border bg-bg-secondary text-text-tertiary"
                  }
                `}
                style={isVisible ? { color, borderColor: color } : {}}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: isVisible ? color : "#64748b" }}
                />
                {m.diagonal}&quot;
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full max-w-[320px] mx-auto"
        />
        <div className="absolute bottom-2 right-2 text-[10px] text-text-tertiary">
          (nałożenie w skali)
        </div>
      </div>
    </div>
  );
}

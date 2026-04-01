"use client";

import { useState, useRef, PointerEvent, useCallback } from "react";
import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm, calcPPI } from "@/lib/monitors/calculations";
import { MOCKUPS, CATEGORIES, Mockup, AppWindow } from "@/lib/mockups/types";

// Reference resolution for mockup window sizes
const REF_W = 1920;
const REF_H = 1080;
// Scale mockup windows so largest window fits nicely in preview
const SCALE = 0.42;

interface PlacedWindow {
  instanceId: string;
  app: AppWindow;
  monitorId: string; // which monitor it's on
  x: number;        // left position in px (on the scaled preview)
  y: number;        // top position in px
}

interface WorkspaceSimulatorProps {
  monitors: Monitor[]; // max 3
}

export default function WorkspaceSimulator({ monitors }: WorkspaceSimulatorProps) {
  const displayMonitors = monitors.slice(0, 3);
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null);
  const [placedWindows, setPlacedWindows] = useState<PlacedWindow[]>([]);
  const [dragging, setDragging] = useState<PlacedWindow | null>(null);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, wx: 0, wy: 0 });
  const monitorRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const getScaledSize = (w: AppWindow) => ({
    w: Math.round(w.widthPx * SCALE),
    h: Math.round(w.heightPx * SCALE),
  });

  const getMonitorPxSize = (m: Monitor) => ({
    w: Math.round(calcWidthCm(m.diagonal, m.widthPx, m.heightPx) * 37.8), // cm→px at ~96dpi
    h: Math.round(calcHeightCm(m.diagonal, m.widthPx, m.heightPx) * 37.8),
  });

  // Add mockup windows placed in a cascade (offset each slightly)
  const addMockupToMonitor = useCallback((mockup: Mockup, monitorId: string) => {
    const existing = placedWindows.filter((pw) => pw.monitorId === monitorId);
    const offsetX = existing.length * 30;
    const offsetY = existing.length * 20;

    const newWindows: PlacedWindow[] = mockup.windows.map((app) => ({
      instanceId: `${app.id}-${Date.now()}-${Math.random()}`,
      app,
      monitorId,
      x: 20 + offsetX,
      y: 20 + offsetY,
    }));
    setPlacedWindows((prev) => [...prev, ...newWindows]);
  }, [placedWindows]);

  const removeWindow = (instanceId: string) =>
    setPlacedWindows((prev) => prev.filter((w) => w.instanceId !== instanceId));

  const clearMonitor = (monitorId: string) =>
    setPlacedWindows((prev) => prev.filter((w) => w.monitorId !== monitorId));

  // ── Drag handling ────────────────────────────────────
  const handleWindowPointerDown = (e: PointerEvent, pw: PlacedWindow) => {
    e.stopPropagation();
    setDragging(pw);
    setDragStart({ mx: e.clientX, my: e.clientY, wx: pw.x, wy: pw.y });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.mx;
    const dy = e.clientY - dragStart.my;

    // Check if cursor is over a different monitor
    for (const [monitorId, el] of monitorRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        // Update position and monitor
        setPlacedWindows((prev) =>
          prev.map((w) =>
            w.instanceId === dragging.instanceId
              ? { ...w, monitorId, x: dragStart.wx + dx, y: dragStart.wy + dy }
              : w
          )
        );
        return;
      }
    }

    // Still on same monitor — just update position
    setPlacedWindows((prev) =>
      prev.map((w) =>
        w.instanceId === dragging.instanceId
          ? { ...w, x: dragStart.wx + dx, y: dragStart.wy + dy }
          : w
      )
    );
  }, [dragging, dragStart]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Code preview renderer ─────────────────────────────
  const CodePreview = ({ lines, color }: { lines: string[]; color: string }) => (
    <div
      className="font-mono text-[7px] leading-tight p-1 overflow-hidden rounded-b"
      style={{ background: `${color}22`, color: `${color}DD` }}
    >
      {lines.map((line, i) => (
        <div key={i} className="whitespace-nowrap">
          {line}
        </div>
      ))}
    </div>
  );

  // ── Image placeholder ─────────────────────────────────
  const ImagePreview = ({ color }: { color: string }) => (
    <div className="flex flex-col items-center justify-center h-full gap-0.5 p-1">
      <div
        className="w-full rounded flex items-center justify-center"
        style={{
          height: "60%",
          background: `linear-gradient(135deg, ${color}44, ${color}22)`,
          border: `1px solid ${color}55`,
        }}
      >
        <span className="text-[10px] opacity-40">🖼️ image</span>
      </div>
      <div className="w-full h-[2px]" style={{ background: `${color}33` }} />
      <div className="w-[60%] h-[1px]" style={{ background: `${color}22` }} />
    </div>
  );

  // ── Window chrome ─────────────────────────────────────
  const renderWindow = (pw: PlacedWindow) => {
    const size = getScaledSize(pw.app);
    const isDraggingThis = dragging?.instanceId === pw.instanceId;
    const { w: monW, h: monH } = getMonitorPxSize(
      displayMonitors.find((m) => m.id === pw.monitorId) || displayMonitors[0]
    );

    // Visual overflow indicator: is the window clipping outside?
    const clippedX = pw.x + size.w > monW - 10;
    const clippedY = pw.y + size.h > monH - 10;

    return (
      <div
        key={pw.instanceId}
        className={`
          absolute rounded-lg overflow-hidden cursor-grab select-none
          transition-shadow duration-150
          ${isDraggingThis ? "z-50 shadow-2xl ring-2 ring-white/30" : "z-10 shadow-lg"}
        `}
        style={{
          left: `${pw.x}px`,
          top: `${pw.y}px`,
          width: `${size.w}px`,
          height: `${size.h}px`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${pw.app.color}55`,
          background: `${pw.app.color}18`,
        }}
        onPointerDown={(e) => handleWindowPointerDown(e, pw)}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-medium text-white/90 cursor-grab"
          style={{ background: pw.app.color, minHeight: "16px" }}
        >
          <span>{pw.app.icon}</span>
          <span className="truncate font-semibold">{pw.app.label}</span>
          <span className="ml-auto text-white/50 font-mono text-[7px]">
            {pw.app.widthPx}×{pw.app.heightPx}px
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeWindow(pw.instanceId); }}
            className="ml-1 text-white/60 hover:text-white text-[10px] leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Window content */}
        <div className="overflow-hidden" style={{ height: `calc(${size.h}px - 16px)` }}>
          {pw.app.previewLines ? (
            <CodePreview lines={pw.app.previewLines} color={pw.app.color} />
          ) : pw.app.previewImage ? (
            <ImagePreview color={pw.app.color} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <span className="text-sm">{pw.app.icon}</span>
            </div>
          )}
        </div>

        {/* Overflow hint */}
        {(clippedX || clippedY) && (
          <div className="absolute bottom-0.5 right-0.5 text-[6px] bg-red-500/80 text-white px-0.5 rounded leading-none">
            overflow
          </div>
        )}
      </div>
    );
  };

  if (displayMonitors.length < 2) {
    return (
      <div className="text-center py-12 text-text-tertiary text-sm">
        Wybierz 2-3 monitory aby zobaczyć workspace simulator
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
              Workspace Simulator
            </h3>
            <p className="text-[10px] text-text-tertiary mt-0.5">
              Okna mają STAŁY rozmiar px — przeciągnij między monitorami, żeby zobaczyć różnicę
            </p>
          </div>
          <span className="text-[9px] text-text-tertiary bg-bg-tertiary px-2 py-1 rounded-full">
            Max 3 monitory
          </span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                const first = MOCKUPS.find((m) => m.category === cat);
                if (first) setSelectedMockup(first);
              }}
              className="px-2 py-1 text-[10px] rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Mockup cards */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MOCKUPS.map((mockup) => (
            <button
              key={mockup.id}
              onClick={() => setSelectedMockup(mockup)}
              className={`
                flex-shrink-0 px-3 py-2 rounded-xl border text-[11px] text-left transition-all
                ${selectedMockup?.id === mockup.id
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-text-tertiary"
                }
              `}
            >
              <span className="mr-1.5">{mockup.icon}</span>
              <span className="font-medium">{mockup.name}</span>
              <span className="ml-1.5 text-text-tertiary">({mockup.windows.length} okien)</span>
            </button>
          ))}
        </div>

        {/* Add to monitor */}
        {selectedMockup && (
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-[10px] text-text-tertiary">Dodaj na:</span>
            {displayMonitors.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => addMockupToMonitor(selectedMockup, m.id)}
                className="px-3 py-1.5 text-[11px] rounded-lg bg-accent text-black hover:brightness-110 transition-all font-medium"
              >
                Monitor {idx + 1} ({m.diagonal}&quot; {m.widthPx}×{m.heightPx})
              </button>
            ))}
            <button
              onClick={() => displayMonitors.forEach((m) => addMockupToMonitor(selectedMockup, m.id))}
              className="px-3 py-1.5 text-[11px] rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors font-medium"
            >
              Wszystkie 3
            </button>
            <span className="text-[9px] text-text-tertiary ml-1">
              (okna w tym samym rozmiarze px na każdym monitorze)
            </span>
          </div>
        )}
      </div>

      {/* Monitor drop zones */}
      <div
        className="flex gap-4 items-start overflow-x-auto pb-2"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {displayMonitors.map((monitor, idx) => {
          const { w: monW, h: monH } = getMonitorPxSize(monitor);
          // Scale monitor to fit nicely in UI (cap at reasonable height)
          const maxH = 300;
          const monitorScale = monH > maxH ? maxH / monH : 1;
          const displayW = Math.round(monW * monitorScale);
          const displayH = Math.round(monH * monitorScale);

          return (
            <div
              key={monitor.id}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              {/* Monitor label */}
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-accent">Monitor {idx + 1}</span>
                  <span className="text-[9px] font-mono text-text-tertiary bg-bg-elevated px-1.5 py-0.5 rounded">
                    {monitor.diagonal}&quot; {monitor.widthPx}×{monitor.heightPx}
                  </span>
                </div>
                <p className="text-[9px] text-text-tertiary mt-0.5">
                  {calcWidthCm(monitor.diagonal, monitor.widthPx, monitor.heightPx).toFixed(1)} ×{" "}
                  {calcHeightCm(monitor.diagonal, monitor.widthPx, monitor.heightPx).toFixed(1)} cm •{" "}
                  {calcPPI(monitor.widthPx, monitor.heightPx, monitor.diagonal).toFixed(0)} PPI
                </p>
                <p className="text-[8px] text-text-tertiary/60 mt-0.5">
                  okno {displayMonitors[0].widthPx}×{displayMonitors[0].heightPx}px =
                  <span className="text-text-tertiary">
                    {" "}{Math.round(displayMonitors[0].widthPx / monitor.widthPx * 100)}% szerokości
                  </span>
                </p>
              </div>

              {/* Drop zone */}
              <div
                ref={(el) => { if (el) monitorRefs.current.set(monitor.id, el); }}
                className={`
                  relative rounded-xl border-2 overflow-hidden
                  transition-colors duration-150
                  ${dragging ? "border-accent bg-accent/5" : "border-border bg-bg-secondary"}
                `}
                style={{ width: displayW, height: displayH, minWidth: 120 }}
              >
                {/* Monitor bezel inset */}
                <div className="absolute inset-0.5 rounded-lg bg-bg-tertiary pointer-events-none" />

                {/* Placed windows */}
                {placedWindows
                  .filter((pw) => pw.monitorId === monitor.id)
                  .map((pw) => renderWindow(pw))}

                {/* Empty state */}
                {placedWindows.filter((pw) => pw.monitorId === monitor.id).length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[9px] text-text-tertiary text-center leading-relaxed px-2">
                      Przeciągnij okno tutaj
                    </p>
                  </div>
                )}
              </div>

              {/* Clear */}
              {placedWindows.filter((pw) => pw.monitorId === monitor.id).length > 0 && (
                <button
                  onClick={() => clearMonitor(monitor.id)}
                  className="text-[9px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Wyczyść
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Size comparison table */}
      {placedWindows.length > 0 && (
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 border-b border-border">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Porównanie rozmiarów okien
            </h4>
            <p className="text-[9px] text-text-tertiary">
              To samo okno {displayMonitors[0].widthPx}×{displayMonitors[0].heightPx}px zajmuje różną część każdego monitora
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border bg-bg-tertiary">
                  <th className="text-left py-1.5 px-3 text-text-tertiary font-medium">Okno</th>
                  {displayMonitors.map((m, idx) => (
                    <th key={m.id} className="text-center py-1.5 px-2 text-text-tertiary font-medium whitespace-nowrap">
                      Monitor {idx + 1} — {m.diagonal}&quot; {m.widthPx}×{m.heightPx}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Map(placedWindows.map((pw) => [pw.app.id, pw.app])).values()].map((app) => {
                  const refMonitor = displayMonitors[0];
                  const pct = (app.widthPx / refMonitor.widthPx * 100).toFixed(1);

                  return (
                    <tr key={app.id} className="border-b border-border/50 hover:bg-bg-tertiary/30">
                      <td className="py-1.5 px-3 text-text-secondary">
                        <span className="mr-1">{app.icon}</span>
                        {app.label}
                        <span className="ml-1 text-text-tertiary font-mono text-[9px]">
                          {app.widthPx}×{app.heightPx}px
                        </span>
                      </td>
                      {displayMonitors.map((m) => {
                        const pctThis = (app.widthPx / m.widthPx * 100).toFixed(1);
                        const isRef = m.id === refMonitor.id;
                        const isSmaller = parseFloat(pctThis) < parseFloat(pct);

                        return (
                          <td key={m.id} className="py-1.5 px-2 text-center">
                            <span className={`font-mono ${isSmaller ? "text-warning" : "text-success"}`}>
                              {pctThis}%
                            </span>
                            <div className="mt-0.5 h-1 bg-bg-tertiary rounded-full overflow-hidden mx-auto w-16">
                              <div
                                className={`h-full rounded-full ${isSmaller ? "bg-warning" : "bg-success"}`}
                                style={{ width: `${Math.min(parseFloat(pctThis), 100)}%` }}
                              />
                            </div>
                            {isSmaller && (
                              <span className="text-[8px] text-text-tertiary">-{(parseFloat(pct) - parseFloat(pctThis)).toFixed(1)}%</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

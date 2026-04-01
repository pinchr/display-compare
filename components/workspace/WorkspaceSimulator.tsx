"use client";

import { useState, useRef, PointerEvent, useCallback, useMemo, useEffect } from "react";
import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm, calcPPI } from "@/lib/monitors/calculations";
import { MOCKUPS, CATEGORIES, Mockup, AppWindow } from "@/lib/mockups/types";

// Reference for window pixel sizes (absolute — don't change between monitors)
const REF_W = 1920;
const REF_H = 1080;

interface PlacedWindow {
  instanceId: string;
  app: AppWindow;
  monitorId: string; // which monitor the window is logically on
  // Absolute canvas coordinates (win.x = canvas left, win.y = canvas top)
  x: number;
  y: number;
}

interface MonitorLayout {
  monitor: Monitor;
  x: number;    // canvas position px
  y: number;
  scale: number; // visual scale factor (0-1)
}

// Canvas uses fixed pixel dimensions for layout
// MONITOR scale: cm → px at 96dpi (so 42" = ~93cm → ~355px at this scale)
// WINDOW scale: pixel resolution × 0.12 (windows are smaller visual indicators)
const CANVAS_W = 1200;
const CANVAS_H = 700;
const MONITOR_PX_PER_CM = 6.0; // cm → px (so 27" = 60cm → ~360px, 42" = 93cm → ~558px)
// Window content scale: relative to reference 1920×1080
const UI_SCALE_MIN = 0.5;
const UI_SCALE_MAX = 2.0;
const UI_SCALE_DEFAULT = 1.0;

export default function WorkspaceSimulator({ monitors, onMonitorLayoutsChange }: WorkspaceSimulatorProps) {
  const displayMonitors = monitors.slice(0, 3);
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null);
  const [placedWindows, setPlacedWindows] = useState<PlacedWindow[]>([]);
  const [uiScale, setUiScale] = useState(UI_SCALE_DEFAULT);
  const [dragging, setDragging] = useState<PlacedWindow | null>(null);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, wx: 0, wy: 0 });
  const [draggingMonitor, setDraggingMonitor] = useState<string | null>(null);
  const [monitorDragStart, setMonitorDragStart] = useState({ mx: 0, my: 0, mxPos: 0, myPos: 0 });
  const [dummy, setDummy] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Layout computation — uses MONITOR_PX_PER_CM consistently ──
  const computeLayouts = (mono: Monitor[]): MonitorLayout[] => {
    if (mono.length === 0) return [];
    const GAP = 16, PADDING_TOP = 60, MARGIN = 30;
    const availW = CANVAS_W - MARGIN * 2;
    const availH = CANVAS_H - MARGIN * 2;

    const physW = (m: Monitor) => calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
    const physH = (m: Monitor) => calcHeightCm(m.diagonal, m.widthPx, m.heightPx);
    const widthsCm = mono.map(physW);
    const heightsCm = mono.map(physH);

    const rowTotalPx = widthsCm.reduce((a, b) => a + b, 0) * MONITOR_PX_PER_CM + GAP * (mono.length - 1);
    const maxH = Math.max(...heightsCm) * MONITOR_PX_PER_CM;
    const hasLarge = mono.some((m) => m.widthPx >= 3440 || m.diagonal >= 32);
    const useColumn = hasLarge || rowTotalPx > availW;

    if (useColumn) {
      const totalHPx = heightsCm.reduce((a, b) => a + b, 0) * MONITOR_PX_PER_CM + GAP * (mono.length - 1);
      const startY = (CANVAS_H - totalHPx) / 2;
      const centerX = CANVAS_W / 2;
      let cy = startY;
      return mono.map((m, i) => {
        const w = widthsCm[i] * MONITOR_PX_PER_CM;
        const h = heightsCm[i] * MONITOR_PX_PER_CM;
        const vy = cy; cy += h + GAP;
        return { monitor: m, x: centerX - w / 2, y: vy, scale: 1 };
      });
    } else {
      const startX = (CANVAS_W - rowTotalPx) / 2;
      let cx = startX;
      return mono.map((m, i) => {
        const w = widthsCm[i] * MONITOR_PX_PER_CM;
        const h = heightsCm[i] * MONITOR_PX_PER_CM;
        const vx = cx; cx += w + GAP;
        return { monitor: m, x: vx, y: PADDING_TOP + (maxH - h) / 2, scale: 1 };
      });
    }
  };

  // Drag offsets stored in ref so they survive re-renders but NOT across remounts
  const dragOffsetsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Helper: get display pixel size for a monitor using the same physical cm→px scale
  const getMonitorPx = (m: Monitor) => ({
    w: calcWidthCm(m.diagonal, m.widthPx, m.heightPx) * MONITOR_PX_PER_CM,
    h: calcHeightCm(m.diagonal, m.widthPx, m.heightPx) * MONITOR_PX_PER_CM,
  });

  // Lazy-init baseLayouts on mount — this is safe because we remount via key when monitors change
  const [baseLayouts] = useState<MonitorLayout[]>(() => computeLayouts(monitors.slice(0, 3)));

  // Apply drag offsets on top of base
  const monitorLayouts = baseLayouts.map((l) => {
    const off = dragOffsetsRef.current[l.monitor.id] || { x: 0, y: 0 };
    return { ...l, x: l.x + off.x, y: l.y + off.y };
  });

  // Notify parent when arrangement changes (so ViewFromAbove can use it)
  useEffect(() => {
    if (onMonitorLayoutsChange) {
      onMonitorLayoutsChange(monitorLayouts);
    }
  }, [monitorLayouts]);

  // ── Document-level pointer events for window dragging ──
  // Without this, pointerup doesn't fire on the canvas when releasing on a window
  // Manual reset
  const resetLayout = useCallback(() => {
    dragOffsetsRef.current = {};
    // Force re-render to reflect cleared offsets
    setDummy((n) => n + 1);
  }, []);

  // Convert window px at REF resolution → px at current monitor resolution
  const pxAtMonitor = (windowPx: number, monitorPx: number) =>
    (windowPx / REF_W) * monitorPx;

  const addMockupToMonitor = useCallback((mockup: Mockup, monitorId: string, uiScale: number) => {
    const layout = monitorLayouts.find((l) => l.monitor.id === monitorId);
    if (!layout) return;
    const monPhysW = calcWidthCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx);
    const monPhysH = calcHeightCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx);
    const monW = monPhysW * MONITOR_PX_PER_CM;
    const monH = monPhysH * MONITOR_PX_PER_CM;
    const monScreenX = layout.x + 4; // 4px bezel
    const monScreenY = layout.y + 4;
    const monScreenW = monW;
    const monScreenH = monH;
    const existing = placedWindows.filter((pw) => pw.monitorId === monitorId);

    // Cascade: spread windows across the monitor screen in a grid-like pattern
    // Each subsequent window is offset by ~40% of monitor width and ~50% of monitor height
    const newWindows: PlacedWindow[] = mockup.windows.map((app, i) => {
      const col = existing.length + i;
      const row = Math.floor(col / 3);
      const colIdx = col % 3;
      // Offset by 30% of monitor width/height per cascade step
      const offsetX = colIdx * monScreenW * 0.35;
      const offsetY = row * monScreenH * 0.45;
      return {
        instanceId: `${app.id}-${Date.now()}-${Math.random()}`,
        app,
        monitorId,
        x: monScreenX + offsetX + 8,
        y: monScreenY + offsetY + 8,
      };
    });
    setPlacedWindows((prev) => [...prev, ...newWindows]);
  }, [placedWindows, monitorLayouts]);

  const removeWindow = (instanceId: string) =>
    setPlacedWindows((prev) => prev.filter((w) => w.instanceId !== instanceId));

  const clearMonitor = (monitorId: string) =>
    setPlacedWindows((prev) => prev.filter((w) => w.monitorId !== monitorId));

  // ── Window drag (document-level so it works even when pointer is over windows) ──
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.mx;
      const dy = e.clientY - dragStart.my;
      const newX = dragStart.wx + dx;
      const newY = dragStart.wy + dy;

      // Determine which monitor the window center is over
      const winCenterX = newX + (dragging.app.widthPx / REF_W) * (monPhysW(dragging)) / 2;
      const winCenterY = newY + (dragging.app.heightPx / REF_H) * (monPhysH(dragging)) / 2;

      let newMonitorId = dragging.monitorId;
      for (const layout of monitorLayouts) {
        const monW = calcWidthCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
        const monH = calcHeightCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
        if (winCenterX >= layout.x && winCenterX <= layout.x + monW &&
            winCenterY >= layout.y && winCenterY <= layout.y + monH) {
          newMonitorId = layout.monitor.id;
          break;
        }
      }

      setPlacedWindows((prev) =>
        prev.map((w) =>
          w.instanceId === dragging.instanceId
            ? { ...w, x: newX, y: newY, monitorId: newMonitorId }
            : w
        )
      );
    };

    const handleUp = () => setDragging(null);
    document.addEventListener("pointermove", handleMove as unknown as EventListener);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove as unknown as EventListener);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, dragStart, monitorLayouts]);

  // Helper: get monitor physical dimensions in px at current scale
  const monPhysW = (pw: PlacedWindow) => {
    const layout = monitorLayouts.find((l) => l.monitor.id === pw.monitorId);
    if (!layout) return 400;
    return calcWidthCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
  };
  const monPhysH = (pw: PlacedWindow) => {
    const layout = monitorLayouts.find((l) => l.monitor.id === pw.monitorId);
    if (!layout) return 300;
    return calcHeightCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
  };

  // ── Window drag (canvas-level, unused now but kept for reference) ──
  const handleWindowPointerDown = (e: PointerEvent, pw: PlacedWindow) => {
    e.stopPropagation();
    setDragging(pw);
    setDragStart({ mx: e.clientX, my: e.clientY, wx: pw.x, wy: pw.y });
  };

  const handleCanvasPointerMove = useCallback((e: PointerEvent) => {
    // Monitor arrangement drag — update ref offset
    if (draggingMonitor) {
      const dx = e.clientX - monitorDragStart.mx;
      const dy = e.clientY - monitorDragStart.my;
      const base = baseLayouts.find((l) => l.monitor.id === draggingMonitor);
      if (base) {
        dragOffsetsRef.current = {
          ...dragOffsetsRef.current,
          [draggingMonitor]: {
            x: (monitorDragStart.mxPos - base.x) + dx,
            y: (monitorDragStart.myPos - base.y) + dy,
          },
        };
      }
    }
  }, [draggingMonitor, monitorDragStart, baseLayouts]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    setDraggingMonitor(null);
  }, []);

  // ── Render ──────────────────────────────────────────
  // Visual size: window px at reference (1920×1080) → scaled to this monitor's physical px → modified by uiScale
  const getWindowVisualSize = (pw: PlacedWindow) => {
    const layout = monitorLayouts.find((l) => l.monitor.id === pw.monitorId);
    if (!layout) return { w: 80, h: 60 };
    const monW = calcWidthCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
    const monH = calcHeightCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
    const windowW = (pw.app.widthPx / REF_W) * monW * uiScale;
    const windowH = (pw.app.heightPx / REF_H) * monH * uiScale;
    return { w: windowW, h: windowH };
  };

  const renderWindow = (pw: PlacedWindow) => {
    const size = getWindowVisualSize(pw);
    const layout = monitorLayouts.find((l) => l.monitor.id === pw.monitorId);
    if (!layout) return null;
    const isDraggingThis = dragging?.instanceId === pw.instanceId;
    const monPhysW = calcWidthCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
    const monPhysH = calcHeightCm(layout.monitor.diagonal, layout.monitor.widthPx, layout.monitor.heightPx) * MONITOR_PX_PER_CM;
    // Clip: is any part of the window outside the monitor screen?
    const clippedLeft = pw.x < layout.x;
    const clippedTop = pw.y < layout.y;
    const clippedRight = pw.x + size.w > layout.x + monPhysW;
    const clippedBottom = pw.y + size.h > layout.y + monPhysH;
    const isClipped = clippedLeft || clippedTop || clippedRight || clippedBottom;

    return (
      <div
        key={pw.instanceId}
        className={`
          absolute rounded overflow-hidden cursor-grab select-none
          ${isDraggingThis ? "z-50 ring-2 ring-white/40 shadow-2xl" : "z-10 shadow-lg"}
        `}
        style={{
          left: `${pw.x}px`,
          top: `${pw.y}px`,
          width: `${size.w}px`,
          height: `${size.h}px`,
          boxShadow: `0 2px 16px rgba(0,0,0,0.6), 0 0 0 1px ${pw.app.color}44`,
          background: `${pw.app.color}15`,
        }}
        onPointerDown={(e) => handleWindowPointerDown(e, pw)}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-0.5 px-1 py-px text-white/90"
          style={{ background: pw.app.color, minHeight: "12px", fontSize: `${Math.max(5, 6 * uiScale)}px` }}
        >
          <span style={{ fontSize: `${Math.max(5, 7 * uiScale)}px` }}>{pw.app.icon}</span>
          <span className="truncate font-semibold" style={{ fontSize: `${Math.max(5, 6 * uiScale)}px` }}>{pw.app.label}</span>
          <span className="ml-auto text-white/40 font-mono" style={{ fontSize: `${Math.max(4, 5 * uiScale)}px` }}>
            {pw.app.widthPx}×{pw.app.heightPx}px
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeWindow(pw.instanceId); }}
            className="ml-0.5 text-white/60 hover:text-white flex-shrink-0"
            style={{ fontSize: `${Math.max(6, 8 * uiScale)}px`, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Scaled UI content */}
        <div style={{ height: `calc(100% - 12px)` }} className="overflow-hidden">
          {pw.app.previewLines ? (
            <div
              className="font-mono leading-tight p-0.5 overflow-hidden"
              style={{ color: `${pw.app.color}CC`, fontSize: `${Math.max(4, 4.5 * uiScale)}px` }}
            >
              {pw.app.previewLines.slice(0, Math.floor(size.h / (8 * uiScale))).map((line, i) => (
                <div key={i} className="whitespace-nowrap">{line}</div>
              ))}
            </div>
          ) : pw.app.previewImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: `${pw.app.color}66`, fontSize: `${Math.max(6, 8 * uiScale)}px` }}>
              <span>🖼️</span>
              <span style={{ fontSize: `${Math.max(4, 6 * uiScale)}px` }} className="mt-0.5">Image Preview</span>
            </div>
          ) : null}
        </div>

        {isClipped ? (
          <div className="absolute top-0.5 right-1 text-[4px] bg-red-500/80 text-white px-0.5 rounded leading-none">
            clip
          </div>
        ) : null}
      </div>
    );
  };

  if (displayMonitors.length < 2) {
    return (
      <div className="text-center py-12 text-text-tertiary text-sm">
        Select 2-3 monitors to see the workspace simulator
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none">
      {/* Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
              Workspace Simulator
            </h3>
            <p className="text-[9px] text-text-tertiary mt-0.5">
              Drag windows • "Aa" slider scales UI • Compare readability across monitors
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetLayout}
              className="px-3 py-1.5 text-[11px] rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all"
            >
              ↺ Reset positions
            </button>
            {/* UI Scale control */}
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span className="whitespace-nowrap">Aa:</span>
              <input
                type="range"
                min={UI_SCALE_MIN}
                max={UI_SCALE_MAX}
                step={0.1}
                value={uiScale}
                onChange={(e) => setUiScale(parseFloat(e.target.value))}
                className="w-20 accent-accent"
              />
              <span className="font-mono text-[9px] w-10">{(uiScale * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Drag hint */}
        <p className="text-[9px] text-accent bg-accent/10 px-3 py-1.5 rounded-lg">
          🖱️ Drag monitors to rearrange • Drag windows between screens
        </p>

        {/* Category + mockup selector */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                const first = MOCKUPS.find((m) => m.category === cat);
                if (first) setSelectedMockup(first);
              }}
              className="px-2 py-1 text-[9px] rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1">
            {MOCKUPS.map((mockup) => (
              <button
                key={mockup.id}
                onClick={() => setSelectedMockup(mockup)}
                className={`
                  flex-shrink-0 px-2 py-1.5 rounded-lg border text-[10px] text-left transition-all whitespace-nowrap
                  ${selectedMockup?.id === mockup.id
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-border bg-bg-secondary text-text-secondary hover:border-text-tertiary"
                  }
                `}
              >
                {mockup.icon} {mockup.name}
              </button>
            ))}
          </div>

          {selectedMockup && (
            <div className="flex gap-1.5 items-center flex-shrink-0">
              <span className="text-[9px] text-text-tertiary">→</span>
              {displayMonitors.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => addMockupToMonitor(selectedMockup, m.id, uiScale)}
                  className="px-2 py-1 text-[10px] rounded-lg bg-accent text-black hover:brightness-110 transition-all font-medium"
                >
                  M{idx + 1}
                </button>
              ))}
              <button
                onClick={() => displayMonitors.forEach((m) => addMockupToMonitor(selectedMockup, m.id, uiScale))}
                className="px-2 py-1 text-[10px] rounded-lg bg-success/20 text-success hover:bg-success/30 transition-all"
              >
                All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="sim-canvas relative rounded-xl border border-border bg-[#1e1e24] overflow-hidden"
        style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto" }}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Monitors */}
        {monitorLayouts.map((layout, idx) => {
          const { w: monW, h: monH } = getMonitorPx(layout.monitor);
          const windows = placedWindows.filter((pw) => pw.monitorId === layout.monitor.id);

          return (
            <div
              key={layout.monitor.id}
              className={`
                absolute rounded-lg overflow-hidden cursor-grab active:cursor-grabbing
                ${draggingMonitor === layout.monitor.id ? "ring-2 ring-accent" : ""}
              `}
              style={{
                left: `${layout.x}px`,
                top: `${layout.y}px`,
                width: `${monW}px`,
                height: `${monH}px`,
                boxShadow: "0 8px 40px rgba(0,0,0,0.9), 0 0 0 2px #3a3a40, 0 0 0 4px #1a1a1e",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggingMonitor(layout.monitor.id);
                setMonitorDragStart({ mx: e.clientX, my: e.clientY, mxPos: layout.x, myPos: layout.y });
              }}
            >
              {/* Monitor bezel */}
              <div className="absolute inset-0 rounded-lg bg-[#2a2a30] pointer-events-none" />

              {/* Screen — solid dark background, blocks grid */}
              <div className="absolute inset-[4px] rounded bg-[#18181c] overflow-hidden">
                {/* Subtle scan-line effect */}
                <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,1)_2px,rgba(255,255,255,1)_4px)]" />

                {/* Label — top left of screen */}
                <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-1">
                  <span className="text-[8px] font-bold text-black bg-accent px-1 py-0.5 rounded shadow">
                    M{idx + 1}
                  </span>
                  <span className="text-[7px] font-mono text-white/70 bg-black/50 px-1 py-0.5 rounded">
                    {layout.monitor.diagonal}&quot; {Math.round(layout.monitor.widthPx)}×{layout.monitor.heightPx}
                  </span>
                </div>

                {/* Info centered */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-white/50 tracking-widest">
                    {layout.monitor.diagonal}&quot;
                  </span>
                  <span className="text-[7px] font-mono text-white/30 mt-0.5">
                    {Math.round(layout.monitor.widthPx / 100) / 10}K
                  </span>
                </div>
              </div>

              {/* Windows inside this monitor */}
              {windows.map((pw) => renderWindow(pw))}

              {/* Clear */}
              {windows.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearMonitor(layout.monitor.id); }}
                  className="absolute bottom-1 right-1 text-[7px] text-red-400/60 hover:text-red-400 z-30 bg-black/40 px-1 py-0.5 rounded"
                >
                  clear
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Monitor specs row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {monitorLayouts.map((layout, idx) => {
          const m = layout.monitor;
          const wCm = calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
          const hCm = calcHeightCm(m.diagonal, m.widthPx, m.heightPx);
          const ppi = calcPPI(m.widthPx, m.heightPx, m.diagonal);
          const monW = getMonitorPx(m).w;
          return (
            <div key={m.id} className="flex-shrink-0 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[10px] space-y-0.5 min-w-[140px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-accent">M{idx + 1}</span>
                <span className="text-text-primary font-medium">{m.diagonal}&quot; {m.name}</span>
              </div>
              <div className="text-text-tertiary font-mono">
                {m.widthPx}×{m.heightPx}px • {ppi.toFixed(0)} PPI
              </div>
              <div className="text-text-tertiary">
                {wCm.toFixed(1)}×{hCm.toFixed(1)} cm
              </div>
              <div className="text-text-tertiary/60 text-[9px]">
                1 window {REF_W}×{REF_H}px = {(REF_W / m.widthPx * 100).toFixed(0)}% szerokości
              </div>
            </div>
          );
        })}
      </div>

      {/* Window size comparison */}
      {placedWindows.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border">
            <h4 className="text-[11px] font-semibold text-text-secondary">Jak okno {REF_W}×{REF_H}px zmienia pokrycie</h4>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary">
                <th className="text-left py-1.5 px-3 text-text-tertiary">Okno</th>
                {monitorLayouts.map((l, i) => (
                  <th key={l.monitor.id} className="text-center py-1.5 px-2 text-text-tertiary">
                    M{i+1} {l.monitor.diagonal}&quot;
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Map(placedWindows.map((pw) => [pw.app.id, pw.app])).values()].map((app) => {
                const refW = monitorLayouts[0]?.monitor.widthPx || REF_W;
                return (
                  <tr key={app.id} className="border-b border-border/50">
                    <td className="py-1.5 px-3 text-text-secondary">
                      {app.icon} {app.label}
                      <span className="ml-1 text-text-tertiary font-mono text-[9px]">{app.widthPx}×{app.heightPx}px</span>
                    </td>
                    {monitorLayouts.map((l) => {
                      const pct = (app.widthPx / l.monitor.widthPx * 100).toFixed(1);
                      const isSmall = parseFloat(pct) < 40;
                      return (
                        <td key={l.monitor.id} className="py-1.5 px-2 text-center">
                          <span className={`font-mono ${isSmall ? "text-warning" : "text-success"}`}>{pct}%</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface WorkspaceSimulatorProps {
  monitors: Monitor[];
  // Called whenever monitor positions change (after drag or initial layout)
  onMonitorLayoutsChange?: (layouts: MonitorLayout[]) => void;
}

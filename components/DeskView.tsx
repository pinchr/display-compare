"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm, calcPPI } from "@/lib/monitors/calculations";
import { MOCKUPS, CATEGORIES, Mockup, AppWindow } from "@/lib/mockups/types";

const REF_W = 1920;
const REF_H = 1080;
const MONITOR_PX_PER_CM = 6.0;

interface PlacedWindow {
  instanceId: string;
  app: AppWindow;
  monitorId: string;
  x: number;
  y: number;
}

interface MonitorLayout {
  monitor: Monitor;
  x: number;
  y: number;
  scale: number;
}

interface MonitorArrangement3D {
  id: string;
  monitor: Monitor;
  xCm: number;
  yCm: number;
  zCm: number;
  rotation: number;
}

interface DeskViewProps {
  monitors: Monitor[];
  arrangements: MonitorLayout[];
  onArrangementsChange: (layouts: MonitorLayout[]) => void;
}

export default function DeskView({ monitors, arrangements, onArrangementsChange }: DeskViewProps) {
  const displayMonitors = monitors.slice(0, 3);

  if (displayMonitors.length < 2) {
    return <div className="text-center py-12 text-text-tertiary text-sm">Select at least 2 monitors to see the desk view</div>;
  }

  const getInitialArrangements = useMemo((): MonitorArrangement3D[] => {
    const totalPhysCm = displayMonitors.reduce((sum, m) => sum + calcWidthCm(m.diagonal, m.widthPx, m.heightPx), 0) + (displayMonitors.length - 1) * 3;
    if (arrangements && arrangements.length > 0 && arrangements.length === displayMonitors.length) {
      return displayMonitors.map((m, i) => {
        const layout = arrangements.find(a => a.monitor.id === m.id);
        const xPx = layout?.x ?? 0;
        const xCm = ((xPx - 600) / 1200) * totalPhysCm;
        return { id: m.id, monitor: m, xCm, yCm: 0, zCm: 70, rotation: 0 };
      });
    }
    let offset = -totalPhysCm / 2;
    return displayMonitors.map((m) => {
      const wCm = calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
      const center = offset + wCm / 2;
      offset += wCm + 3;
      return { id: m.id, monitor: m, xCm: center, yCm: 0, zCm: 70, rotation: 0 };
    });
  }, [displayMonitors, arrangements]);

  const [sharedArrangements, setSharedArrangements] = useState<MonitorArrangement3D[]>(getInitialArrangements);
  const [sharedHeadDistance, setSharedHeadDistance] = useState(94);
  const [deskWidthCm, setDeskWidthCm] = useState(180);
  const [deskDepthCm, setDeskDepthCm] = useState(70);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current || JSON.stringify(getInitialArrangements) !== JSON.stringify(sharedArrangements)) {
      setSharedArrangements(getInitialArrangements);
      isInitialized.current = true;
    }
  }, [getInitialArrangements]);

  const handleArrangementChange = useCallback((newArr: MonitorArrangement3D[]) => {
    setSharedArrangements(newArr);
    const totalPhysCm = displayMonitors.reduce((sum, m) => sum + calcWidthCm(m.diagonal, m.widthPx, m.heightPx), 0) + (displayMonitors.length - 1) * 3;
    const pxPerCm = 1200 / totalPhysCm;
    const layouts: MonitorLayout[] = newArr.map(arr => ({ monitor: arr.monitor, x: 600 + arr.xCm * pxPerCm, y: 300, scale: 1 }));
    onArrangementsChange(layouts);
  }, [displayMonitors, onArrangementsChange]);

  return (
    <div className="rounded-2xl border border-border bg-bg-secondary overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-bg-tertiary/50">
        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">🖥️ Desk View</h3>
        <p className="text-[9px] text-text-tertiary mt-0.5">Drag monitors in either view • Both views sync in real-time</p>
      </div>
      <div className="p-4 space-y-4">
        <FrontView monitors={displayMonitors} arrangements={sharedArrangements} headDistance={sharedHeadDistance} deskWidthCm={deskWidthCm} deskDepthCm={deskDepthCm} onArrangementsChange={handleArrangementChange} onHeadDistanceChange={setSharedHeadDistance} onDeskSizeChange={(w, d) => { setDeskWidthCm(w); setDeskDepthCm(d); }} />
        <TopView monitors={displayMonitors} arrangements={sharedArrangements} headDistance={sharedHeadDistance} deskWidthCm={deskWidthCm} deskDepthCm={deskDepthCm} onArrangementsChange={handleArrangementChange} onHeadDistanceChange={setSharedHeadDistance} />
      </div>
    </div>
  );
}

function FrontView({ monitors, arrangements, headDistance, deskWidthCm, deskDepthCm, onArrangementsChange, onHeadDistanceChange, onDeskSizeChange }: { monitors: Monitor[]; arrangements: MonitorArrangement3D[]; headDistance: number; deskWidthCm: number; deskDepthCm: number; onArrangementsChange: (arr: MonitorArrangement3D[]) => void; onHeadDistanceChange: (d: number) => void; onDeskSizeChange?: (w: number, d: number) => void }) {
  const [placedWindows, setPlacedWindows] = useState<PlacedWindow[]>([]);
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null);
  const defaultScales = useMemo(() => { const r: Record<string, number> = {}; monitors.forEach(m => { r[m.id] = Math.round((calcPPI(m.widthPx, m.heightPx, m.diagonal) / 96) * 100) / 100; }); return r; }, [monitors]);
  const [uiScales, setUiScales] = useState<Record<string, number>>(defaultScales);
  const isDraggingRef = useRef(false);
  const [localArrangements, setLocalArrangements] = useState<MonitorArrangement3D[]>(arrangements);
  const localArrangementsRef = useRef(localArrangements);
  useEffect(() => { localArrangementsRef.current = localArrangements; }, [localArrangements]);

  // Sync local arrangements from parent only when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalArrangements(arrangements);
    }
  }, [arrangements]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showBanana, setShowBanana] = useState(false);
  const [showIPhone, setShowIPhone] = useState(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; arr: MonitorArrangement3D; startXCm: number; startYCm: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local arrangements from parent only when not dragging
  useEffect(() => {
    if (!draggingId) {
      setLocalArrangements(arrangements);
    }
  }, [arrangements, draggingId]);

  const FOV_ANGLE = 30;
  const CANVAS_H = 700;
  const EYE_Y = CANVAS_H / 2;
  const REF_DISTANCE = 70; // reference head distance for scale
  const DESK_SURFACE_Y = CANVAS_H - 80; // fixed y position of desk surface

  const totalPhysCm = useMemo(() => monitors.reduce((sum, m) => sum + calcWidthCm(m.diagonal, m.widthPx, m.heightPx), 0) + (monitors.length - 1) * 3, [monitors]);
  const basePxPerCm = 1200 / totalPhysCm;
  // Perspective: farther head = smaller monitors
  const perspectiveScale = REF_DISTANCE / headDistance;
  const pxPerCm = basePxPerCm * perspectiveScale;

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId || !dragStart.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = mouseX - dragStart.current.mouseX;
    const dy = mouseY - dragStart.current.mouseY;

    const wCm = calcWidthCm(dragStart.current.arr.monitor.diagonal, dragStart.current.arr.monitor.widthPx, dragStart.current.arr.monitor.heightPx);
    const wPx = wCm * pxPerCm;
    const minXCm = -600 + wPx / 2 / pxPerCm;
    const maxXCm = 600 - wPx / 2 / pxPerCm;
    
    // Y-axis: -60 to +60 cm range (move monitor up or down)
    const minYCm = -60;
    const maxYCm = 60;
    
    // Both axes work simultaneously - drag diagonally
    const newXCm = Math.max(minXCm, Math.min(maxXCm, dragStart.current.startXCm + dx / pxPerCm));
    const newYCm = Math.max(minYCm, Math.min(maxYCm, dragStart.current.startYCm - dy / pxPerCm));

    setLocalArrangements(prev => prev.map(arr => arr.id === draggingId ? { ...arr, xCm: newXCm, yCm: newYCm } : arr));
  }, [draggingId, pxPerCm]);

  const handlePointerUp = useCallback(() => {
    if (draggingId) {
      onArrangementsChange(localArrangementsRef.current);
    }
    setDraggingId(null);
    dragStart.current = null;
  }, [draggingId, onArrangementsChange]);

  const resetLayout = () => {
    let offset = -totalPhysCm / 2;
    const defaults = monitors.map((m) => { const wCm = calcWidthCm(m.diagonal, m.widthPx, m.heightPx); const center = offset + wCm / 2; offset += wCm + 3; return { id: m.id, monitor: m, xCm: center, yCm: 0, zCm: 70, rotation: 0 }; });
    setLocalArrangements(defaults);
    onArrangementsChange(defaults);
  };

  const addMockupToMonitor = (mockup: Mockup, monitorId: string) => {
    const arr = localArrangements.find(a => a.id === monitorId);
    if (!arr) return;
    const monW = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx) * pxPerCm;
    const monH = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx) * pxPerCm;
    // Use same positioning formula as in render
    const baseX = 600 + arr.xCm * pxPerCm - monW / 2;
    const baseY = EYE_Y + arr.yCm * 2 - monH / 2;
    const existing = placedWindows.filter(pw => pw.monitorId === monitorId);
    const newWindows: PlacedWindow[] = mockup.windows.map((app, i) => {
      const col = existing.length + i;
      const row = Math.floor(col / 3);
      const colIdx = col % 3;
      const offsetX = colIdx * monW * 0.35;
      const offsetY = row * monH * 0.45;
      return {
        instanceId: `${app.id}-${Date.now()}-${Math.random()}`,
        app,
        monitorId,
        x: baseX + 4 + offsetX + 8,
        y: baseY + 4 + offsetY + 8,
      };
    });
    setPlacedWindows(prev => [...prev, ...newWindows]);
  };

  const getWindowVisualSize = (pw: PlacedWindow) => {
    const arr = localArrangements.find(l => l.id === pw.monitorId);
    if (!arr) return { w: 80, h: 60 };
    const monW = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx) * pxPerCm;
    const monH = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx) * pxPerCm;
    const scale = uiScales[pw.monitorId] ?? 1.0;
    return { w: (pw.app.widthPx / REF_W) * monW * scale, h: (pw.app.heightPx / REF_H) * monH * scale };
  };

  const isInFOV = (yCm: number) => {
    const visibleHalfHeight = headDistance * Math.tan(FOV_ANGLE * Math.PI / 180);
    return Math.abs(yCm) <= visibleHalfHeight;
  };

  // Calculate overlap percentage for a monitor
  const getOverlapPercent = (arr: MonitorArrangement3D): number => {
    let maxOverlap = 0;
    for (const other of arrangements) {
      if (other.id === arr.id) continue;
      const wA = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
      const hA = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
      const wB = calcWidthCm(other.monitor.diagonal, other.monitor.widthPx, other.monitor.heightPx);
      const hB = calcHeightCm(other.monitor.diagonal, other.monitor.widthPx, other.monitor.heightPx);

      const aLeft = arr.xCm - wA / 2;
      const aRight = arr.xCm + wA / 2;
      const bLeft = other.xCm - wB / 2;
      const bRight = other.xCm + wB / 2;
      const xOverlap = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));

      const aTop = arr.yCm;
      const aBottom = arr.yCm + hA;
      const bTop = other.yCm;
      const bBottom = other.yCm + hB;
      const yOverlap = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));

      const overlapArea = xOverlap * yOverlap;
      const smallerArea = Math.min(wA * hA, wB * hB);
      if (smallerArea > 0) {
        maxOverlap = Math.max(maxOverlap, overlapArea / smallerArea);
      }
    }
    return maxOverlap;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button onClick={resetLayout} className="px-3 py-1.5 text-[11px] rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary">↺ Reset</button>
          <select
            value={selectedMockup?.id || ""}
            onChange={(e) => setSelectedMockup(MOCKUPS.find(m => m.id === e.target.value) || null)}
            className="px-2 py-1.5 text-[11px] rounded-lg bg-bg-tertiary text-text-secondary border border-border"
          >
            <option value="">+ Add Mockup</option>
            {MOCKUPS.map(m => (
              <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
            ))}
          </select>
          {selectedMockup && localArrangements.map((arr, idx) => (
            <button key={arr.id} onClick={() => addMockupToMonitor(selectedMockup, arr.id)}
              className="px-2 py-1.5 text-[11px] rounded-lg bg-accent text-black font-medium">
              M{idx + 1}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-text-tertiary">Aa:</span>
          {arrangements.map((arr, idx) => {
            const scale = uiScales[arr.id] ?? 1.0;
            const ppi = calcPPI(arr.monitor.widthPx, arr.monitor.heightPx, arr.monitor.diagonal);
            return (
              <div key={arr.id} className="flex items-center gap-1.5 text-[9px]">
                <span className="text-accent font-medium">M{idx + 1}</span>
                <span className="text-text-tertiary">({ppi})</span>
                <input type="range" min={0.3} max={3.0} step={0.1} value={scale}
                  onChange={(e) => setUiScales(prev => ({ ...prev, [arr.id]: parseFloat(e.target.value) }))}
                  className="w-16 accent-accent" />
                <span className="font-mono text-text-secondary w-8">{(scale * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-text-tertiary">Scale refs:</span>
          <button onClick={() => setShowBanana(b => !b)}
            className={`px-2 py-1 text-[9px] rounded ${showBanana ? 'bg-yellow-500/30 text-yellow-300' : 'bg-bg-tertiary text-text-tertiary'}`}>
            🍌 Banana
          </button>
          <button onClick={() => setShowIPhone(b => !b)}
            className={`px-2 py-1 text-[9px] rounded ${showIPhone ? 'bg-blue-500/30 text-blue-300' : 'bg-bg-tertiary text-text-tertiary'}`}>
            📱 iPhone
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-text-tertiary">Desk:</span>
          <span className="text-[9px] text-text-tertiary">W:<input type="range" min={100} max={300} step={5} value={deskWidthCm}
            onChange={(e) => onDeskSizeChange?.(parseInt(e.target.value), deskDepthCm)}
            className="w-16 accent-amber-600 mx-1" />{deskWidthCm}cm</span>
          <span className="text-[9px] text-text-tertiary">D:<input type="range" min={40} max={120} step={5} value={deskDepthCm}
            onChange={(e) => onDeskSizeChange?.(deskWidthCm, parseInt(e.target.value))}
            className="w-12 accent-amber-600 mx-1" />{deskDepthCm}cm</span>
        </div>
      </div>

      <div ref={containerRef} className="relative rounded-xl border border-border bg-[#1e1e24] overflow-hidden select-none"
        style={{ width: 1200, height: CANVAS_H, margin: "0 auto", cursor: draggingId ? "grabbing" : "default" }}
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: "20px 20px" }} />

        {/* Eye position */}
        <div className="absolute left-1/2 pointer-events-none" style={{ top: EYE_Y }}>
          <div className="w-4 h-4 -ml-2 rounded-full bg-amber-500/40 border-2 border-amber-500/60" />
        </div>

        {/* FOV lines */}
        <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `polygon(50% ${EYE_Y}px, 0% 0%, 100% 0%, 100% 100%, 0% 100%)` }}>
          <div className="absolute left-0 right-0 border-y border-amber-500/20" style={{ top: `${EYE_Y - 200}px`, height: '400px' }} />
        </div>

        {arrangements.map((arr, idx) => {
          const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
          const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
          const wPx = wCm * pxPerCm;
          const hPx = hCm * pxPerCm;
          const xPx = 600 + arr.xCm * pxPerCm - wPx / 2;
          // Monitor sits on desk surface - bottom of monitor at DESK_SURFACE_Y
          const yPx = DESK_SURFACE_Y - hPx - arr.yCm * pxPerCm;
          const windows = placedWindows.filter(pw => pw.monitorId === arr.id);
          const inFOV = isInFOV(arr.yCm);
          const overlapPct = getOverlapPercent(arr);
          // If overlap > 10%, show semi-transparent overlay
          const opacity = !inFOV ? 0.4 : overlapPct > 0.1 ? 0.65 : 1.0;

          return (
            <div key={arr.id}
              className={`absolute rounded-lg overflow-hidden ${draggingId === arr.id ? "ring-2 ring-accent" : ""}`}
              style={{ left: `${xPx}px`, top: `${yPx}px`, width: `${wPx}px`, height: `${hPx}px`, opacity, boxShadow: "0 8px 40px rgba(0,0,0,0.9), 0 0 0 2px #3a3a40", cursor: draggingId === arr.id ? "grabbing" : "grab" }}
              onPointerDown={(e) => { e.stopPropagation(); const rect = containerRef.current!.getBoundingClientRect(); setDraggingId(arr.id); dragStart.current = { mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top, arr, startXCm: arr.xCm, startYCm: arr.yCm }; }}
            >
              <div className="absolute inset-0 rounded-lg bg-[#2a2a30]" />
              <div className="absolute inset-[4px] rounded bg-[#18181c]">
                <div className="absolute top-1.5 left-1.5 z-20"><span className="text-[8px] font-bold text-black bg-accent px-1 py-0.5 rounded">M{idx + 1}</span></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-white/50 tracking-widest">{arr.monitor.diagonal}"</span>
                  {!inFOV && <span className="text-[7px] text-red-400/80 mt-1">outside FOV</span>}
                </div>
              </div>
              {windows.map(pw => {
                const size = getWindowVisualSize(pw);
                return (
                  <div key={pw.instanceId} className="absolute rounded overflow-hidden shadow-lg border border-white/20"
                    style={{ left: `${pw.x}px`, top: `${pw.y}px`, width: `${size.w}px`, height: `${size.h}px`, background: `${pw.app.color}40` }}>
                    <div className="flex items-center gap-0.5 px-1 py-px text-white/90 border-b border-white/10"
                      style={{ background: pw.app.color, minHeight: "14px", fontSize: `${Math.max(6, 7 * (uiScales[pw.monitorId] ?? 1.0))}px` }}>
                      <span>{pw.app.icon}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Desk surface - scales with perspective, positioned at DESK_SURFACE_Y */}
        <div className="absolute pointer-events-none" style={{
          left: '50%',
          bottom: `${CANVAS_H - DESK_SURFACE_Y}px`,
          width: `${deskWidthCm * pxPerCm}px`,
          height: '80px',
          transform: 'translateX(-50%)',
        }}>
          <svg width="100%" height="100%" viewBox="0 0 800 80" preserveAspectRatio="none" className="absolute inset-0">
            <defs>
              <linearGradient id="deskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3a3530" />
                <stop offset="100%" stopColor="#1a1815" />
              </linearGradient>
            </defs>
            <polygon points="50,0 750,0 800,80 0,80" fill="url(#deskGrad)" stroke="#4a4540" strokeWidth="2" />
            <line x1="150" y1="0" x2="80" y2="80" stroke="#2a2520" strokeWidth="1" opacity="0.3" />
            <line x1="400" y1="0" x2="400" y2="80" stroke="#2a2520" strokeWidth="1" opacity="0.3" />
            <line x1="650" y1="0" x2="720" y2="80" stroke="#2a2520" strokeWidth="1" opacity="0.3" />
          </svg>
        </div>

        {/* Scale references - banana (18cm) and iPhone (15cm width) */}
        {showBanana && (
          <div className="absolute pointer-events-none" style={{ left: '50px', bottom: '60px' }}>
            <div className="flex flex-col items-center">
              <div className="bg-yellow-400 rounded-full" style={{ width: `${18 * pxPerCm}px`, height: `${18 * pxPerCm * 0.35}px`, borderRadius: '50% / 60%', transform: 'rotate(-15deg)' }} />
              <span className="text-[8px] text-yellow-300/70 mt-1">🍌 18cm</span>
            </div>
          </div>
        )}
        {showIPhone && (
          <div className="absolute pointer-events-none" style={{ left: '50px', bottom: '120px' }}>
            <div className="flex flex-col items-center">
              <div className="bg-gray-800 rounded-xl border-2 border-gray-600 overflow-hidden" style={{ width: `${7.5 * pxPerCm}px`, height: `${15 * pxPerCm}px` }}>
                <div className="h-full bg-gradient-to-b from-gray-700 to-black flex items-center justify-center">
                  <span className="text-[6px] text-white/30">iPhone</span>
                </div>
              </div>
              <span className="text-[8px] text-blue-300/70 mt-1">📱 15cm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopView({ monitors, arrangements, headDistance, deskWidthCm, deskDepthCm, onArrangementsChange, onHeadDistanceChange }: { monitors: Monitor[]; arrangements: MonitorArrangement3D[]; headDistance: number; deskWidthCm: number; deskDepthCm: number; onArrangementsChange: (arr: MonitorArrangement3D[]) => void; onHeadDistanceChange: (d: number) => void }) {
  const isDraggingRef = useRef(false);
  const [localArrangements, setLocalArrangements] = useState<MonitorArrangement3D[]>(arrangements);
  const localArrangementsRef = useRef(localArrangements);
  useEffect(() => { localArrangementsRef.current = localArrangements; }, [localArrangements]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ mouseX: number; arr: MonitorArrangement3D } | null>(null);

  // Sync local arrangements from parent only when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalArrangements(arrangements);
    }
  }, [arrangements]);

  const CANVAS_W = 800;
  const CANVAS_H = 340;
  const HEAD_X = CANVAS_W / 2;
  const HEAD_Y = CANVAS_H - 30;
  const DESK_Y = HEAD_Y + 10; // desk surface at head level
  const SCALE = 1.5;

  const totalPhysCm = useMemo(() => monitors.reduce((sum, m) => sum + calcWidthCm(m.diagonal, m.widthPx, m.heightPx), 0) + (monitors.length - 1) * 3, [monitors]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId || !dragStart.current || !svgRef.current) return;
    isDraggingRef.current = true;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const dx = mouseX - dragStart.current.mouseX;
    const dxCm = dx / SCALE;
    const wCm = calcWidthCm(dragStart.current.arr.monitor.diagonal, dragStart.current.arr.monitor.widthPx, dragStart.current.arr.monitor.heightPx);
    const halfW = wCm / 2;
    const minXCm = -totalPhysCm / 2 + halfW;
    const maxXCm = totalPhysCm / 2 - halfW;
    const newXCm = Math.max(minXCm, Math.min(maxXCm, dragStart.current.arr.xCm + dxCm));
    setLocalArrangements(prev => prev.map(arr => arr.id === draggingId ? { ...arr, xCm: newXCm } : arr));
  }, [draggingId, totalPhysCm]);

  const handlePointerUp = useCallback(() => {
    if (draggingId) {
      onArrangementsChange(localArrangementsRef.current);
    }
    setDraggingId(null);
    dragStart.current = null;
    isDraggingRef.current = false;
  }, [draggingId, onArrangementsChange]);

  const overlaps = useMemo(() => {
    const result: { cx: number; cy: number }[] = [];
    const sorted = [...localArrangements].sort((a, b) => a.xCm - b.xCm);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const wA = calcWidthCm(a.monitor.diagonal, a.monitor.widthPx, a.monitor.heightPx);
      const wB = calcWidthCm(b.monitor.diagonal, b.monitor.widthPx, b.monitor.heightPx);
      const aRight = a.xCm + wA / 2;
      const bLeft = b.xCm - wB / 2;
      if (aRight > bLeft) {
        result.push({ cx: HEAD_X + ((aRight + bLeft) / 2) * SCALE, cy: HEAD_Y - 15 - headDistance * SCALE });
      }
    }
    return result;
  }, [localArrangements, headDistance]);

  return (
    <div className="bg-[#1a1a1e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Bird's Eye View</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary">Distance:</span>
          <input type="range" min={20} max={150} value={headDistance}
            onChange={(e) => onHeadDistanceChange(parseInt(e.target.value))}
            className="w-24 accent-amber-400" />
          <span className="text-[9px] font-mono text-text-secondary w-8">{headDistance}cm</span>
        </div>
      </div>

      <svg ref={svgRef} width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="rounded-lg w-full" style={{ background: "#1a1a1e", cursor: draggingId ? "grabbing" : "default" }}
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
      >
        <rect x={10} y={HEAD_Y - 10} width={CANVAS_W - 20} height={CANVAS_H - HEAD_Y + 10} fill="#222228" rx={4} />

        {/* FOV */}
        <g opacity={0.15}>
          <line x1={HEAD_X} y1={HEAD_Y - 15} x2={HEAD_X - 180} y2={HEAD_Y - 15 - headDistance * SCALE} stroke="#5a5a6a" strokeWidth={1} />
          <line x1={HEAD_X} y1={HEAD_Y - 15} x2={HEAD_X + 180} y2={HEAD_Y - 15 - headDistance * SCALE} stroke="#5a5a6a" strokeWidth={1} />
        </g>

        {overlaps.map((o, i) => <circle key={i} cx={o.cx} cy={o.cy} r={5} fill="#ef4444" opacity={0.9} />)}

        <g transform={`translate(${HEAD_X}, ${HEAD_Y})`}>
          <ellipse cx={0} cy={0} rx={14} ry={17} fill="#2a2a32" stroke="#4a4a56" strokeWidth={1.5} />
          <ellipse cx={-15} cy={-3} rx={4} ry={7} fill="#2a2a32" stroke="#4a4a56" strokeWidth={1} />
          <ellipse cx={15} cy={-3} rx={4} ry={7} fill="#2a2a32" stroke="#4a4a56" strokeWidth={1} />
          <path d="M -20 17 Q -10 27 0 24 Q 10 27 20 17" fill="#222228" stroke="#3a3a44" strokeWidth={1} />
        </g>

        {arrangements.map((arr, idx) => {
          const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
          const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
          const cx = HEAD_X + arr.xCm * SCALE;
          // Monitors sit on desk (top-down: monitor frame at desk level)
          const DESK_Y = HEAD_Y + 20;
          const yMon = DESK_Y - arr.yCm * SCALE;
          const wPx = wCm * SCALE;
          const curved = arr.monitor.curved;
          const curveRadius = arr.monitor.curvatureRadius || 1500;
          const curveRadiusPx = curveRadius * SCALE / 10;

          return (
            <g key={arr.id}>
              {/* Stand from desk to monitor */}
              <line x1={cx} y1={yMon} x2={cx} y2={DESK_Y} stroke="#3a3a48" strokeWidth={2} opacity={0.6} />

              {/* Monitor top view - flat = rectangle frame, curved = arc */}
              {curved ? (
                <path d={`M ${cx - wPx/2} ${yMon} A ${curveRadiusPx} ${curveRadiusPx} 0 0 1 ${cx + wPx/2} ${yMon}`}
                  fill="none" stroke="#F59E0B" strokeWidth={5} strokeLinecap="round" style={{ cursor: "grab" }}
                  onPointerDown={(e) => { e.stopPropagation(); const rect = svgRef.current!.getBoundingClientRect(); setDraggingId(arr.id); dragStart.current = { mouseX: e.clientX - rect.left, arr }; }} />
              ) : (
                <rect x={cx - wPx/2} y={yMon - hCm * SCALE} width={wPx} height={hCm * SCALE}
                  fill="#2a2a32" stroke="#5a5a6a" strokeWidth={3} rx={2} style={{ cursor: "grab" }}
                  onPointerDown={(e) => { e.stopPropagation(); const rect = svgRef.current!.getBoundingClientRect(); setDraggingId(arr.id); dragStart.current = { mouseX: e.clientX - rect.left, arr }; }} />
              )}

              <text x={cx} y={yMon - hCm * SCALE - 8} fill="#6a6a7a" fontSize={7} textAnchor="middle" fontFamily="monospace">{arr.monitor.diagonal}"</text>
            </g>
          );
        })}

        {/* Desk rectangle - proper rectangle for top-down view */}
        <rect x={HEAD_X - deskWidthCm * SCALE / 2} y={DESK_Y} width={deskWidthCm * SCALE} height={deskDepthCm * SCALE}
          fill="#3a3530" stroke="#4a4540" strokeWidth={2} />
      </svg>

      <div className="flex items-center justify-center gap-6 mt-2 text-[9px] text-text-tertiary">
        <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded bg-[#5a5a6a]" /><span>Flat</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 rounded bg-[#F59E0B]" /><span>Curved</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /><span>Overlap</span></div>
      </div>
    </div>
  );
}

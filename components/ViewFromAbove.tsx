"use client";

import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm } from "@/lib/monitors/calculations";
import type { MonitorArrangement } from "@/app/page";

interface ViewFromAboveProps {
  monitors: Monitor[];
  // Arrangement from WorkspaceSimulator — used for monitor positions
  arrangements?: MonitorArrangement[];
}

// Workspace canvas dimensions (where arrangements are defined)
const WS_CANVAS_W = 1200;
const WS_CANVAS_H = 700;

const CANVAS_W = 800;
const CANVAS_H = 480;
const HEAD_Y = CANVAS_H - 50; // eyes position (y)
const HEAD_X = CANVAS_W / 2;  // center
const DESK_Y = HEAD_Y + 20;   // desk edge (in front of user)
const EYES_DISTANCE_CM = 70;  // eyes to desk surface (cm) — average sitting distance

// Viewing distance from eyes to monitor center (cm) — based on diagonal
// Guideline: distance ≈ 1.2-1.5x diagonal for comfortable viewing
const getViewingDistance = (diagonal: number) => Math.round(diagonal * 1.3);

export default function ViewFromAbove({ monitors, arrangements }: ViewFromAboveProps) {
  if (monitors.length === 0) return null;

  const mono = monitors.slice(0, 3);

  // Calculate physical widths in cm
  const widthsCm = mono.map((m) => calcWidthCm(m.diagonal, m.widthPx, m.heightPx));
  const heightsCm = mono.map((m) => calcHeightCm(m.diagonal, m.widthPx, m.heightPx));

  // Canvas scale: how many pixels per cm
  const totalWidthCm = widthsCm.reduce((a, b) => a + b, 0) + 30; // 30cm margin
  const maxHCm = Math.max(...heightsCm);
  const scale = Math.min((CANVAS_W - 80) / totalWidthCm, (CANVAS_H - 200) / (EYES_DISTANCE_CM + maxHCm + 40));
  const cmToPx = scale;

  // ── Compute final positions ──
  // Use arrangements from WorkspaceSimulator if available, otherwise auto-layout
  let finalPositions: { x: number; y: number; w: number; h: number; m: Monitor; isCurved: boolean; depthCm: number }[];

  if (arrangements && arrangements.length > 0) {
    // Map workspace simulator positions to bird's-eye view
    // WS X: 0..1200 → SVG X: proportionally across the desk
    // WS Y: 0..700 → distance from viewer (higher Y = closer to viewer = lower on SVG)
    const MARGIN_X = 60;
    const usableW = CANVAS_W - MARGIN_X * 2;
    // WS center is at x=600 — use that as reference
    const wsCenterX = 600;
    // Map WS X to SVG X (centered on canvas)
    const mapX = (wsX: number) => {
      const normalized = (wsX - wsCenterX) / wsCenterX; // -1 to 1
      return HEAD_X + normalized * (usableW / 2);
    };
    // WS Y: 0 = front, 700 = back → SVG: 0 = back (far), CANVAS_H = front (near)
    // But in our SVG, HEAD_Y is near (large Y), monitors are far (smaller Y)
    // We want: WS Y small → SVG Y closer to top (far), WS Y large → SVG Y closer to bottom (near)
    // Actually let's use WS X to determine left/right position, and use fixed distance
    const avgWsX = arrangements.reduce((s, a) => s + a.x, 0) / arrangements.length;
    const wsLeftmost = Math.min(...arrangements.map((a) => a.x));
    const wsRightmost = Math.max(...arrangements.map((a) => a.x + widthsCm[mono.findIndex((m) => m.id === a.monitor.id)] * cmToPx));
    const wsTotalWidth = wsRightmost - wsLeftmost;
    const mapXFromSpan = (wsX: number) => {
      if (wsTotalWidth === 0) return HEAD_X;
      const normalized = (wsX - wsLeftmost) / wsTotalWidth; // 0 to 1
      return MARGIN_X + normalized * usableW;
    };

    // Use WS X to determine horizontal positions
    // Sort by WS X and assign left-to-right
    const sorted = [...arrangements].sort((a, b) => a.x - b.x);
    const totalSpanW = usableW * 0.8;
    const spacing = sorted.length > 1 ? totalSpanW / (sorted.length - 1) : 0;
    const startX = (CANVAS_W - (sorted.length - 1) * spacing - totalSpanW) / 2;

    finalPositions = sorted.map((arr, i) => {
      const m = arr.monitor;
      const idx = mono.findIndex((m2) => m2.id === m.id);
      const physW = widthsCm[idx] * cmToPx;
      const physH = heightsCm[idx] * cmToPx;
      const depthCm = EYES_DISTANCE_CM; // fixed distance
      const x = startX + i * spacing;
      // Y based on depth: higher depth = closer to viewer (lower Y in SVG)
      const y = HEAD_Y - depthCm * cmToPx - physH * 0.3;
      return { x, y, w: physW, h: physH, m, isCurved: !!m.curved, depthCm };
    });
  } else {
    // Auto-layout: side by side, centered, largest in middle
    const sorted = [...mono.entries()].sort((a, b) => {
      if (a[1].diagonal === b[1].diagonal) return 0;
      return a[1].diagonal > b[1].diagonal ? -1 : 1;
    });
    const sortedIndices = sorted.map(([i]) => i);

    const positions: { x: number; y: number; w: number; h: number; m: Monitor; isCurved: boolean; depthCm: number }[] = [];
    let offsetX = 0;
    const spacing = 20;

    for (let i = 0; i < sortedIndices.length; i++) {
      const idx = sortedIndices[i];
      const m = mono[idx];
      const w = widthsCm[idx] * cmToPx;
      const h = heightsCm[idx] * cmToPx;
      const depthCm = getViewingDistance(m.diagonal);
      const x = HEAD_X + offsetX - w / 2;
      const y = HEAD_Y - depthCm * cmToPx - h * 0.3;
      positions.push({ x, y, w, h, m, isCurved: !!m.curved, depthCm });
      offsetX += w + spacing;
    }

    // Center the whole group
    const totalW = positions.reduce((s, p) => s + p.w + spacing, -spacing);
    const startXPos = HEAD_X - totalW / 2;
    let currX = startXPos;
    for (let i = 0; i < positions.length; i++) {
      positions[i].x = currX + positions[i].w / 2;
      currX += positions[i].w + spacing;
    }
    finalPositions = positions;
  }

  const viewDistPx = EYES_DISTANCE_CM * cmToPx;
  const headCircleR = 18;

  return (
    <div className="bg-bg-secondary rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-bg-tertiary/50">
        <h3 className="text-[13px] font-semibold text-accent">
          📐 Bird's eye — desk layout
        </h3>
        <p className="text-[9px] text-text-tertiary mt-0.5">
          Head at bottom • Monitors in front • Distance from eyes • Curved = curved edge
        </p>
      </div>

      {/* SVG View */}
      <div className="flex items-center justify-center py-4 px-4">
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="rounded-xl"
          style={{ background: "#1a1a1e" }}
        >
          {/* Desk surface */}
          <rect
            x={40}
            y={HEAD_Y - 10}
            width={CANVAS_W - 80}
            height={CANVAS_H - HEAD_Y - 30}
            fill="#222228"
            rx={4}
          />
          <text
            x={CANVAS_W - 50}
            y={CANVAS_H - 20}
            fill="#3a3a44"
            fontSize={8}
            fontFamily="monospace"
          >
            BIURKO / DESK
          </text>

          {/* Distance guideline from eyes forward */}
          <line
            x1={HEAD_X}
            y1={HEAD_Y - headCircleR}
            x2={HEAD_X}
            y2={HEAD_Y - EYES_DISTANCE_CM * cmToPx - 60}
            stroke="#3a3a44"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Eyes → each monitor dotted line */}
          {finalPositions.map((pos) => {
            const distCm = pos.depthCm;
            const distPx = distCm * cmToPx;
            const midX = pos.x;
            const midY = HEAD_Y - distPx / 2;
            const monitorCenterY = pos.y; // pos.y is the center Y of the monitor in our layout

            return (
              <g key={pos.m.id}>
                {/* Dotted line from eyes to monitor center */}
                <line
                  x1={HEAD_X}
                  y1={HEAD_Y - headCircleR}
                  x2={pos.x}
                  y2={monitorCenterY}
                  stroke="#5a5a6a"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  opacity={0.6}
                />
                {/* Distance label */}
                <text
                  x={HEAD_X + (pos.x - HEAD_X) * 0.3}
                  y={midY}
                  fill="#8a8a9a"
                  fontSize={9}
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity={0.8}
                >
                  {distCm}cm
                </text>
              </g>
            );
          })}

          {/* Head (eyes from above) */}
          <circle
            cx={HEAD_X}
            cy={HEAD_Y}
            r={headCircleR}
            fill="#2a2a32"
            stroke="#4a4a56"
            strokeWidth={2}
          />
          {/* Eyes dots */}
          <circle cx={HEAD_X - 6} cy={HEAD_Y} r={3} fill="#6a6a7a" />
          <circle cx={HEAD_X + 6} cy={HEAD_Y} r={3} fill="#6a6a7a" />
          <text
            x={HEAD_X}
            y={HEAD_Y + headCircleR + 12}
            fill="#5a5a6a"
            fontSize={8}
            fontFamily="monospace"
            textAnchor="middle"
          >
            OCZY / EYES
          </text>

          {/* Monitors */}
          {finalPositions.map((pos, i) => {
            const { x, y, w, h, m, isCurved } = pos;
            const isLeft = i < finalPositions.length / 2;
            const isRight = i > finalPositions.length / 2;

            return (
              <g key={m.id}>
                {/* Monitor stand hint */}
                <rect
                  x={x - 8}
                  y={y + h}
                  width={16}
                  height={6}
                  fill="#2a2a32"
                  rx={2}
                />
                <rect
                  x={x - 20}
                  y={y + h + 4}
                  width={40}
                  height={4}
                  fill="#222228"
                  rx={1}
                />

                {/* Monitor body */}
                {isCurved ? (
                  // Curved monitor — draw with curved right edge (concave)
                  <>
                    <path
                      d={`
                        M ${x - w / 2} ${y - h / 2}
                        L ${x + w / 2 - 15} ${y - h / 2}
                        Q ${x + w / 2 + 10} ${y} ${x + w / 2 - 15} ${y + h / 2}
                        L ${x - w / 2} ${y + h / 2}
                        Z
                      `}
                      fill="#1e1e24"
                      stroke="#3a3a48"
                      strokeWidth={1.5}
                    />
                    {/* Curvature indicator */}
                    <text
                      x={x + w / 2 + 14}
                      y={y + 4}
                      fill="#6a6a7a"
                      fontSize={7}
                      fontFamily="monospace"
                    >
                      {m.curvatureRadius}R
                    </text>
                    <text
                      x={x + w / 2 + 14}
                      y={y + 14}
                      fill="#5a5a6a"
                      fontSize={6}
                      fontFamily="monospace"
                    >
                      CURVED
                    </text>
                  </>
                ) : (
                  // Flat monitor
                  <rect
                    x={x - w / 2}
                    y={y - h / 2}
                    width={w}
                    height={h}
                    fill="#1c1c22"
                    stroke="#3a3a48"
                    strokeWidth={1.5}
                    rx={3}
                  />
                )}

                {/* Monitor label inside */}
                <text
                  x={x}
                  y={y}
                  fill="#5a5a6a"
                  fontSize={Math.max(7, Math.min(11, w / 8))}
                  fontFamily="monospace"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {m.diagonal}"
                </text>
                <text
                  x={x}
                  y={y + 14}
                  fill="#3a3a4a"
                  fontSize={7}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {Math.round(w / cmToPx)}cm × {Math.round(h / cmToPx)}cm
                </text>

                {/* Width indicator line */}
                <line
                  x1={x - w / 2}
                  y1={y - h / 2 - 10}
                  x2={x + w / 2}
                  y2={y - h / 2 - 10}
                  stroke="#5a5a6a"
                  strokeWidth={1}
                />
                <line
                  x1={x - w / 2}
                  y1={y - h / 2 - 13}
                  x2={x - w / 2}
                  y2={y - h / 2 - 7}
                  stroke="#5a5a6a"
                  strokeWidth={1}
                />
                <line
                  x1={x + w / 2}
                  y1={y - h / 2 - 13}
                  x2={x + w / 2}
                  y2={y - h / 2 - 7}
                  stroke="#5a5a6a"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={y - h / 2 - 16}
                  fill="#6a6a7a"
                  fontSize={7}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {Math.round(widthsCm[mono.findIndex((m2) => m2.id === m.id)])}cm
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <text x={55} y={CANVAS_H - 20} fill="#4a4a5a" fontSize={7} fontFamily="monospace">
            Eyes 70cm from desk • Monitors to scale • Distance = 1.3× diagonal
          </text>
        </svg>
      </div>

      {/* Summary cards */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {finalPositions.map((pos) => {
            const m = pos.m;
            const distCm = pos.depthCm;
            const physW = calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
            return (
              <div
                key={m.id}
                className="bg-bg-tertiary/50 rounded-lg px-3 py-2 text-center"
              >
                <div className="text-[10px] font-semibold text-text-primary">
                  {m.diagonal}"
                </div>
                <div className="text-[8px] text-text-tertiary mt-0.5">
                  {Math.round(physW)}cm × {Math.round(calcHeightCm(m.diagonal, m.widthPx, m.heightPx))}cm
                </div>
                <div className="text-[8px] text-accent mt-1">
                  {distCm}cm from eyes
                </div>
                {m.curved && (
                  <div className="text-[7px] text-yellow-500/70 mt-0.5">
                    {m.curvatureRadius}R curved
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

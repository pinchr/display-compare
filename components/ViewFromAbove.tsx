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
const EYES_DISTANCE_CM = 70;  // eyes to desk surface (cm) — default for flat monitors

// Optimal viewing distance based on curvature R value (in mm)
// For curved monitors: optimal distance ≈ curvatureRadius (mm) / 10 = cm
// For flat monitors: distance ≈ 1.3 × diagonal (cm)
// R value = radius of the circle that the curved screen follows
const getOptimalDistance = (m: Monitor) => {
  if (m.curved && m.curvatureRadius) {
    // Optimal distance = R value in cm (screen wraps around the viewer)
    return m.curvatureRadius / 10;
  }
  // Flat monitor: 1.3 × diagonal
  return Math.round(m.diagonal * 1.3);
};

// Distance quality: returns color and label
const getDistanceQuality = (actualDist: number, optimalDist: number): { color: string; label: string } => {
  const ratio = actualDist / optimalDist;
  if (ratio >= 0.85 && ratio <= 1.15) {
    return { color: "#22c55e", label: "optimal" };       // green ±15%
  } else if (ratio >= 0.7 && ratio <= 1.3) {
    return { color: "#eab308", label: "acceptable" };     // yellow ±30%
  } else {
    return { color: "#ef4444", label: "too close/far" }; // red
  }
};

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
  let finalPositions: { x: number; y: number; w: number; h: number; m: Monitor; isCurved: boolean; depthCm: number; optimalDist: number; quality: { color: string; label: string }; rotation: number }[];

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
      const optimalDist = getOptimalDistance(m);
      const depthCm = EYES_DISTANCE_CM; // fixed in arrangements mode
      const quality = getDistanceQuality(depthCm, optimalDist);
      const x = startX + i * spacing;
      // Y based on depth: higher depth = closer to viewer (lower Y in SVG)
      const y = HEAD_Y - depthCm * cmToPx - physH * 0.3;
      // Angle from monitor center to head
      const angleRad = Math.atan2(HEAD_X - x, HEAD_Y - y);
      const rotationDeg = angleRad * (180 / Math.PI) * 0.35;
      return { x, y, w: physW, h: physH, m, isCurved: !!m.curved, depthCm, optimalDist, quality, rotation: rotationDeg };
    });
  } else {
    // Auto-layout: side by side, centered, largest in middle
    const sorted = [...mono].sort((a, b) => {
      if (a.diagonal === b.diagonal) return 0;
      return a.diagonal > b.diagonal ? -1 : 1;
    });

    const positions: { x: number; y: number; w: number; h: number; m: Monitor; isCurved: boolean; depthCm: number; optimalDist: number; quality: { color: string; label: string }; rotation: number }[] = [];
    let offsetX = 0;
    const spacing = 20;

    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      const origIdx = mono.findIndex((x) => x.id === m.id);
      const w = widthsCm[origIdx] * cmToPx;
      const h = heightsCm[origIdx] * cmToPx;
      const optDist = getOptimalDistance(m);
      const depthCm = optDist; // auto-layout places at optimal distance
      const quality = getDistanceQuality(depthCm, optDist);
      const x = HEAD_X + offsetX - w / 2;
      const y = HEAD_Y - depthCm * cmToPx - h * 0.3;
      // Compute angle from monitor center to head, then rotate monitor slightly toward viewer
      // Monitors off to the side are rotated inward (toward center/head)
      const angleRad = Math.atan2(HEAD_X - x, HEAD_Y - y);
      const rotationDeg = angleRad * (180 / Math.PI) * 0.35; // 35% of the angle toward user
      positions.push({ x, y, w, h, m, isCurved: !!m.curved, depthCm, optimalDist: optDist, quality, rotation: rotationDeg });
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
          📐 Bird's eye — desk layout with distance quality
        </h3>
        <p className="text-[9px] text-text-tertiary mt-0.5">
          Head at bottom • Monitors in front • Green = optimal • Top = total width of setup
        </p>
      </div>

      {/* SVG View */}
      <div className="flex items-center justify-center py-4 px-4">
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="rounded-xl overflow-hidden"
          style={{ background: "#1a1a1e", maxWidth: "100%" }}
          clipRule="evenodd"
        >
          <defs>
            <clipPath id="birdEyeClip">
              <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} />
            </clipPath>
          </defs>
          {/* Desk surface — full width to accommodate rotated monitor corners */}
          <rect
            x={10}
            y={HEAD_Y - 10}
            width={CANVAS_W - 20}
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

          {/* Total width of all monitors combined */}
          {(() => {
            const totalPhysWidth = widthsCm.reduce((a, b) => a + b, 0);
            const totalPx = totalPhysWidth * cmToPx;
            const leftmost = Math.min(...finalPositions.map((p) => p.x - p.w / 2));
            const rightmost = Math.max(...finalPositions.map((p) => p.x + p.w / 2));
            const topY = HEAD_Y - EYES_DISTANCE_CM * cmToPx - Math.max(...heightsCm) * cmToPx - 40;
            return (
              <g>
                {/* Horizontal line showing total width */}
                <line
                  x1={leftmost - 10}
                  y1={topY}
                  x2={rightmost + 10}
                  y2={topY}
                  stroke="#5a5a6a"
                  strokeWidth={1}
                />
                {/* End ticks */}
                <line x1={leftmost - 10} y1={topY - 4} x2={leftmost - 10} y2={topY + 4} stroke="#5a5a6a" strokeWidth={1} />
                <line x1={rightmost + 10} y1={topY - 4} x2={rightmost + 10} y2={topY + 4} stroke="#5a5a6a" strokeWidth={1} />
                {/* Label */}
                <text
                  x={(leftmost + rightmost) / 2}
                  y={topY - 8}
                  fill="#8a8a9a"
                  fontSize={9}
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {totalPhysWidth.toFixed(1)}cm total width
                </text>
              </g>
            );
          })()}

          {/* Eyes → each monitor dotted line */}
          {finalPositions.map((pos) => {
            const distCm = pos.optimalDist;
            const distPx = distCm * cmToPx;
            const midX = pos.x;
            const midY = HEAD_Y - distPx / 2;
            const monitorCenterY = pos.y; // pos.y is the center Y of the monitor in our layout

            return (
              <g key={pos.m.id}>
                {/* Dotted line from eyes to monitor — colored by distance quality */}
                <line
                  x1={HEAD_X}
                  y1={HEAD_Y - headCircleR}
                  x2={pos.x}
                  y2={monitorCenterY}
                  stroke={pos.quality.color}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  opacity={0.75}
                />
                {/* Distance label with quality color */}
                <text
                  x={HEAD_X + (pos.x - HEAD_X) * 0.3}
                  y={midY}
                  fill={pos.quality.color}
                  fontSize={9}
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {distCm}cm
                  {pos.m.curved && ` (${pos.m.curvatureRadius}R)`}
                </text>
                {/* Quality indicator dot at monitor end */}
                <circle
                  cx={pos.x}
                  cy={monitorCenterY}
                  r={4}
                  fill={pos.quality.color}
                  opacity={0.8}
                />
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
                  // Curved monitor — wrapped in rotation group
                  <g transform={`rotate(${pos.rotation}, ${x}, ${y})`}>
                    {(() => {
                      const r = m.curvatureRadius || 1000; // mm
                      const wCm = widthsCm[mono.findIndex((m2) => m2.id === m.id)];
                      const bow = (wCm * wCm) / (8 * (r / 10)); // bow in cm
                      const bowPx = bow * cmToPx;
                      const bowOffset = bowPx * 0.3; // scale down for visibility
                      const x1 = x - w / 2;
                      const x2 = x + w / 2;
                      const y1 = y - h / 2;
                      const y2 = y + h / 2;
                      const midX = x;
                      const curveOffset = bowOffset;
                      return (
                        <>
                          <path
                            d={`
                              M ${x1} ${y1}
                              Q ${midX} ${y1 - curveOffset} ${x2} ${y1}
                              L ${x2} ${y2}
                              Q ${midX} ${y2 + curveOffset} ${x1} ${y2}
                              Z
                            `}
                            fill="#1e1e24"
                            stroke="#3a3a48"
                            strokeWidth={1.5}
                          />
                          <path
                            d={`M ${x1} ${y} Q ${midX} ${y + curveOffset * 2} ${x2} ${y}`}
                            fill="none"
                            stroke="#5a5a6a"
                            strokeWidth={1}
                            strokeDasharray="3 2"
                            opacity={0.6}
                          />
                          <text x={x + w / 2 + 10} y={y - 4} fill="#6a6a7a" fontSize={7} fontFamily="monospace">
                            {m.curvatureRadius}R
                          </text>
                          <text x={x + w / 2 + 10} y={y + 6} fill="#5a5a6a" fontSize={6} fontFamily="monospace">
                            {m.curvatureType}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                ) : (
                  // Flat monitor — rotated toward viewer
                  <g transform={`rotate(${pos.rotation}, ${x}, ${y})`}>
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
                  </g>
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

                {/* Width indicator line — stays within monitor bounds */}
                <text
                  x={x}
                  y={y - h / 2 - 4}
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

          {/* Legend with distance quality colors */}
          <rect x={55} y={CANVAS_H - 18} width={8} height={8} fill="#22c55e" rx={2} />
          <text x={67} y={CANVAS_H - 12} fill="#4a4a5a" fontSize={7} fontFamily="monospace">optimal</text>
          <rect x={120} y={CANVAS_H - 18} width={8} height={8} fill="#eab308" rx={2} />
          <text x={132} y={CANVAS_H - 12} fill="#4a4a5a" fontSize={7} fontFamily="monospace">acceptable</text>
          <rect x={210} y={CANVAS_H - 18} width={8} height={8} fill="#ef4444" rx={2} />
          <text x={222} y={CANVAS_H - 12} fill="#4a4a5a" fontSize={7} fontFamily="monospace">too close/far</text>
          <text x={55} y={CANVAS_H - 26} fill="#4a4a5a" fontSize={7} fontFamily="monospace">
            Distance = curvature R for curved monitors, 1.3× diagonal for flat • X = R value in mm (radius of curve)
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
                <div className="text-[8px] mt-1 font-semibold" style={{ color: pos.quality.color }}>
                  {pos.optimalDist}cm from eyes
                </div>
                <div className="text-[7px] text-text-tertiary mt-0.5">
                  optimal: {pos.optimalDist}cm
                </div>
                {m.curved && (
                  <div className="text-[7px] text-yellow-500/70 mt-0.5">
                    {m.curvatureRadius}R {m.curvatureType}
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

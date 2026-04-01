"use client";

import { Monitor } from "@/lib/monitors/types";
import {
  calcWidthCm,
  calcHeightCm,
  calcPPI,
  getAspectRatio,
  getSurfaceArea,
  formatResolution,
} from "@/lib/monitors/calculations";

interface SpecTableProps {
  monitors: Monitor[];
}

export default function SpecTable({ monitors }: SpecTableProps) {
  if (monitors.length < 2) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm">
        Select at least 2 monitors to compare specifications
      </div>
    );
  }

  const specs = [
    {
      label: "Diagonal",
      getValue: (m: Monitor) => `${m.diagonal}"`,
      getNum: (m: Monitor) => m.diagonal,
      higherIsBetter: true,
    },
    {
      label: "Resolution",
      getValue: (m: Monitor) => formatResolution(m.widthPx, m.heightPx),
      getNum: (m: Monitor) => m.widthPx * m.heightPx,
      higherIsBetter: true,
    },
    {
      label: "Aspect ratio",
      getValue: (m: Monitor) => getAspectRatio(m.widthPx, m.heightPx),
      getNum: (m: Monitor) => m.widthPx / m.heightPx,
      higherIsBetter: null,
    },
    {
      label: "Width",
      getValue: (m: Monitor) => `${calcWidthCm(m.diagonal, m.widthPx, m.heightPx).toFixed(1)} cm`,
      getNum: (m: Monitor) => calcWidthCm(m.diagonal, m.widthPx, m.heightPx),
      higherIsBetter: true,
    },
    {
      label: "Height",
      getValue: (m: Monitor) => `${calcHeightCm(m.diagonal, m.widthPx, m.heightPx).toFixed(1)} cm`,
      getNum: (m: Monitor) => calcHeightCm(m.diagonal, m.widthPx, m.heightPx),
      higherIsBetter: true,
    },
    {
      label: "Surface area",
      getValue: (m: Monitor) => `${getSurfaceArea(m.diagonal, m.widthPx, m.heightPx).toFixed(0)} cm²`,
      getNum: (m: Monitor) => getSurfaceArea(m.diagonal, m.widthPx, m.heightPx),
      higherIsBetter: true,
    },
    {
      label: "PPI",
      getValue: (m: Monitor) => `${calcPPI(m.widthPx, m.heightPx, m.diagonal).toFixed(0)}`,
      getNum: (m: Monitor) => calcPPI(m.widthPx, m.heightPx, m.diagonal),
      higherIsBetter: true,
    },
    {
      label: "Panel type",
      getValue: (m: Monitor) => m.panelType || "—",
      getNum: () => 0,
      higherIsBetter: null,
    },
    {
      label: "Refresh rate",
      getValue: (m: Monitor) => (m.refreshRate ? `${m.refreshRate} Hz` : "—"),
      getNum: (m: Monitor) => m.refreshRate || 0,
      higherIsBetter: true,
    },
    {
      label: "Response time",
      getValue: (m: Monitor) => (m.responseTime ? `${m.responseTime} ms` : "—"),
      getNum: (m: Monitor) => m.responseTime || 999,
      higherIsBetter: false,
    },
    {
      label: "Brightness",
      getValue: (m: Monitor) => (m.brightness ? `${m.brightness} cd/m²` : "—"),
      getNum: (m: Monitor) => m.brightness || 0,
      higherIsBetter: true,
    },
    {
      label: "Contrast",
      getValue: (m: Monitor) => m.contrast || "—",
      getNum: () => 0,
      higherIsBetter: null,
    },
    {
      label: "Curvature",
      getValue: (m: Monitor) => m.curved ? `${m.curvatureRadius}R ${m.curvatureType === "concave" ? "concave" : "convex"}` : "Flat",
      getNum: (m: Monitor) => m.curved ? m.curvatureRadius || 1000 : 0,
      higherIsBetter: null,
    },
  ];

  const getBestValue = (spec: (typeof specs)[0], monitors: Monitor[]) => {
    const nums = monitors
      .map((m) => spec.getNum(m))
      .filter((n) => n > 0 || spec.label === "Proporcje");
    if (nums.length < 2) return null;

    if (spec.higherIsBetter === null) return null;
    if (spec.higherIsBetter) {
      return Math.max(...nums);
    } else {
      return Math.min(...nums);
    }
  };

  // Only show curvature row if at least one monitor has curved data
  const hasAnyCurved = monitors.some((m) => m.curved);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        Specification comparison
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-text-tertiary font-medium">Specyfikacja</th>
              {monitors.map((m, idx) => (
                <th
                  key={m.id}
                  className="text-center py-2 px-3 text-text-secondary font-medium min-w-[100px]"
                >
                  <div>
                    <span className="text-accent text-[10px]">#{idx + 1}</span>
                    <br />
                    {m.diagonal}&quot; {m.brand}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.filter((s) => s.label !== "Zakrzywienie" || hasAnyCurved).map((spec) => {
              const best = getBestValue(spec, monitors);

              return (
                <tr key={spec.label} className="border-b border-border/50 hover:bg-bg-tertiary/30">
                  <td className="py-2 pr-4 text-text-tertiary">{spec.label}</td>
                  {monitors.map((m) => {
                    const val = spec.getValue(m);
                    const num = spec.getNum(m);
                    const isBest = best !== null && best === num;
                    const isWorst =
                      best !== null &&
                      spec.higherIsBetter !== null &&
                      !isBest &&
                      num > 0;

                    return (
                      <td
                        key={m.id}
                        className={`
                          py-2 px-3 text-center font-mono
                          ${isBest && spec.higherIsBetter !== null ? "text-success font-bold" : ""}
                          ${isWorst ? "text-red-400" : "text-text-primary"}
                        `}
                      >
                        {val}
                        {isBest && spec.higherIsBetter !== null && (
                          <span className="ml-1 text-[8px]">✓</span>
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
  );
}

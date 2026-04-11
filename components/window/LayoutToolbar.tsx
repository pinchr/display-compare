"use client";

import { useState, useCallback } from "react";
import { Monitor } from "@/lib/monitors/types";
import { calculatePPI, calculatePhysicalDimensions } from "@/lib/window/dpi";
import { LayoutMode, calculateLayout } from "@/lib/window/layout";

interface LayoutToolbarProps {
  monitors: Monitor[];
  onLayoutChange: (positions: Array<{ monitorId: string; x: number; y: number }>) => void;
}

export default function LayoutToolbar({ monitors, onLayoutChange }: LayoutToolbarProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal');

  const handleLayoutClick = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    
    // Calculate positions for each monitor
    const monitorDims = monitors.map((m) => {
      const dims = calculatePhysicalDimensions(m);
      return {
        id: m.id,
        widthMm: dims.widthMm,
        heightMm: dims.heightMm,
      };
    });

    const positions = calculateLayout(monitorDims, mode);
    
    // Convert mm to canvas pixels (scale: 1mm = 1.5px)
    const scale = 1.5;
    onLayoutChange(
      positions.map((p) => ({
        monitorId: p.monitorId,
        x: p.x * scale,
        y: p.y * scale,
      }))
    );
  }, [monitors, onLayoutChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-tertiary">Arrange:</span>
      
      <div className="flex gap-1">
        <button
          onClick={() => handleLayoutClick('horizontal')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            layoutMode === 'horizontal'
              ? 'bg-accent text-black'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
          }`}
          title="Side by side"
        >
          ⬌ Horizontal
        </button>
        
        <button
          onClick={() => handleLayoutClick('vertical')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            layoutMode === 'vertical'
              ? 'bg-accent text-black'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
          }`}
          title="Stacked vertically"
        >
          ⬍ Vertical
        </button>
        
        <button
          onClick={() => handleLayoutClick('stacked')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            layoutMode === 'stacked'
              ? 'bg-accent text-black'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
          }`}
          title="Overlapping"
        >
          ⬳ Stacked
        </button>
        
        <button
          onClick={() => handleLayoutClick('free')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            layoutMode === 'free'
              ? 'bg-accent text-black'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
          }`}
          title="Free placement"
        >
          ✥ Free
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      <span className="text-xs text-text-tertiary">
        {monitors.length} monitor{monitors.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

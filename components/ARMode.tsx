"use client";

import { useState, useCallback } from "react";

interface ARPlaceableMonitor {
  id: string;
  widthM: number;
  heightM: number;
  depthM: number;
  color: string;
}

interface ARModeProps {
  monitors: ARPlaceableMonitor[];
  onPlace?: (position: [number, number, number], rotation: number) => void;
  onClose?: () => void;
}

// Scale: 1 pixel = 1 centimeter (for realism)
const CM_TO_PX = 1;

export default function ARMode({ monitors, onClose }: ARModeProps) {
  const [placedMonitors, setPlacedMonitors] = useState<Array<{
    monitor: ARPlaceableMonitor;
    x: number; // px from center
    y: number; // px from center
  }>>([]);

  const handleTapToPlace = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const x = clickX - centerX;
    const y = clickY - centerY;
    
    if (monitors.length > placedMonitors.length) {
      const monitor = monitors[placedMonitors.length];
      setPlacedMonitors(prev => [...prev, { monitor, x, y }]);
    }
  }, [monitors, placedMonitors.length]);

  const handleClearAll = useCallback(() => {
    setPlacedMonitors([]);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* AR View - tap to place monitors in real scale */}
      <div 
        className="flex-1 relative overflow-hidden select-none"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
          cursor: 'crosshair'
        }}
        onClick={handleTapToPlace}
      >
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Depth perspective lines (vanishing point) */}
        <div 
          className="absolute pointer-events-none"
          style={{
            left: '50%', top: '30%',
            width: '1px', height: '70%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
          }}
        />

        {/* Instruction */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-lg text-white text-sm">
          👆 Tap anywhere to place monitors in real scale (1cm = 1px)
        </div>

        {/* Placed monitors in REAL scale */}
        {placedMonitors.map((pm, i) => {
          const wPx = Math.round(pm.monitor.widthM * 100); // 1m = 100px
          const hPx = Math.round(pm.monitor.heightM * 100);
          return (
            <div
              key={`placed-${pm.monitor.id}-${i}`}
              className="absolute"
              style={{
                left: `calc(50% + ${pm.x}px)`,
                top: `calc(50% + ${pm.y}px)`,
                transform: 'translate(-50%, -50%)',
                width: wPx,
                height: hPx,
                backgroundColor: pm.monitor.color,
                border: '2px solid #555',
                borderRadius: '3px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="text-center text-white/70 text-[8px] font-mono leading-tight p-1">
                <div className="font-bold">{pm.monitor.id}</div>
                <div>{(pm.monitor.widthM * 100).toFixed(0)}cm</div>
                <div>×</div>
                <div>{(pm.monitor.heightM * 100).toFixed(0)}cm</div>
              </div>
            </div>
          );
        })}

        {/* Clear button */}
        {placedMonitors.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
            className="absolute top-4 right-4 bg-red-500/80 backdrop-blur px-4 py-2 rounded-lg text-white text-sm hover:bg-red-600"
          >
            🗑️ Clear all
          </button>
        )}

        {/* Monitor count indicator */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-2 rounded-lg text-white text-xs font-mono">
          {placedMonitors.length} / {monitors.length} placed
          {placedMonitors.length === monitors.length && monitors.length > 0 && (
            <span className="ml-2 text-green-400">✓ All placed</span>
          )}
        </div>

        {/* Measurement reference (10cm bar) */}
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-2 rounded-lg text-white text-xs">
          <div className="w-[100px] h-[2px] bg-white mb-1 relative">
            <div className="absolute -left-1 -bottom-1 w-[2px] h-[4px] bg-white"/>
            <div className="absolute -right-1 -bottom-1 w-[2px] h-[4px] bg-white"/>
          </div>
          <div className="text-center">10 cm</div>
        </div>
      </div>
      
      {/* Controls panel */}
      <div className="bg-zinc-900 p-5 flex flex-col gap-4">
        {/* Monitor list */}
        <div className="flex flex-wrap gap-3 justify-center">
          {monitors.map((m) => (
            <div 
              key={m.id}
              className="bg-zinc-800 px-3 py-2 rounded-lg text-white text-xs"
            >
              <span className="font-medium">{m.id}</span>
              <span className="text-zinc-400 ml-2">
                {(m.widthM * 100).toFixed(0)}×{(m.heightM * 100).toFixed(0)}cm
              </span>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="text-center text-zinc-500 text-xs">
          {placedMonitors.length === 0 
            ? `Tap on the screen to place "${monitors[0]?.id}" in real size`
            : `${monitors.length - placedMonitors.length} monitor(s) remaining to place`}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all text-sm"
        >
          ← Wróć do porównania
        </button>
      </div>
    </div>
  );
}

export function monitorToARModel(
  id: string,
  widthCm: number,
  heightCm: number,
  color = "#1a1a1a"
): ARPlaceableMonitor {
  return {
    id,
    widthM: widthCm / 100,
    heightM: heightCm / 100,
    depthM: 0.02,
    color
  };
}
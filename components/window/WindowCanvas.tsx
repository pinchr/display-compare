"use client";

import { useState, useRef, useCallback } from "react";
import { Monitor } from "@/lib/monitors/types";
import {
  calculatePPI,
  calculatePhysicalDimensions,
  calculateScaleFactor,
  calculateScaledWindowDimensions,
} from "@/lib/window/dpi";
import html2canvas from "html2canvas";

// Inline app presets (to fix import issue)
const APP_PRESETS = [
  { id: 'vscode', name: 'VS Code', baseWidthPx: 1200, baseHeightPx: 800, minFontPx: 12, maxFontPx: 18, icon: '📝', category: 'development' },
  { id: 'chrome', name: 'Chrome', baseWidthPx: 1280, baseHeightPx: 720, minFontPx: 12, maxFontPx: 16, icon: '🌐', category: 'browser' },
  { id: 'terminal', name: 'Terminal', baseWidthPx: 800, baseHeightPx: 500, minFontPx: 11, maxFontPx: 14, icon: '💻', category: 'system' },
  { id: 'slack', name: 'Slack', baseWidthPx: 1000, baseHeightPx: 700, minFontPx: 12, maxFontPx: 16, icon: '💬', category: 'communication' },
  { id: 'figma', name: 'Figma', baseWidthPx: 1400, baseHeightPx: 900, minFontPx: 11, maxFontPx: 14, icon: '🎨', category: 'design' },
  { id: 'finder', name: 'Finder', baseWidthPx: 900, baseHeightPx: 600, minFontPx: 12, maxFontPx: 16, icon: '📁', category: 'productivity' },
];

type AppPreset = typeof APP_PRESETS[number];

export interface SimulatedWindow {
  id: string;
  app: AppPreset;
  x: number;
  y: number;
  width: number;
  height: number;
  monitorId: string;
  fontSize: number;
}

interface WindowCanvasProps {
  monitors: Monitor[];
  windows: SimulatedWindow[];
  onWindowsChange: (windows: SimulatedWindow[]) => void;
  // Optional external positions (from layout toolbar)
  layoutPositions?: Array<{ monitorId: string; x: number; y: number }>;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const BEZEL_MM = 5; // 5mm bezel gap between monitors

// Generate unique window ID
function generateWindowId(): string {
  return `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function WindowCanvas({
  monitors,
  windows,
  onWindowsChange,
  layoutPositions: externalPositions,
}: WindowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredMonitor, setHoveredMonitor] = useState<string | null>(null);

  // Calculate monitor positions in canvas
  const getMonitorPositions = useCallback(() => {
    if (monitors.length === 0) return [];

    const positions: Array<{
      monitor: Monitor;
      x: number;
      y: number;
      width: number;
      height: number;
      ppi: number;
    }> = [];

    // If external positions are provided, use them
    if (externalPositions && externalPositions.length > 0) {
      monitors.forEach((monitor, index) => {
        const dims = calculatePhysicalDimensions(monitor);
        const ppi = calculatePPI({
          diagonal: monitor.diagonal,
          widthPx: monitor.widthPx,
          heightPx: monitor.heightPx,
        });
        
        const scale = 1.5;
        const extPos = externalPositions.find(p => p.monitorId === monitor.id);
        
        positions.push({
          monitor,
          x: extPos?.x ?? (index * 350 + 50),
          y: extPos?.y ?? 50,
          width: dims.widthMm * scale,
          height: dims.heightMm * scale,
          ppi,
        });
      });
      return positions;
    }

    // Default: arrange monitors horizontally with bezel gap
    let currentX = 50;

    monitors.forEach((monitor) => {
      const dims = calculatePhysicalDimensions(monitor);
      const ppi = calculatePPI({
        diagonal: monitor.diagonal,
        widthPx: monitor.widthPx,
        heightPx: monitor.heightPx,
      });

      // Scale to canvas (1mm = 1.5px for display)
      const scale = 1.5;
      const width = dims.widthMm * scale;
      const height = dims.heightMm * scale;

      positions.push({
        monitor,
        x: currentX,
        y: 50,
        width,
        height,
        ppi,
      });

      currentX += width + BEZEL_MM * scale;
    });

    return positions;
  }, [monitors, externalPositions]);

  const monitorPositions = getMonitorPositions();

  // Find which monitor a window is on
  const getWindowMonitor = useCallback(
    (window: SimulatedWindow) => {
      const centerX = window.x + window.width / 2;
      const centerY = window.y + window.height / 2;

      for (const pos of monitorPositions) {
        if (
          centerX >= pos.x &&
          centerX <= pos.x + pos.width &&
          centerY >= pos.y &&
          centerY <= pos.y + pos.height
        ) {
          return pos;
        }
      }
      return monitorPositions[0];
    },
    [monitorPositions]
  );

  // Handle adding a new window
  const handleAddWindow = useCallback(
    (app: AppPreset) => {
      // Place on first monitor
      const targetMonitor = monitorPositions[0];
      if (!targetMonitor) return;

      const newWindow: SimulatedWindow = {
        id: generateWindowId(),
        app,
        x: targetMonitor.x + 20,
        y: targetMonitor.y + 20,
        width: app.baseWidthPx,
        height: app.baseHeightPx,
        monitorId: targetMonitor.monitor.id,
        fontSize: 14,
      };

      // Scale window to fit monitor PPI
      const refPPI = 96; // Reference DPI
      const scale = calculateScaleFactor(refPPI, targetMonitor.ppi);
      const scaled = calculateScaledWindowDimensions(
        newWindow.width,
        newWindow.height,
        scale
      );
      newWindow.width = scaled.scaledWidth;
      newWindow.height = scaled.scaledHeight;

      onWindowsChange([...windows, newWindow]);
    },
    [monitorPositions, windows, onWindowsChange]
  );

  // Handle window drag start
  const handleDragStart = useCallback(
    (windowId: string, e: React.MouseEvent) => {
      const window = windows.find((w) => w.id === windowId);
      if (!window) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setDraggedWindow(windowId);
    },
    [windows]
  );

  // Handle window drag
  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedWindow || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - dragOffset.x;
      const newY = mouseY - dragOffset.y;

      // Find which monitor we're over
      let targetMonitor = monitorPositions[0];
      for (const pos of monitorPositions) {
        if (
          mouseX >= pos.x &&
          mouseX <= pos.x + pos.width &&
          mouseY >= pos.y &&
          mouseY <= pos.y + pos.height
        ) {
          targetMonitor = pos;
          break;
        }
      }

      setHoveredMonitor(targetMonitor.monitor.id);

      // Check if we're crossing to a different PPI monitor
      const currentWindow = windows.find((w) => w.id === draggedWindow);
      if (currentWindow && currentWindow.monitorId !== targetMonitor.monitor.id) {
        // Scale window for new PPI
        const sourcePos = monitorPositions.find(
          (p) => p.monitor.id === currentWindow.monitorId
        );
        const targetPPI = targetMonitor.ppi;
        const sourcePPI = sourcePos?.ppi || targetPPI;

        const scale = calculateScaleFactor(sourcePPI, targetPPI);
        const scaled = calculateScaledWindowDimensions(
          currentWindow.app.baseWidthPx,
          currentWindow.app.baseHeightPx,
          scale
        );

        onWindowsChange(
          windows.map((w) =>
            w.id === draggedWindow
              ? {
                  ...w,
                  x: newX,
                  y: newY,
                  width: scaled.scaledWidth,
                  height: scaled.scaledHeight,
                  monitorId: targetMonitor.monitor.id,
                  fontSize: Math.round(14 * scale),
                }
              : w
          )
        );
      } else {
        // Same monitor - just move
        onWindowsChange(
          windows.map((w) =>
            w.id === draggedWindow ? { ...w, x: newX, y: newY } : w
          )
        );
      }
    },
    [draggedWindow, dragOffset, monitorPositions, windows, onWindowsChange]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedWindow(null);
    setHoveredMonitor(null);
  }, []);

  // Remove window
  const handleRemoveWindow = useCallback(
    (windowId: string) => {
      onWindowsChange(windows.filter((w) => w.id !== windowId));
    },
    [windows, onWindowsChange]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            {windows.length} window{windows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Add window buttons */}
        <div className="flex items-center gap-2">
          {["vscode", "chrome", "terminal", "slack"].map((appId) => {
            const app = APP_PRESETS.find((a) => a.id === appId);
            if (!app) return null;
            return (
              <button
                key={app.id}
                onClick={() => handleAddWindow(app)}
                className="px-2 py-1 text-xs bg-bg-tertiary hover:bg-border rounded flex items-center gap-1"
              >
                <span>{app.icon}</span>
                <span>{app.name}</span>
              </button>
            );
          })}
          <button
            onClick={() => {
              const app = APP_PRESETS[0];
              if (app) handleAddWindow(app);
            }}
            className="px-2 py-1 text-xs bg-accent/20 text-accent hover:bg-accent/30 rounded"
          >
            + More
          </button>
          <button
            onClick={async () => {
              if (!canvasRef.current) return;
              try {
                const canvas = await html2canvas(canvasRef.current);
                const link = document.createElement('a');
                link.download = 'monitor-layout.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
              } catch (err) {
                console.error('Export failed:', err);
              }
            }}
            className="px-2 py-1 text-xs bg-bg-tertiary hover:bg-border rounded flex items-center gap-1"
            title="Export as PNG"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-bg-tertiary rounded-xl border border-border overflow-hidden"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Monitor backgrounds */}
        {monitorPositions.map((pos) => (
          <div
            key={pos.monitor.id}
            className={`absolute rounded-lg border-2 transition-colors ${
              hoveredMonitor === pos.monitor.id
                ? "border-accent"
                : "border-border"
            }`}
            style={{
              left: pos.x,
              top: pos.y,
              width: pos.width,
              height: pos.height,
              background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
            }}
          >
            {/* Monitor info overlay */}
            <div className="absolute -top-6 left-0 text-[10px] text-text-tertiary whitespace-nowrap">
              {pos.monitor.name} ({pos.ppi.toFixed(0)} PPI)
            </div>
          </div>
        ))}

        {/* Windows */}
        {windows.map((window) => {
          const isDragging = draggedWindow === window.id;
          return (
            <div
              key={window.id}
              className={`absolute bg-bg-secondary rounded-lg border shadow-lg cursor-move select-none ${
                isDragging ? "border-accent ring-2 ring-accent/30" : "border-border"
              }`}
              style={{
                left: window.x,
                top: window.y,
                width: Math.min(window.width, 200),
                height: Math.min(window.height, 150),
              }}
              onMouseDown={(e) => handleDragStart(window.id, e)}
            >
              {/* Window title bar */}
              <div className="h-6 bg-bg-primary rounded-t-lg flex items-center justify-between px-2 border-b border-border">
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <span>{window.app.icon}</span>
                  <span className="truncate max-w-[100px]">{window.app.name}</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveWindow(window.id);
                  }}
                  className="w-4 h-4 rounded hover:bg-red-500/20 flex items-center justify-center text-[10px] text-text-tertiary hover:text-red-400"
                >
                  ×
                </button>
              </div>

              {/* Window content preview */}
              <div
                className="p-2 overflow-hidden"
                style={{ fontSize: `${window.fontSize}px` }}
              >
                <div className="text-[8px] text-text-tertiary">
                  {window.app.baseWidthPx}×{window.app.baseHeightPx}px
                  <br />
                  Font: {window.fontSize}px
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {windows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-sm">
            Click an app button to add a window
          </div>
        )}
      </div>

      {/* Scale info */}
      {windows.length > 0 && (
        <div className="text-xs text-text-tertiary space-y-1">
          <p>
            <strong>Scale Reference:</strong> Windows scale based on target
            monitor PPI. Drag a window to a different monitor to see the
            difference.
          </p>
          <div className="flex gap-4">
            {monitorPositions.slice(0, 3).map((pos) => (
              <div key={pos.monitor.id}>
                {pos.monitor.name}: {pos.ppi.toFixed(0)} PPI
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

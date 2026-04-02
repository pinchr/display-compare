"use client";

import { useState, useMemo } from "react";
import { Monitor } from "@/lib/monitors/types";
import { PRESET_MONITORS } from "@/lib/monitors/presets";
import PresetBar from "@/components/PresetBar";
import Workspace from "@/components/Workspace";
import LayoutGrid from "@/components/LayoutGrid";
import SpecTable from "@/components/SpecTable";
import DeskView from "@/components/DeskView";

const MAX_MONITORS = 6;
const MAX_SIMULATOR_MONITORS = 3;

// Shared arrangement type — WorkspaceSimulator reports positions, ViewFromAbove reads them
export interface MonitorArrangement {
  monitor: Monitor;
  x: number;  // canvas px in WS coordinate space (1200-wide canvas)
  y: number;  // canvas px
  scale: number;
}

export default function Home() {
  // Default: first two monitors from presets (Apple Studio + LG OLED)
  const [selectedMonitors, setSelectedMonitors] = useState<Monitor[]>(
    [PRESET_MONITORS[0], PRESET_MONITORS[1]].filter(Boolean)
  );
  const [layoutWindows, setLayoutWindows] = useState<2 | 3 | 4 | 6>(2);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // Shared arrangement state — updated by WorkspaceSimulator, read by ViewFromAbove
  const [arrangements, setArrangements] = useState<MonitorArrangement[]>([]);
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return PRESET_MONITORS.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleToggleMonitor = (monitor: Monitor) => {
    setSelectedMonitors((prev) => {
      const exists = prev.find((m) => m.id === monitor.id);
      if (exists) {
        return prev.filter((m) => m.id !== monitor.id);
      }
      if (prev.length >= MAX_MONITORS) {
        return prev;
      }
      return [...prev, monitor];
    });
    // Reset arrangement when monitors change
    setArrangements([]);
  };

  const handleRemoveMonitor = (id: string) => {
    setSelectedMonitors((prev) => prev.filter((m) => m.id !== id));
    setArrangements((prev) => prev.filter((a) => a.monitor.id !== id));
  };

  const handleArrangementsChange = (newArrangements: MonitorArrangement[]) => {
    setArrangements(newArrangements);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🖥️</div>
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">
                display-compare
              </h1>
              <p className="text-[10px] text-text-tertiary">
                Compare monitors in seconds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedMonitors.length > 0 && (
              <span className="text-xs text-text-tertiary">
                {selectedMonitors.length}/{MAX_MONITORS} selected
              </span>
            )}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Monitor Search */}
        <section>
          <div className="relative">
            <input
              type="text"
              placeholder="Search monitors (e.g. '27 QHD' or 'Samsung 32')..."
              className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(e.target.value.length > 0);
              }}
              onFocus={() => setSearchOpen(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                {searchResults.slice(0, 10).map((m) => (
                  <button
                    key={m.id}
                    className="w-full px-4 py-2 text-left hover:bg-bg-tertiary flex items-center justify-between"
                    onMouseDown={() => {
                      handleToggleMonitor(m);
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <span className="text-text-primary text-sm">{m.name}</span>
                    <span className="text-text-tertiary text-xs">{m.brand}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Preset bar */}
        <section>
          <PresetBar
            selectedMonitors={selectedMonitors}
            onToggle={handleToggleMonitor}
            maxSelect={MAX_MONITORS}
          />
        </section>

        {/* Workspace — selected monitors visualization */}
        {selectedMonitors.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <Workspace
              monitors={selectedMonitors}
              onRemove={handleRemoveMonitor}
              onHighlight={setHighlightedId}
              highlightedId={highlightedId}
            />
          </section>
        )}

        {/* Desk View - Workspace Simulator + Bird's Eye, synced in real-time */}
        {selectedMonitors.length >= 2 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <DeskView
              monitors={selectedMonitors}
              arrangements={arrangements}
              onArrangementsChange={handleArrangementsChange}
            />
          </section>
        )}

        {/* Layout comparison (equal divisions) */}
        {selectedMonitors.length >= 1 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <div className="rounded-2xl border border-border bg-bg-secondary p-6">
              <LayoutGrid
                monitors={selectedMonitors}
                selectedLayout={layoutWindows}
                onLayoutChange={setLayoutWindows}
              />
            </div>
          </section>
        )}

        {/* Spec table */}
        {selectedMonitors.length >= 1 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            <div className="rounded-2xl border border-border bg-bg-secondary p-6">
              <SpecTable monitors={selectedMonitors} />
            </div>
          </section>
        )}

        {/* Footer info */}
        <footer className="text-center py-8 text-text-tertiary text-xs space-y-1">
          <p>Compare any monitors — from 15&quot; laptop to 49&quot; super ultrawide</p>
          <p>Dane poglądowe. Rzeczywiste wymiary mogą się różnić.</p>
        </footer>
      </div>
    </main>
  );
}

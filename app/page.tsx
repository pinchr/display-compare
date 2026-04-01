"use client";

import { useState } from "react";
import { Monitor } from "@/lib/monitors/types";
import PresetBar from "@/components/PresetBar";
import Workspace from "@/components/Workspace";
import OverlayCanvas from "@/components/OverlayCanvas";
import LayoutGrid from "@/components/LayoutGrid";
import SpecTable from "@/components/SpecTable";
import WorkspaceSimulator from "@/components/workspace/WorkspaceSimulator";

const MAX_MONITORS = 6;
const MAX_SIMULATOR_MONITORS = 3;

export default function Home() {
  const [selectedMonitors, setSelectedMonitors] = useState<Monitor[]>([]);
  const [layoutWindows, setLayoutWindows] = useState<2 | 3 | 4 | 6>(2);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

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
  };

  const handleRemoveMonitor = (id: string) => {
    setSelectedMonitors((prev) => prev.filter((m) => m.id !== id));
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
                Porównaj monitory w sekundach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedMonitors.length > 0 && (
              <span className="text-xs text-text-tertiary">
                {selectedMonitors.length}/{MAX_MONITORS} wybrane
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
        {/* Preset bar */}
        <section>
          <PresetBar
            selectedMonitors={selectedMonitors}
            onToggle={handleToggleMonitor}
            maxSelect={MAX_MONITORS}
          />
        </section>

        {/* Workspace */}
        {selectedMonitors.length > 0 && (
          <section className="animate-fade-in-up">
            <Workspace
              monitors={selectedMonitors}
              onRemove={handleRemoveMonitor}
              onHighlight={setHighlightedId}
              highlightedId={highlightedId}
            />
          </section>
        )}

        {/* Layout comparison (equal divisions) */}
        {selectedMonitors.length >= 2 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <div className="rounded-2xl border border-border bg-bg-secondary p-6">
              <LayoutGrid
                monitors={selectedMonitors}
                selectedLayout={layoutWindows}
                onLayoutChange={setLayoutWindows}
              />
            </div>
          </section>
        )}

        {/* Workspace Simulator (realistic app mockups) */}
        {selectedMonitors.length >= 2 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <div className="rounded-2xl border border-border bg-bg-secondary p-6">
              <WorkspaceSimulator monitors={selectedMonitors.slice(0, MAX_SIMULATOR_MONITORS)} />
            </div>
          </section>
        )}

        {/* Overlay canvas */}
        {selectedMonitors.length >= 2 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <div className="rounded-2xl border border-border bg-bg-secondary p-6">
              <OverlayCanvas monitors={selectedMonitors} />
            </div>
          </section>
        )}

        {/* Spec table */}
        {selectedMonitors.length >= 2 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="rounded-2xl border border-border bg-bg-secondary p-6">
              <SpecTable monitors={selectedMonitors} />
            </div>
          </section>
        )}

        {/* Footer info */}
        <footer className="text-center py-8 text-text-tertiary text-xs space-y-1">
          <p>Porównaj dowolne monitory — od 15&quot; laptopa do 49&quot; super ultrawide</p>
          <p>Dane poglądowe. Rzeczywiste wymiary mogą się różnić.</p>
        </footer>
      </div>
    </main>
  );
}

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm } from "@/lib/monitors/calculations";

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface MonitorLayout3D {
  id: string;
  monitor: Monitor;
  xCm: number;
  yCm: number;  // offset od blatu biurka (0 = stoi na blacie)
  zCm: number;
  rotation: number; // stopnie, dowolny kąt
  yawDeg?: number;   // obrót w poziomie: 0 = prosto, + = w prawo, - = w lewo
}

export interface SceneState {
  headDistance: number;
  deskWidthCm: number;
  deskDepthCm: number;
  deskHeightCm: number;
  monitors: MonitorLayout3D[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const ROOM_DEPTH_CM = 280;
const MONITOR_STAND_H = 3;
const DESK_HEIGHT_CM = 75;
const EYE_HEIGHT_CM = 125; // wysokość oczu obserwatora siedzącego

// ─── Drag State ──────────────────────────────────────────────────────────────────
interface DragState {
  monitorId: string;
  startXCm: number;
  startZCm: number;
}

// ─── 3D Primitives ──────────────────────────────────────────────────────────────
function Desk({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      {/* Desk top */}
      <mesh position={[0, height, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#a08060" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Legs */}
      {(
        [
          [-width / 2 + 4, depth / 2 - 4],
          [width / 2 - 4, depth / 2 - 4],
          [-width / 2 + 4, 4],
          [width / 2 - 4, 4],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, height / 2, z]}>
          <boxGeometry args={[4, height, 4]} />
          <meshStandardMaterial color="#7a6040" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function MonitorModel({
  layout,
  deskTopY,
  isSelected,
  isDragging,
  onPointerDown,
}: {
  layout: MonitorLayout3D;
  deskTopY: number;
  isSelected: boolean;
  isDragging: boolean;
  onPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const m = layout.monitor;
  const isPortrait = layout.rotation === 90 || layout.rotation === -90 || layout.rotation === 270;
  const wCm = isPortrait
    ? calcHeightCm(m.diagonal, m.widthPx, m.heightPx)
    : calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
  const hCm = isPortrait
    ? calcWidthCm(m.diagonal, m.widthPx, m.heightPx)
    : calcHeightCm(m.diagonal, m.widthPx, m.heightPx);
  const dCm = MONITOR_STAND_H;

  // Pozycja centrum monitora w 3D
  // yCm = offset od blatu (0 = stoi na blacie, np. 30 = uniesiony o 30cm ponad blat)
  const x = layout.xCm;
  const y = deskTopY + (layout.yCm ?? 0) + hCm / 2;
  const z = layout.zCm + dCm / 2;

  // Obrót zewnętrzny (yawDeg — obrót w poziomie)
  const yawRad = ((layout.yawDeg ?? 0) * Math.PI) / 180;
  // Obrót wewnętrzny (portrait/landscape)
  const rotY = (layout.rotation * Math.PI) / 180;

  return (
    <group
      position={[x, y, z]}
      rotation={[0, yawRad, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(layout.id, e as unknown as ThreeEvent<PointerEvent>);
      }}
    >
      <group rotation={[0, rotY, 0]}>
      {/* Monitor body */}
      <mesh>
        <boxGeometry args={[wCm, hCm, 2]} />
        <meshStandardMaterial
          color={isSelected ? "#4a9eff" : "#1a1a2e"}
          roughness={0.3}
          metalness={0.5}
          emissive={isSelected ? "#1a3a6e" : "#000000"}
        />
      </mesh>
      {/* Screen (emissive glow) */}
      <mesh position={[0, 0, 1.1]}>
        <planeGeometry args={[wCm - 2, hCm - 2]} />
        <meshStandardMaterial
          color="#0a0a1a"
          emissive="#1a2a4a"
          emissiveIntensity={0.5}
          roughness={0.1}
        />
      </mesh>
      {/* Stand */}
      <mesh position={[0, -hCm / 2 - dCm / 2, 0]}>
        <boxGeometry args={[6, dCm, 4]} />
        <meshStandardMaterial color="#888" roughness={0.5} metalness={0.3} />
      </mesh>
      </group>
    </group>
  );
}

// ─── Głowa obserwatora (tylko top view) ──────────────────────────────────────
function ObserverHead({ scene }: { scene: SceneState }) {
  // Głowa obserwatora siedzi za biurkiem, patrzy na monitory
  // headDistance = odległość oczu od przedniej krawędzi biurka
  // Biurko zaczyna się od Z=0, kończy na Z=deskDepthCm
  // Głowa jest Z = deskDepthCm + headDistance
  const headZ = scene.deskDepthCm + scene.headDistance;
  return (
    <group position={[0, DESK_HEIGHT_CM + 5, headZ]}>
      {/* Głowa — sphere */}
      <mesh>
        <sphereGeometry args={[12, 16, 16]} />
        <meshStandardMaterial color="#f5c09a" roughness={0.8} />
      </mesh>
      {/* Linia wzroku do przodu */}
      <mesh position={[0, 0, -scene.headDistance / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, scene.headDistance, 8]} />
        <meshStandardMaterial color="#ffff00" opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

// ─── Scene Objects ───────────────────────────────────────────────────────────────
function SceneObjects({
  scene,
  selectedId,
  draggingId,
  showObserver,
  onMonitorPointerDown,
}: {
  scene: SceneState;
  selectedId: string | null;
  draggingId: string | null;
  showObserver: boolean;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const deskTopY = DESK_HEIGHT_CM;
  return (
    <>
      {/* Floor */}
      <mesh position={[0, 0, ROOM_DEPTH_CM / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[scene.deskWidthCm + 100, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#2a2a2a" roughness={1} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 100, 0]}>
        <planeGeometry args={[scene.deskWidthCm + 100, 200]} />
        <meshStandardMaterial color="#1a1a2a" roughness={1} />
      </mesh>
      {/* Desk */}
      <Desk
        width={scene.deskWidthCm}
        depth={scene.deskDepthCm}
        height={deskTopY}
      />
      {/* Monitors */}
      {scene.monitors.map((m) => (
        <MonitorModel
          key={m.id}
          layout={m}
          deskTopY={deskTopY}
          isSelected={m.id === selectedId}
          isDragging={m.id === draggingId}
          onPointerDown={onMonitorPointerDown}
        />
      ))}
      {/* Głowa obserwatora (widoczna w top view) */}
      {showObserver && <ObserverHead scene={scene} />}
    </>
  );
}

// ─── Front 3D Scene — kamera porusza się jak obserwator przybliżający się do biurka ──
function Front3DScene({
  scene,
  draggingId,
  onDragUpdate,
}: {
  scene: SceneState;
  draggingId: string | null;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);
  const isDragging = useRef(false);

  // Scroll = obserwator przesuwa się bliżej/dalej od biurka
  // Kamera zaczyna daleko za biurkiem i przesuwa się wzdłuż Z ku biurku
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // scrollRef: 0 = najdalej, max = przy biurku
      scrollRef.current = Math.max(0, Math.min(scene.headDistance + scene.deskDepthCm - 20, scrollRef.current + e.deltaY * 0.15));

      // Obserwator siedzi za biurkiem (Z > deskDepthCm)
      // Kamera przesuwa się W KIERUNKU biurka (malejące Z)
      const observerZ = scene.deskDepthCm + scene.headDistance - scrollRef.current;
      camera.position.set(0, EYE_HEIGHT_CM, observerZ);

      // Patrzymy na środek biurka (nie na przednią krawędź Z=0)
      camera.lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
    };

    const el = document.getElementById("front-3d-canvas");
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [camera, scene.headDistance, scene.deskDepthCm]);

  // Drag handling
  useEffect(() => {
    if (!draggingId) return;
    const monitor = scene.monitors.find((m) => m.id === draggingId);
    if (!monitor) return;

    isDragging.current = true;
    let startClientX = 0;
    let startClientY = 0;
    let startXCm = monitor.xCm;
    let startZCm = monitor.zCm;
    let initialized = false;

    const handleMove = (e: PointerEvent) => {
      if (!initialized) {
        startClientX = e.clientX;
        startClientY = e.clientY;
        initialized = true;
        return;
      }
      const dx = (e.clientX - startClientX) * 0.3;
      const dz = -(e.clientY - startClientY) * 0.3;
      const newXCm = Math.max(
        -scene.deskWidthCm / 2 + 10,
        Math.min(scene.deskWidthCm / 2 - 10, startXCm + dx)
      );
      const newZCm = Math.max(5, Math.min(scene.deskDepthCm - 10, startZCm + dz));
      onDragUpdate(draggingId, newXCm, newZCm);
    };

    const handleUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingId, scene.monitors, scene.deskWidthCm, scene.deskDepthCm, onDragUpdate]);

  return null;
}

// ─── Top 3D Scene — widok z góry, obserwator widoczny, zoom = wysokość kamery ──
function Top3DScene({ scene }: { scene: SceneState }) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);

  // Punkt na który patrzymy: środek sceny (biurko + głowa)
  const lookX = 0;
  const lookY = DESK_HEIGHT_CM;
  const lookZ = (scene.deskDepthCm + scene.headDistance) / 2;

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Zoom = kamera obniża się (bliżej sceny) lub unosi (dalej)
      scrollRef.current = Math.max(0, Math.min(250, scrollRef.current + e.deltaY * 0.1));
      const camY = 300 - scrollRef.current;
      camera.position.set(0, camY, lookZ + 50);
      // Zapobiegaj gimbal lock — kamera patrzy prosto w dół
      camera.up.set(0, 0, -1);
      camera.lookAt(lookX, lookY, lookZ);
    };

    const el = document.getElementById("top-3d-canvas");
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [scene.deskDepthCm, scene.headDistance]);

  return null;
}

// ─── Front 3D Canvas ───────────────────────────────────────────────────────────

function Front3DCanvas({
  scene,
  draggingId,
  onMonitorPointerDown,
  onDragUpdate,
}: {
  scene: SceneState;
  draggingId: string | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  return (
    <div id="front-3d-canvas" style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, EYE_HEIGHT_CM, 200], fov: 60 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x1a1a22, 1);
          (camera as any).lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
          gl.render(threeScene, camera);
        }}
      >
        <Front3DScene scene={scene} draggingId={draggingId} onDragUpdate={onDragUpdate} />
        <SceneObjects scene={scene} selectedId={null} draggingId={draggingId} showObserver={false} onMonitorPointerDown={onMonitorPointerDown} />
      </Canvas>
    </div>
  );
}

// ─── Top 3D Canvas ─────────────────────────────────────────────────────────────

function Top3DCanvas({
  scene,
  draggingId,
  onMonitorPointerDown,
}: {
  scene: SceneState;
  draggingId: string | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <div id="top-3d-canvas" style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 250, 150], fov: 50 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x1a1a22, 1);
          (camera as any).up.set(0, 0, -1);
          (camera as any).lookAt(0, DESK_HEIGHT_CM, (scene.deskDepthCm + scene.headDistance) / 2);
          gl.render(threeScene, camera);
        }}
      >
        <Top3DScene scene={scene} />
        <SceneObjects scene={scene} selectedId={null} draggingId={draggingId} showObserver={true} onMonitorPointerDown={onMonitorPointerDown} />
      </Canvas>
    </div>
  );
}

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleMonitorPointerDown = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    setDraggingId(id);
  }, []);

  const handleDragUpdate = useCallback((id: string, xCm: number, zCm: number) => {
    const updated = scene.monitors.map(m =>
      m.id === id ? { ...m, xCm, zCm } : m
    );
    onSceneChange({ ...scene, monitors: updated });
  }, [scene, onSceneChange]);

  // Global pointer up to end drag
  useEffect(() => {
    if (!draggingId) return;
    const handleUp = () => setDraggingId(null);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, [draggingId]);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Front 3D — scroll to zoom</div>
        <div style={{ height: 420, background: "#1a1a22", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Front3DCanvas
            scene={scene}
            draggingId={draggingId}
            onMonitorPointerDown={handleMonitorPointerDown}
            onDragUpdate={handleDragUpdate}
          />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top 3D — scroll to zoom</div>
        <div style={{ height: 420, background: "#1a1a22", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Top3DCanvas
            scene={scene}
            draggingId={draggingId}
            onMonitorPointerDown={handleMonitorPointerDown}
          />
        </div>
      </div>
    </div>
  );
}
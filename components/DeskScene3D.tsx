"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm } from "@/lib/monitors/calculations";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonitorLayout3D {
  id: string;
  monitor: Monitor;
  xCm: number;
  yCm: number;
  zCm: number;
  rotation: number;
}

export interface SceneState {
  headDistance: number;
  deskWidthCm: number;
  deskDepthCm: number;
  deskHeightCm: number;
  monitors: MonitorLayout3D[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_DEPTH_CM = 280;
const MONITOR_STAND_H = 3;
const DESK_HEIGHT_CM = 75;

// ─── Drag State ──────────────────────────────────────────────────────────────

interface DragState {
  monitorId: string;
  startXCm: number;
  startZCm: number;
}

// ─── 3D Primitives ────────────────────────────────────────────────────────────

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
          <boxGeometry args={[3, height, 3]} />
          <meshStandardMaterial color="#5a4030" roughness={0.95} />
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
  const isPortrait = layout.rotation === 90;
  const wCm = isPortrait
    ? calcHeightCm(m.diagonal, m.widthPx, m.heightPx)
    : calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
  const hCm = isPortrait
    ? calcWidthCm(m.diagonal, m.widthPx, m.heightPx)
    : calcHeightCm(m.diagonal, m.widthPx, m.heightPx);
  const dCm = MONITOR_STAND_H;

  // Center of monitor in 3D space
  const x = layout.xCm;
  const y = deskTopY + hCm / 2;
  const z = layout.zCm + dCm / 2;

  return (
    <group
      position={[x, y, z]}
      rotation={[0, isPortrait ? Math.PI / 2 : 0, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(layout.id, e as unknown as ThreeEvent<PointerEvent>); }}
    >
      {/* Monitor body */}
      <mesh>
        <boxGeometry args={[wCm, hCm, dCm]} />
        <meshStandardMaterial
          color={isDragging ? "#4a4a60" : isSelected ? "#3a3a50" : "#222228"}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>
      {/* Screen (emissive glow) */}
      <mesh position={[0, 0, dCm / 2 + 0.1]}>
        <planeGeometry args={[wCm - 1.5, hCm - 1.5]} />
        <meshStandardMaterial
          color="#1a1a30"
          emissive="#3355aa"
          emissiveIntensity={0.3}
          roughness={0.1}
        />
      </mesh>
      {/* Stand */}
      <mesh position={[0, -hCm / 2 - 2, 0]}>
        <boxGeometry args={[wCm * 0.25, 4, dCm * 1.2]} />
        <meshStandardMaterial color="#2a2a32" roughness={0.7} />
      </mesh>
      {/* Rotation indicator (small dot on top) */}
      <mesh position={[wCm / 2 - 2, hCm / 2 + 1, dCm / 2]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshStandardMaterial color={isSelected ? "#ffcc00" : "#444"} emissive={isSelected ? "#ffcc00" : "#000"} emissiveIntensity={isSelected ? 0.8 : 0} />
      </mesh>
    </group>
  );
}

// ─── Scene Objects ─────────────────────────────────────────────────────────────

function SceneObjects({
  scene,
  selectedId,
  draggingId,
  onMonitorPointerDown,
}: {
  scene: SceneState;
  selectedId: string | null;
  draggingId: string | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const deskTopY = DESK_HEIGHT_CM;

  return (
    <>
      <ambientLight intensity={1.8} color="#ffffff" />
      <directionalLight position={[0, 300, scene.headDistance + scene.deskDepthCm / 2]} intensity={1.5} />
      <pointLight position={[0, 100, scene.headDistance + scene.deskDepthCm / 2]} intensity={1.0} color="#ffeecc" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM_DEPTH_CM / 2]}>
        <planeGeometry args={[600, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#3a3a44" roughness={1} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 100, ROOM_DEPTH_CM]}>
        <planeGeometry args={[600, 200]} />
        <meshStandardMaterial color="#2a2a30" />
      </mesh>

      {/* Desk */}
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={DESK_HEIGHT_CM} />

      {/* Monitors */}
      {scene.monitors.map((m) => (
        <MonitorModel
          key={m.id}
          layout={m}
          deskTopY={deskTopY}
          isSelected={selectedId === m.id}
          isDragging={draggingId === m.id}
          onPointerDown={onMonitorPointerDown}
        />
      ))}
    </>
  );
}

// ─── Front 3D Scene (camera control + drag) ───────────────────────────────────

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
  const dragStart = useRef({ x: 0, z: 0, startXCm: 0, startZCm: 0 });

  // Scroll to zoom (move camera closer/farther along Z axis)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current = Math.max(0, Math.min(120, scrollRef.current + e.deltaY * 0.1));
      const camZ = scene.headDistance + scene.deskDepthCm / 2 + 80 - scrollRef.current;
      camera.position.z = camZ;
      camera.lookAt(0, DESK_HEIGHT_CM, scene.headDistance + scene.deskDepthCm / 2);
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [camera, scene.headDistance, scene.deskDepthCm]);

  // Drag handling via window pointer events
  useEffect(() => {
    if (!draggingId) return;
    const monitor = scene.monitors.find(m => m.id === draggingId);
    if (!monitor) return;
    isDragging.current = true;
    dragStart.current = { x: 0, z: 0, startXCm: monitor.xCm, startZCm: monitor.zCm };

    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current || !draggingId) return;
      const dx = (e.clientX - dragStart.current.x) * 0.3;
      const dz = -(e.clientY - dragStart.current.z) * 0.3;
      const mon = scene.monitors.find(m => m.id === draggingId);
      if (!mon) return;
      const newXCm = Math.max(-scene.deskWidthCm / 2 + 10, Math.min(scene.deskWidthCm / 2 - 10, dragStart.current.startXCm + dx));
      const newZCm = Math.max(5, Math.min(scene.deskDepthCm - 10, dragStart.current.startZCm + dz));
      onDragUpdate(draggingId, newXCm, newZCm);
    };

    const handleUp = () => { isDragging.current = false; };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingId, scene.monitors, scene.deskWidthCm, scene.deskDepthCm, onDragUpdate]);

  return null; // Camera is set up in Front3DCanvas onCreated
}

// ─── Top 3D Scene (scroll zoom only) ─────────────────────────────────────────

function Top3DScene({
  scene,
}: {
  scene: SceneState;
}) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);
  const lookZ = scene.headDistance + scene.deskDepthCm / 2;

  // Scroll to zoom (move camera up/down along Y axis)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current = Math.max(0, Math.min(150, scrollRef.current + e.deltaY * 0.1));
      camera.position.y = 200 - scrollRef.current;
      camera.lookAt(0, 0, lookZ);
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [camera, lookZ]);

  return null;
}

// ─── Canvas Wrappers ──────────────────────────────────────────────────────────

function Front3DCanvas({
  scene,
  selectedId,
  draggingId,
  onMonitorPointerDown,
  onDragUpdate,
}: {
  scene: SceneState;
  selectedId: string | null;
  draggingId: string | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  // Camera: seated at desk, eye level ~125cm, looking straight at monitors
  // Slightly elevated so we see over the desk front edge
  const camZ = scene.headDistance - 30;
  const camY = 125;

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl, scene: threeScene, camera }) => {
        gl.setClearColor(0x252530, 1);
        (camera as any).position.set(0, camY, camZ);
        (camera as any).lookAt(0, DESK_HEIGHT_CM + 15, scene.headDistance + scene.deskDepthCm / 2);
        (camera as any).fov = 60;
        (camera as any).updateProjectionMatrix();
        gl.render(threeScene, camera);
      }}
    >
      <Front3DScene
        scene={scene}
        draggingId={draggingId}
        onDragUpdate={onDragUpdate}
      />
      <SceneObjects scene={scene} selectedId={selectedId} draggingId={draggingId} onMonitorPointerDown={onMonitorPointerDown} />
    </Canvas>
  );
}

function Top3DCanvas({
  scene,
  selectedId,
  draggingId,
  onMonitorPointerDown,
  onDragUpdate,
}: {
  scene: SceneState;
  selectedId: string | null;
  draggingId: string | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  // Camera directly above, looking down at desk
  const lookZ = scene.headDistance + scene.deskDepthCm / 2;

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl, scene: threeScene, camera }) => {
        gl.setClearColor(0x252530, 1);
        (camera as any).position.set(0, 200, lookZ);
        (camera as any).lookAt(0, 0, lookZ);
        (camera as any).fov = 40;
        (camera as any).updateProjectionMatrix();
        gl.render(threeScene, camera);
      }}
    >
      <Top3DScene
        scene={scene}
        selectedId={selectedId}
        draggingId={draggingId}
        onMonitorPointerDown={onMonitorPointerDown}
        onDragUpdate={onDragUpdate}
      />
      <SceneObjects scene={scene} selectedId={selectedId} draggingId={draggingId} onMonitorPointerDown={onMonitorPointerDown} />
    </Canvas>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleMonitorPointerDown = useCallback((id: string, _e: ThreeEvent<PointerEvent>) => {
    setSelectedId(id);
    setDraggingId(id);
  }, []);

  const handleDragUpdate = useCallback((id: string, xCm: number, zCm: number) => {
    const updated = scene.monitors.map(m =>
      m.id === id ? { ...m, xCm, zCm } : m
    );
    onSceneChange({ ...scene, monitors: updated });
  }, [scene, onSceneChange]);

  // End drag on pointer up
  useEffect(() => {
    const handleUp = () => setDraggingId(null);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, []);

  // Rotate selected monitor with R key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "r" && selectedId) {
        const updated = scene.monitors.map(m =>
          m.id === selectedId ? { ...m, rotation: m.rotation === 0 ? 90 : 0 } : m
        );
        onSceneChange({ ...scene, monitors: updated });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, scene, onSceneChange]);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">
          Front View — scroll to zoom • R = rotate selected
        </div>
        <div style={{ height: 380, background: "#1e1e24", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Front3DCanvas
            scene={scene}
            selectedId={selectedId}
            draggingId={draggingId}
            onMonitorPointerDown={handleMonitorPointerDown}
            onDragUpdate={handleDragUpdate}
          />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">
          Top View — scroll to zoom • R = rotate selected
        </div>
        <div style={{ height: 380, background: "#1e1e24", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Top3DCanvas
            scene={scene}
            selectedId={selectedId}
            draggingId={draggingId}
            onMonitorPointerDown={handleMonitorPointerDown}
            onDragUpdate={handleDragUpdate}
          />
        </div>
      </div>
    </div>
  );
}

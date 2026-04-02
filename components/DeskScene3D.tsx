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
  yCm: number;
  zCm: number;
  rotation: number;
  yawDeg?: number;
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
const DESK_HEIGHT_CM = 75;
const EYE_HEIGHT_CM = 125;
const MONITOR_DEPTH_CM = 3;

// ─── Desk ───────────────────────────────────────────────────────────────────────
function Desk({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#9a7a5a" roughness={0.7} />
      </mesh>
      {([
        [-width / 2 + 5, depth / 2 - 5],
        [width / 2 - 5, depth / 2 - 5],
        [-width / 2 + 5, 5],
        [width / 2 - 5, 5],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, height / 2, z]}>
          <boxGeometry args={[5, height, 5]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Monitor ─────────────────────────────────────────────────────────────────────
function MonitorModel({
  layout,
  deskTopY,
  isSelected,
  onPointerDown,
}: {
  layout: MonitorLayout3D;
  deskTopY: number;
  isSelected: boolean;
  onPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const m = layout.monitor;
  const isPortrait = layout.rotation === 90 || layout.rotation === -90 || layout.rotation === 270;
  const wCm = isPortrait ? calcHeightCm(m.diagonal, m.widthPx, m.heightPx) : calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
  const hCm = isPortrait ? calcWidthCm(m.diagonal, m.widthPx, m.heightPx) : calcHeightCm(m.diagonal, m.widthPx, m.heightPx);
  const dCm = MONITOR_DEPTH_CM;

  const x = layout.xCm;
  const y = deskTopY + (layout.yCm ?? 0) + hCm / 2;
  const z = layout.zCm + dCm / 2;

  const yawRad = ((layout.yawDeg ?? 0) * Math.PI) / 180;
  const rotY = (layout.rotation * Math.PI) / 180;

  return (
    <group position={[x, y, z]} rotation={[0, yawRad, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(layout.id, e as unknown as ThreeEvent<PointerEvent>); }}
    >
      <group rotation={[0, rotY, 0]}>
        <mesh>
          <boxGeometry args={[wCm, hCm, dCm]} />
          <meshStandardMaterial color={isSelected ? "#4a9eff" : "#222232"} roughness={0.3} metalness={0.6} emissive={isSelected ? "#1a3a6e" : "#000"} />
        </mesh>
        <mesh position={[0, 0, dCm / 2 + 0.1]}>
          <planeGeometry args={[wCm - 1.5, hCm - 1.5]} />
          <meshStandardMaterial color="#0a0a1a" emissive="#1a2a4a" emissiveIntensity={0.6} roughness={0.1} />
        </mesh>
        <mesh position={[0, -hCm / 2 - dCm / 2 - 1.5, 0]}>
          <boxGeometry args={[wCm * 0.3, 3, dCm * 1.5]} />
          <meshStandardMaterial color="#555" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Observer Head ─────────────────────────────────────────────────────────────
function ObserverHead({ cameraZ }: { cameraZ: number }) {
  return (
    <group position={[0, DESK_HEIGHT_CM - 40, cameraZ]}>
      <mesh>
        <sphereGeometry args={[10, 12, 12]} />
        <meshStandardMaterial color="#f5c09a" roughness={0.8} />
      </mesh>
      <mesh position={[0, -12, 0]}>
        <cylinderGeometry args={[7, 7, 16, 10]} />
        <meshStandardMaterial color="#3355aa" roughness={0.9} />
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
  cameraZ,
  onMonitorPointerDown,
}: {
  scene: SceneState;
  selectedId: string | null;
  draggingId: string | null;
  showObserver: boolean;
  cameraZ: number;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const deskTopY = DESK_HEIGHT_CM;

  return (
    <>
      <ambientLight intensity={2.0} color="#ffffff" />
      <directionalLight position={[0, 250, scene.deskDepthCm]} intensity={1.8} color="#fff8f0" />
      <pointLight position={[0, 160, scene.deskDepthCm / 2]} intensity={1.2} color="#ffe8cc" />
      <pointLight position={[0, EYE_HEIGHT_CM, cameraZ - 20]} intensity={0.8} color="#ffffff" />

      {/* Floor */}
      <mesh position={[0, -1, ROOM_DEPTH_CM / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[scene.deskWidthCm + 80, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#2a2a30" roughness={1} transparent opacity={0.5} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 100, scene.deskDepthCm / 2 - 2]}>
        <planeGeometry args={[scene.deskWidthCm + 80, 200]} />
        <meshStandardMaterial color="#28282e" roughness={1} />
      </mesh>

      {/* Desk */}
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={deskTopY} />

      {/* Monitors */}
      {scene.monitors.map((m) => (
        <MonitorModel key={m.id} layout={m} deskTopY={deskTopY} isSelected={m.id === selectedId || m.id === draggingId} onPointerDown={onMonitorPointerDown} />
      ))}

      {/* Observer */}
      {showObserver && <ObserverHead cameraZ={cameraZ} />}
    </>
  );
}

// ─── Front 3D Scene ─────────────────────────────────────────────────────────────
function Front3DScene({ scene, draggingId, onDragUpdate, onCameraZChange }: {
  scene: SceneState;
  draggingId: string | null;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
  onCameraZChange: (z: number) => void;
}) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);

  // Initial camera — starts far from desk (scrollRef=0)
  useEffect(() => {
    const initialZ = scene.deskDepthCm + 80;
    scrollRef.current = 0;
    camera.position.set(0, EYE_HEIGHT_CM, initialZ);
    camera.lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
    onCameraZChange(initialZ);
  }, [camera, scene.deskDepthCm, onCameraZChange]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const maxScroll = 160;
      scrollRef.current = Math.max(0, Math.min(maxScroll, scrollRef.current + e.deltaY * 0.15));
      const z = scene.deskDepthCm + 80 - scrollRef.current;
      const clampedZ = Math.max(scene.deskDepthCm - 20, Math.min(ROOM_DEPTH_CM - 20, z));
      camera.position.set(0, EYE_HEIGHT_CM, clampedZ);
      camera.lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
      onCameraZChange(clampedZ);
    };
    const el = document.getElementById("front-3d-canvas");
    if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [camera, scene.deskDepthCm, onCameraZChange]);

  // Drag monitor
  useEffect(() => {
    if (!draggingId) return;
    const monitor = scene.monitors.find((m) => m.id === draggingId);
    if (!monitor) return;
    let startX = 0, startY = 0, startXCm = monitor.xCm, startZCm = monitor.zCm, init = false;
    const handleMove = (e: PointerEvent) => {
      if (!init) { startX = e.clientX; startY = e.clientY; init = true; return; }
      const newXCm = Math.max(-scene.deskWidthCm / 2 + 10, Math.min(scene.deskWidthCm / 2 - 10, startXCm + (e.clientX - startX) * 0.25));
      const newZCm = Math.max(5, Math.min(scene.deskDepthCm - 10, startZCm - (e.clientY - startY) * 0.25));
      onDragUpdate(draggingId, newXCm, newZCm);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", () => { init = false; });
    return () => { window.removeEventListener("pointermove", handleMove); };
  }, [draggingId, scene.monitors, scene.deskWidthCm, scene.deskDepthCm, onDragUpdate]);

  return null;
}

// ─── Top 3D Scene ───────────────────────────────────────────────────────────────
function Top3DScene({ scene }: { scene: SceneState }) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current = Math.max(0, Math.min(200, scrollRef.current + e.deltaY * 0.1));
      camera.position.set(0, 250 - scrollRef.current, (scene.deskDepthCm + scene.headDistance) / 2 + 60);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, DESK_HEIGHT_CM, (scene.deskDepthCm + scene.headDistance) / 2);
    };
    const el = document.getElementById("top-3d-canvas");
    if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [scene.deskDepthCm, scene.headDistance]);

  return null;
}

// ─── Front 3D Canvas ─────────────────────────────────────────────────────────────
function Front3DCanvas({ scene, draggingId, cameraZ, onMonitorPointerDown, onDragUpdate, onCameraZChange }: {
  scene: SceneState;
  draggingId: string | null;
  cameraZ: number;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
  onCameraZChange: (z: number) => void;
}) {
  return (
    <div id="front-3d-canvas" style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [0, EYE_HEIGHT_CM, 200], fov: 55 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x1a1a28, 1);
          (camera as any).lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
          gl.render(threeScene, camera);
        }}
      >
        <Front3DScene scene={scene} draggingId={draggingId} onDragUpdate={onDragUpdate} onCameraZChange={onCameraZChange} />
        <SceneObjects scene={scene} selectedId={null} draggingId={draggingId} showObserver={false} cameraZ={cameraZ} onMonitorPointerDown={onMonitorPointerDown} />
      </Canvas>
    </div>
  );
}

// ─── Top 3D Canvas ────────────────────────────────────────────────────────────────
function Top3DCanvas({ scene, draggingId, cameraZ, onMonitorPointerDown }: {
  scene: SceneState;
  draggingId: string | null;
  cameraZ: number;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <div id="top-3d-canvas" style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [0, 250, 150], fov: 50 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x141420, 1);
          (camera as any).up.set(0, 0, 1);
          (camera as any).lookAt(0, DESK_HEIGHT_CM, (scene.deskDepthCm + scene.headDistance) / 2);
          gl.render(threeScene, camera);
        }}
      >
        <Top3DScene scene={scene} />
        <SceneObjects scene={scene} selectedId={null} draggingId={draggingId} showObserver={true} cameraZ={cameraZ} onMonitorPointerDown={onMonitorPointerDown} />
      </Canvas>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [cameraZ, setCameraZ] = useState(() => scene.deskDepthCm + 80);

  const handleMonitorPointerDown = useCallback((id: string, _e: ThreeEvent<PointerEvent>) => {
    setDraggingId(id);
  }, []);

  const handleDragUpdate = useCallback((id: string, xCm: number, zCm: number) => {
    onSceneChange({ ...scene, monitors: scene.monitors.map(m => m.id === id ? { ...m, xCm, zCm } : m) });
  }, [scene, onSceneChange]);

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
        <div style={{ height: 420, background: "#141420", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Front3DCanvas scene={scene} draggingId={draggingId} cameraZ={cameraZ} onMonitorPointerDown={handleMonitorPointerDown} onDragUpdate={handleDragUpdate} onCameraZChange={setCameraZ} />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top 3D — head synced with Front scroll</div>
        <div style={{ height: 420, background: "#141420", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Top3DCanvas scene={scene} draggingId={draggingId} cameraZ={cameraZ} onMonitorPointerDown={handleMonitorPointerDown} />
        </div>
      </div>
    </div>
  );
}
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
  rotation: number; // stopnie, 0=landscape, 90=portrait
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
const EYE_HEIGHT_CM = 125;

// ─── 3D Primitives ──────────────────────────────────────────────────────────────
function Desk({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#a08060" roughness={0.7} metalness={0.1} />
      </mesh>
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
  onPointerDown,
}: {
  layout: MonitorLayout3D;
  deskTopY: number;
  isSelected: boolean;
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

  const x = layout.xCm;
  const y = deskTopY + (layout.yCm ?? 0) + hCm / 2;
  const z = layout.zCm + dCm / 2;

  const yawRad = ((layout.yawDeg ?? 0) * Math.PI) / 180;
  const rotY = (layout.rotation * Math.PI) / 180;

  return (
    <group
      position={[x, y, z]}
      rotation={[0, yawRad, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(layout.id, e as unknown as ThreeEvent<PointerEvent>); }}
    >
      <group rotation={[0, rotY, 0]}>
        {/* Monitor body */}
        <mesh>
          <boxGeometry args={[wCm, hCm, 2]} />
          <meshStandardMaterial
            color={isSelected ? "#4a9eff" : "#2a2a3e"}
            roughness={0.3}
            metalness={0.5}
            emissive={isSelected ? "#1a3a6e" : "#000000"}
          />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 1.1]}>
          <planeGeometry args={[wCm - 2, hCm - 2]} />
          <meshStandardMaterial color="#0a0a1a" emissive="#1a2a4a" emissiveIntensity={0.5} roughness={0.1} />
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

// ─── Głowa obserwatora (pozycja zsynchronizowana z Front 3D scroll) ─────────────
function ObserverHead({ cameraZ, deskDepth }: { cameraZ: number; deskDepth: number }) {
  // cameraZ already clamped in Front3DScene to [deskDepth-20, ROOM_DEPTH_CM-20]
  const clampedZ = Math.max(deskDepth - 20, Math.min(ROOM_DEPTH_CM - 20, cameraZ));
  return (
    <group position={[0, DESK_HEIGHT_CM + 5, clampedZ]}>
      {/* Głowa */}
      <mesh>
        <sphereGeometry args={[12, 16, 16]} />
        <meshStandardMaterial color="#f5c09a" roughness={0.8} />
      </mesh>
      {/* Oczy */}
      <mesh position={[4, 2, 6]}>
        <sphereGeometry args={[2, 8, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-4, 2, 6]}>
        <sphereGeometry args={[2, 8, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Ciało */}
      <mesh position={[0, -18, 0]}>
        <cylinderGeometry args={[8, 8, 22, 12]} />
        <meshStandardMaterial color="#3355aa" roughness={0.9} />
      </mesh>
      {/* Linia wzroku (do biurka) */}
      <mesh position={[0, -5, (deskDepth - cameraZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, deskDepth - cameraZ, 8]} />
        <meshStandardMaterial color="#ffff00" opacity={0.25} transparent />
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
      {/* Ambient light — jasne oświetlenie pokoju */}
      <ambientLight intensity={2.5} color="#ffffff" />
      {/* Główne światło z góry */}
      <directionalLight position={[0, 300, 150]} intensity={2.0} color="#fff5e0" castShadow />
      {/* Światło nad biurkiem */}
      <pointLight position={[0, 180, scene.deskDepthCm / 2]} intensity={1.5} color="#ffe8cc" />
      {/* Światło za obserwatorem */}
      <pointLight position={[0, EYE_HEIGHT_CM, cameraZ - 30]} intensity={0.8} color="#ffffff" />

      {/* Floor */}
      <mesh position={[0, 0, ROOM_DEPTH_CM / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[scene.deskWidthCm + 100, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#3a3a3a" roughness={1} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 100, scene.deskDepthCm / 2]}>
        <planeGeometry args={[scene.deskWidthCm + 100, 200]} />
        <meshStandardMaterial color="#2a2a30" roughness={1} />
      </mesh>
      {/* Desk */}
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={deskTopY} />
      {/* Monitors */}
      {scene.monitors.map((m) => (
        <MonitorModel
          key={m.id}
          layout={m}
          deskTopY={deskTopY}
          isSelected={m.id === selectedId}
          onPointerDown={onMonitorPointerDown}
        />
      ))}
      {/* Głowa obserwatora w Top 3D */}
      {showObserver && <ObserverHead cameraZ={cameraZ} deskDepth={scene.deskDepthCm} />}
    </>
  );
}

// ─── Front 3D Scene ─────────────────────────────────────────────────────────────
function Front3DScene({
  scene,
  draggingId,
  onDragUpdate,
  onCameraZChange,
}: {
  scene: SceneState;
  draggingId: string | null;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
  onCameraZChange: (z: number) => void;
}) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);
  const initialized = useRef(false);

  // Initialize camera position once when scene loads
  useEffect(() => {
    const initialZ = scene.deskDepthCm + scene.headDistance;
    camera.position.set(0, EYE_HEIGHT_CM, initialZ);
    camera.lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
    onCameraZChange(initialZ);
  }, []); // run once on mount

  // Scroll = zoom (przesuwanie kamery bliżej/dalej)
  // cameraZ clamped: minimum = przy biurku (deskDepth-20), maximum = przy back wall (ROOM_DEPTH_CM-20)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const maxScroll = scene.headDistance + scene.deskDepthCm - 20;
      const maxCameraZ = ROOM_DEPTH_CM - 20; // head can't go through back wall
      const minCameraZ = scene.deskDepthCm - 20; // head can't go past desk front
      scrollRef.current = Math.max(0, Math.min(maxScroll, scrollRef.current + e.deltaY * 0.15));
      // scroll=0 → cameraZ=maxCameraZ (przy ścianie), scroll=maxScroll → cameraZ=minCameraZ (przy biurku)
      const newCameraZ = maxCameraZ - scrollRef.current;
      const clampedZ = Math.max(minCameraZ, Math.min(maxCameraZ, newCameraZ));
      camera.position.set(0, EYE_HEIGHT_CM, clampedZ);
      camera.lookAt(0, EYE_HEIGHT_CM, scene.deskDepthCm / 2);
      onCameraZChange(clampedZ);
    };

    const el = document.getElementById("front-3d-canvas");
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [camera, scene.headDistance, scene.deskDepthCm, onCameraZChange]);

  // Drag monitor
  useEffect(() => {
    if (!draggingId) return;
    const monitor = scene.monitors.find((m) => m.id === draggingId);
    if (!monitor) return;

    let startClientX = 0;
    let startClientY = 0;
    let startXCm = monitor.xCm;
    let startZCm = monitor.zCm;
    let init = false;

    const handleMove = (e: PointerEvent) => {
      if (!init) { startClientX = e.clientX; startClientY = e.clientY; init = true; return; }
      const dx = (e.clientX - startClientX) * 0.3;
      const dz = -(e.clientY - startClientY) * 0.3;
      const newXCm = Math.max(-scene.deskWidthCm / 2 + 10, Math.min(scene.deskWidthCm / 2 - 10, startXCm + dx));
      const newZCm = Math.max(5, Math.min(scene.deskDepthCm - 10, startZCm + dz));
      onDragUpdate(draggingId, newXCm, newZCm);
    };
    const handleUp = () => { /* handled by parent */ };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  }, [draggingId, scene.monitors, scene.deskWidthCm, scene.deskDepthCm, onDragUpdate]);

  return null;
}

// ─── Top 3D Scene ───────────────────────────────────────────────────────────────
function Top3DScene({ scene }: { scene: SceneState }) {
  const { camera } = useThree() as { camera: any };
  const scrollRef = useRef(0);

  const lookZ = (scene.deskDepthCm + scene.headDistance) / 2;

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current = Math.max(0, Math.min(250, scrollRef.current + e.deltaY * 0.1));
      const camY = 300 - scrollRef.current;
      camera.position.set(0, camY, lookZ + 50);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, DESK_HEIGHT_CM, lookZ);
    };
    const el = document.getElementById("top-3d-canvas");
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [scene.deskDepthCm, scene.headDistance, lookZ]);

  return null;
}

// ─── Canvas Components ─────────────────────────────────────────────────────────

function Front3DCanvas({
  scene,
  draggingId,
  cameraZ,
  onMonitorPointerDown,
  onDragUpdate,
  onCameraZChange,
}: {
  scene: SceneState;
  draggingId: string | null;
  cameraZ: number;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
  onCameraZChange: (z: number) => void;
}) {
  return (
    <div id="front-3d-canvas" style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, EYE_HEIGHT_CM, 200], fov: 60 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x2a2a38, 1);
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

function Top3DCanvas({
  scene,
  draggingId,
  cameraZ,
  onMonitorPointerDown,
}: {
  scene: SceneState;
  draggingId: string | null;
  cameraZ: number;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <div id="top-3d-canvas" style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 250, 150], fov: 50 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x2a2a38, 1);
          (camera as any).up.set(0, 0, -1);
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

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [cameraZ, setCameraZ] = useState<number>(() => scene.deskDepthCm + scene.headDistance);

  const handleMonitorPointerDown = useCallback((id: string, _e: ThreeEvent<PointerEvent>) => {
    setDraggingId(id);
  }, []);

  const handleDragUpdate = useCallback((id: string, xCm: number, zCm: number) => {
    const updated = scene.monitors.map(m => m.id === id ? { ...m, xCm, zCm } : m);
    onSceneChange({ ...scene, monitors: updated });
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
        <div style={{ height: 420, background: "#1e1e28", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Front3DCanvas
            scene={scene}
            draggingId={draggingId}
            cameraZ={cameraZ}
            onMonitorPointerDown={handleMonitorPointerDown}
            onDragUpdate={handleDragUpdate}
            onCameraZChange={setCameraZ}
          />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top 3D — observer synced with Front scroll</div>
        <div style={{ height: 420, background: "#1e1e28", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <Top3DCanvas
            scene={scene}
            draggingId={draggingId}
            cameraZ={cameraZ}
            onMonitorPointerDown={handleMonitorPointerDown}
          />
        </div>
      </div>
    </div>
  );
}
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import { PerspectiveCamera, OrthographicCamera, Raycaster, Vector2, Plane, Vector3 } from "three";
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
const HEAD_Z_CM = 8;
const MONITOR_STAND_H = 3;
const PERSON_EYE_H = 125;

// ─── Drag State ──────────────────────────────────────────────────────────────

interface DragState {
  monitorId: string;
  startMouseX: number;
  startMouseY: number;
  startXCm: number;
  startZCm: number;
}

// ─── 3D Primitives ────────────────────────────────────────────────────────────

function Desk({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height, depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#7a5c20" roughness={0.85} />
      </mesh>
      {(
        [
          [-width / 2 + 3, depth / 2 - 3],
          [width / 2 - 3, depth / 2 - 3],
          [-width / 2 + 3, 3],
          [width / 2 - 3, 3],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, height / 2, z]}>
          <boxGeometry args={[2.5, height, 2.5]} />
          <meshStandardMaterial color="#4a3820" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function MonitorModel({
  layout,
  deskTopY,
  isDragging,
  onPointerDown,
}: {
  layout: MonitorLayout3D;
  deskTopY: number;
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

  return (
    <group
      position={[layout.xCm, deskTopY + hCm / 2, layout.zCm + dCm / 2]}
      rotation={[0, isPortrait ? Math.PI / 2 : 0, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(layout.id, e); }}
    >
      <mesh>
        <boxGeometry args={[wCm, hCm, dCm]} />
        <meshStandardMaterial
          color={isDragging ? "#3a3a50" : "#1e1e24"}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, 0, dCm / 2 + 0.05]}>
        <planeGeometry args={[wCm - 0.8, hCm - 0.8]} />
        <meshStandardMaterial color="#080810" roughness={0.05} metalness={0.95} />
      </mesh>
      <mesh position={[0, -hCm / 2 - 1.5, 0]}>
        <boxGeometry args={[wCm * 0.25, 3, dCm * 1.2]} />
        <meshStandardMaterial color="#2a2a32" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Person({ eyeZ }: { eyeZ: number }) {
  return (
    <group position={[0, 0, eyeZ]}>
      <mesh position={[0, PERSON_EYE_H, 0]}>
        <sphereGeometry args={[7, 16, 16]} />
        <meshStandardMaterial color="#ddb898" roughness={0.9} />
      </mesh>
      <mesh position={[-3, PERSON_EYE_H + 1, 6]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[3, PERSON_EYE_H + 1, 6]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, PERSON_EYE_H - 20, -4]}>
        <cylinderGeometry args={[10, 7, 28, 12]} />
        <meshStandardMaterial color="#3366aa" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Scene Objects ─────────────────────────────────────────────────────────────

function SceneObjects({
  scene,
  draggingId,
  onMonitorPointerDown,
}: {
  scene: SceneState;
  draggingId: string | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const deskTopY = scene.deskHeightCm;
  const eyeZ = HEAD_Z_CM;

  return (
    <>
      <ambientLight intensity={1.2} color="#ffffff" />
      <directionalLight position={[50, 300, scene.headDistance + scene.deskDepthCm / 2]} intensity={1.2} castShadow />
      <pointLight position={[0, 150, scene.headDistance + scene.deskDepthCm / 2]} intensity={0.8} color="#ffeecc" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM_DEPTH_CM / 2]}>
        <planeGeometry args={[500, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#3a3a44" roughness={1} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 120, ROOM_DEPTH_CM]}>
        <planeGeometry args={[500, 240]} />
        <meshStandardMaterial color="#28282e" />
      </mesh>

      {/* Desk */}
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={scene.deskHeightCm} />

      {/* Monitors */}
      {scene.monitors.map((m) => (
        <MonitorModel
          key={m.id}
          layout={m}
          deskTopY={deskTopY}
          isDragging={draggingId === m.id}
          onPointerDown={onMonitorPointerDown}
        />
      ))}

      {/* Person */}
      <Person eyeZ={eyeZ} />
    </>
  );
}

// ─── Camera Controllers ───────────────────────────────────────────────────────

function FrontCameraSetup({ scene }: { scene: SceneState }) {
  const { camera } = useThree() as { camera: PerspectiveCamera };
  useEffect(() => {
    // Camera sits BEHIND the observer (observer at headDistance beyond desk back)
    // Camera at observer's eye level, looking TOWARD the desk (lower Z)
    camera.position.set(0, scene.deskHeightCm + 50, scene.headDistance + scene.deskDepthCm + 30);
    camera.lookAt(0, scene.deskHeightCm + 50, scene.deskDepthCm / 2);
    camera.updateProjectionMatrix();
  }, [camera, scene.headDistance, scene.deskHeightCm, scene.deskDepthCm]);
  return null;
}

function TopCameraSetup() {
  const { camera } = useThree() as { camera: OrthographicCamera };
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.position.set(0, 250, 120);
    cam.left = -150;
    cam.right = 150;
    cam.top = 150;
    cam.bottom = -150;
    cam.lookAt(0, 0, 130);
    cam.updateProjectionMatrix();
  }, [camera]);
  return null;
}

// ─── Drag Controller (inside Canvas) ─────────────────────────────────────────

function DragController({
  dragging,
  scene,
  onUpdate,
}: {
  dragging: DragState | null;
  scene: SceneState;
  onUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  const { camera, size } = useThree() as { camera: PerspectiveCamera | OrthographicCamera; size: { width: number; height: number } };
  const raycaster = useRef(new Raycaster());
  const mouse = useRef(new Vector2());
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const intersection = useRef(new Vector3());

  useFrame(({ pointer }) => {
    if (!dragging) return;

    // Convert pointer to normalized device coordinates
    mouse.current.x = (pointer.x) * (size.width / 2);
    mouse.current.y = -(pointer.y) * (size.height / 2);

    // For orthographic (top view), compute delta directly from pointer movement
    const monitor = scene.monitors.find(m => m.id === dragging.monitorId);
    if (!monitor) return;

    // Use a simple screen-space delta approach
    const dx = pointer.x * 100; // rough cm per screen unit
    const dz = -pointer.y * 100;

    const newXCm = dragging.startXCm + dx;
    const newZCm = Math.max(0, Math.min(scene.deskDepthCm - 10, dragging.startZCm + dz));

    if (Math.abs(newXCm - monitor.xCm) > 0.5 || Math.abs(newZCm - monitor.zCm) > 0.5) {
      onUpdate(dragging.monitorId, newXCm, newZCm);
    }
  });

  return null;
}

// ─── Canvas Wrappers ──────────────────────────────────────────────────────────

function FrontCanvas({
  scene,
  dragging,
  onMonitorPointerDown,
  onDragUpdate,
}: {
  scene: SceneState;
  dragging: DragState | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 125, 200], fov: 50, near: 1, far: 500 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x202028, 1);
          const cam = camera as PerspectiveCamera;
          cam.lookAt(0, scene.deskHeightCm + 10, scene.headDistance + scene.deskDepthCm / 2);
          cam.updateProjectionMatrix();
          gl.render(threeScene, camera);
        }}
      >
        <FrontCameraSetup scene={scene} />
        <SceneObjects scene={scene} draggingId={dragging?.monitorId ?? null} onMonitorPointerDown={onMonitorPointerDown} />
        <DragController dragging={dragging} scene={scene} onUpdate={onDragUpdate} />
      </Canvas>
    </div>
  );
}

function TopCanvas({
  scene,
  dragging,
  onMonitorPointerDown,
  onDragUpdate,
}: {
  scene: SceneState;
  dragging: DragState | null;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor(0x202028, 1);
          const cam = camera as OrthographicCamera;
          cam.position.set(0, 250, 120);
          cam.left = -150;
          cam.right = 150;
          cam.top = 150;
          cam.bottom = -150;
          cam.lookAt(0, 0, 130);
          cam.updateProjectionMatrix();
          gl.render(threeScene, camera);
        }}
      >
        <TopCameraSetup />
        <SceneObjects scene={scene} draggingId={dragging?.monitorId ?? null} onMonitorPointerDown={onMonitorPointerDown} />
        <DragController dragging={dragging} scene={scene} onUpdate={onDragUpdate} />
      </Canvas>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const [dragging, setDragging] = useState<DragState | null>(null);

  const handleMonitorPointerDown = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    const monitor = scene.monitors.find(m => m.id === id);
    if (!monitor) return;
    setDragging({
      monitorId: id,
      startMouseX: e.nativeEvent?.clientX ?? 0,
      startMouseY: e.nativeEvent?.clientY ?? 0,
      startXCm: monitor.xCm,
      startZCm: monitor.zCm,
    });
  }, [scene.monitors]);

  const handleDragUpdate = useCallback((id: string, xCm: number, zCm: number) => {
    const updated = scene.monitors.map(m =>
      m.id === id ? { ...m, xCm, zCm } : m
    );
    onSceneChange({ ...scene, monitors: updated });
  }, [scene, onSceneChange]);

  // Global pointer up to end drag
  useEffect(() => {
    if (!dragging) return;
    const handleUp = () => setDragging(null);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, [dragging]);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Front 3D</div>
        <div style={{ height: 380, background: "#1a1a22", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <FrontCanvas
            scene={scene}
            dragging={dragging}
            onMonitorPointerDown={handleMonitorPointerDown}
            onDragUpdate={handleDragUpdate}
          />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top 3D</div>
        <div style={{ height: 380, background: "#1a1a22", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <TopCanvas
            scene={scene}
            dragging={dragging}
            onMonitorPointerDown={handleMonitorPointerDown}
            onDragUpdate={handleDragUpdate}
          />
        </div>
      </div>
    </div>
  );
}

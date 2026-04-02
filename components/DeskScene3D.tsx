"use client";

import { useRef, useMemo, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
// @ts-ignore - R3F extends THREE cameras with JSX support
import { PerspectiveCamera, OrthographicCamera } from "three";
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

// Module-level scene ref so cameras can access it in useFrame
let _scene: SceneState | null = null;
function setSceneRef(s: SceneState) { _scene = s; }

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

function MonitorMesh({ layout, deskTopY, onPointerDown }: {
  layout: MonitorLayout3D;
  deskTopY: number;
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

  const x = layout.xCm;
  const y = deskTopY + hCm / 2;
  const z = layout.zCm + dCm / 2;

  return (
    <group
      position={[x, y, z]}
      rotation={[0, isPortrait ? Math.PI / 2 : 0, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(layout.id, e); }}
    >
      <mesh>
        <boxGeometry args={[wCm, hCm, dCm]} />
        <meshStandardMaterial color="#1e1e24" roughness={0.4} metalness={0.6} />
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

function Person({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 160, 0]}>
        <sphereGeometry args={[7, 16, 16]} />
        <meshStandardMaterial color="#ddb898" roughness={0.9} />
      </mesh>
      <mesh position={[-2.5, 1, 6]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[2.5, 1, 6]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, 140, -4]}>
        <cylinderGeometry args={[10, 7, 28, 12]} />
        <meshStandardMaterial color="#3366aa" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Scene Objects (shared) ────────────────────────────────────────────────────

function SceneObjects({ scene, onMonitorPointerDown }: {
  scene: SceneState;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const deskTopY = scene.deskHeightCm;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 200, 100]} intensity={0.7} />
      <pointLight position={[0, 180, scene.headDistance + scene.deskDepthCm / 2]} intensity={0.3} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM_DEPTH_CM / 2]}>
        <planeGeometry args={[500, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#18181e" roughness={1} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 120, ROOM_DEPTH_CM]}>
        <planeGeometry args={[500, 240]} />
        <meshStandardMaterial color="#1e1e24" />
      </mesh>

      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={scene.deskHeightCm} />

      {scene.monitors.map((m) => (
        <MonitorMesh
          key={m.id}
          layout={m}
          deskTopY={deskTopY}
          onPointerDown={onMonitorPointerDown}
        />
      ))}

      <Person z={HEAD_Z_CM} />
    </>
  );
}

// ─── Front Camera ──────────────────────────────────────────────────────────────

function FrontCamera({ pos }: { pos: [number, number, number] }) {
  const { camera } = useThree() as { camera: any };
  useFrame(() => {
    if (_scene) {
      camera.lookAt(
        0,
        _scene.deskHeightCm / 2 + 20,
        _scene.headDistance + _scene.deskDepthCm / 2
      );
    }
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PCam = PerspectiveCamera as any;
  return <PCam makeDefault fov={45} position={pos} near={1} far={500} />;
}

// ─── Top Camera ───────────────────────────────────────────────────────────────

function TopCamera({ pos }: { pos: [number, number, number] }) {
  const { camera } = useThree() as { camera: any };
  useFrame(() => {
    camera.lookAt(0, 0, 150);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OCam = OrthographicCamera as any;
  return <OCam makeDefault position={pos} zoom={3} near={0.1} far={500} />;
}

// ─── View Panes ───────────────────────────────────────────────────────────────

function FrontViewPane({ scene, onMonitorPointerDown }: {
  scene: SceneState;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  setSceneRef(scene);
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Front View</div>
      <div className="flex-1 rounded-xl border border-border overflow-hidden bg-[#1a1a1e]" style={{ minHeight: 360 }}>
        <Canvas>
          <FrontCamera pos={[0, 90, scene.headDistance - 30]} />
          <SceneObjects scene={scene} onMonitorPointerDown={onMonitorPointerDown} />
        </Canvas>
      </div>
    </div>
  );
}

function TopViewPane({ scene, onMonitorPointerDown }: {
  scene: SceneState;
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top View</div>
      <div className="flex-1 rounded-xl border border-border overflow-hidden bg-[#1a1a1e]" style={{ minHeight: 360 }}>
        <Canvas>
          <TopCamera pos={[0, 280, 140]} />
          <SceneObjects scene={scene} onMonitorPointerDown={onMonitorPointerDown} />
        </Canvas>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const handlePointer = useCallback((_id: string, _e: ThreeEvent<PointerEvent>) => {
    // TODO: implement drag
  }, []);

  return (
    <div className="flex gap-2 w-full">
      <Suspense fallback={<div className="text-text-tertiary text-xs text-center py-20 w-full">Loading 3D...</div>}>
        <FrontViewPane scene={scene} onMonitorPointerDown={handlePointer} />
        <TopViewPane scene={scene} onMonitorPointerDown={handlePointer} />
      </Suspense>
    </div>
  );
}

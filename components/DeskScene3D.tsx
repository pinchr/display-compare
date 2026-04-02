"use client";

import { useRef, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, OrthographicCamera, Object3D } from "three";
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

// Shared scene ref — updated before each canvas renders
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

function MonitorModel({ layout, deskTopY }: {
  layout: MonitorLayout3D;
  deskTopY: number;
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

// ─── Scene Objects (shared between both views) ───────────────────────────────

function SceneContent({ scene }: { scene: SceneState }) {
  const deskTopY = scene.deskHeightCm;
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 200, 100]} intensity={0.7} />
      <pointLight position={[0, 180, scene.headDistance + scene.deskDepthCm / 2]} intensity={0.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM_DEPTH_CM / 2]}>
        <planeGeometry args={[500, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#18181e" roughness={1} />
      </mesh>
      <mesh position={[0, 120, ROOM_DEPTH_CM]}>
        <planeGeometry args={[500, 240]} />
        <meshStandardMaterial color="#1e1e24" />
      </mesh>
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={scene.deskHeightCm} />
      {scene.monitors.map((m) => (
        <MonitorModel key={m.id} layout={m} deskTopY={deskTopY} />
      ))}
      <Person z={HEAD_Z_CM} />
    </>
  );
}

// ─── Front Camera ─────────────────────────────────────────────────────────────

function FrontCamera({ headDistance }: { headDistance: number }) {
  const camRef = useRef<PerspectiveCamera>(null!);
  useFrame(() => {
    if (camRef.current && _scene) {
      camRef.current.lookAt(0, _scene.deskHeightCm / 2 + 20, _scene.headDistance + _scene.deskDepthCm / 2);
    }
  });
  return <perspectiveCamera ref={camRef} args={[45, 1, 1, 500]} position={[0, 90, headDistance - 30]} />;
}

// ─── Top Camera ───────────────────────────────────────────────────────────────

function TopCamera() {
  const camRef = useRef<OrthographicCamera>(null!);
  useFrame(() => {
    if (camRef.current) {
      camRef.current.lookAt(0, 0, 150);
    }
  });
  return <orthographicCamera ref={camRef} args={[-200, 200, 200, -200, 0.1, 500]} position={[0, 280, 140]} zoom={3} />;
}

// ─── Individual Canvas wrappers (completely isolated WebGL contexts) ────────

function FrontCanvas({ scene }: { scene: SceneState }) {
  const camRef = useRef<PerspectiveCamera>(null!);
  const lookAtTarget = useRef({ x: 0, y: scene.deskHeightCm / 2 + 20, z: scene.headDistance + scene.deskDepthCm / 2 });

  // useFrame only works inside Canvas children — create a component for it
  function LookAtController() {
    const frameRef = useRef(0);
    useFrame(() => {
      if (frameRef.current < 2 && camRef.current) {
        camRef.current.lookAt(lookAtTarget.current.x, lookAtTarget.current.y, lookAtTarget.current.z);
        frameRef.current++;
      }
    });
    return null;
  }

  // Update lookAt when scene changes
  useEffect(() => {
    lookAtTarget.current = { x: 0, y: scene.deskHeightCm / 2 + 20, z: scene.headDistance + scene.deskDepthCm / 2 };
  }, [scene]);

  return (
    <Canvas style={{ width: "100%", height: "100%" }}>
      <perspectiveCamera ref={camRef} args={[45, 1, 1, 500]} position={[0, 90, scene.headDistance - 30]} />
      <LookAtController />
      <SceneContent scene={scene} />
    </Canvas>
  );
}

function TopCanvas({ scene }: { scene: SceneState }) {
  const camRef = useRef<OrthographicCamera>(null!);

  function LookAtController() {
    const frameRef = useRef(0);
    useFrame(() => {
      if (frameRef.current < 2 && camRef.current) {
        camRef.current.lookAt(0, 0, 150);
        frameRef.current++;
      }
    });
    return null;
  }

  return (
    <Canvas style={{ width: "100%", height: "100%" }}>
      <orthographicCamera ref={camRef} args={[-200, 200, 200, -200, 0.1, 500]} position={[0, 280, 140]} zoom={3} />
      <LookAtController />
      <SceneContent scene={scene} />
    </Canvas>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  setSceneRef(scene);

  return (
    <div className="flex gap-2 w-full">
      <div className="flex-1 flex flex-col">
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Front View</div>
        <div className="flex-1 rounded-xl border border-border overflow-hidden bg-[#1a1a1e]" style={{ minHeight: 360 }}>
          <FrontCanvas scene={scene} />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top View</div>
        <div className="flex-1 rounded-xl border border-border overflow-hidden bg-[#1a1a1e]" style={{ minHeight: 360 }}>
          <TopCanvas scene={scene} />
        </div>
      </div>
    </div>
  );
}

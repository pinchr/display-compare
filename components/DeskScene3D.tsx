"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
const PERSON_EYE_H = 125; // cm, seated eye level

// ─── 3D Scene ─────────────────────────────────────────────────────────────────

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

function SceneObjects({ scene }: { scene: SceneState }) {
  const deskTopY = scene.deskHeightCm;
  const eyeZ = HEAD_Z_CM;

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.9} color="#ffffff" />
      <directionalLight position={[0, 200, scene.headDistance + scene.deskDepthCm / 2]} intensity={0.8} />
      <hemisphereLight args={["#8888ff", "#444422", 0.4]} />

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

      {/* Desk */}
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={scene.deskHeightCm} />

      {/* Monitors */}
      {scene.monitors.map((m) => (
        <MonitorModel key={m.id} layout={m} deskTopY={deskTopY} />
      ))}

      {/* Person */}
      <Person eyeZ={eyeZ} />
    </>
  );
}

// ─── Camera components ─────────────────────────────────────────────────────────

function FrontCameraController({ scene }: { scene: SceneState }) {
  const camRef = useRef<PerspectiveCamera>(null!);
  const initialized = useRef(false);

  useFrame(() => {
    if (!initialized.current && camRef.current) {
      const cam = camRef.current;
      cam.position.set(0, PERSON_EYE_H, scene.headDistance - 20);
      cam.lookAt(0, scene.deskHeightCm + 10, scene.headDistance + scene.deskDepthCm / 2);
      cam.fov = 50;
      cam.near = 1;
      cam.far = 500;
      cam.updateProjectionMatrix();
      initialized.current = true;
    }
  });

  return <perspectiveCamera ref={camRef} args={[50, 1, 1, 500]} />;
}

function TopCameraController() {
  const camRef = useRef<OrthographicCamera>(null!);
  const initialized = useRef(false);

  useFrame(() => {
    if (!initialized.current && camRef.current) {
      const cam = camRef.current;
      cam.position.set(0, 280, 140);
      cam.lookAt(0, 0, 150);
      cam.left = -200;
      cam.right = 200;
      cam.top = 200;
      cam.bottom = -200;
      cam.zoom = 3;
      cam.near = 0.1;
      cam.far = 500;
      cam.updateProjectionMatrix();
      initialized.current = true;
    }
  });

  return <orthographicCamera ref={camRef} args={[-200, 200, 200, -200, 0.1, 500]} />;
}

// ─── Canvas wrappers ──────────────────────────────────────────────────────────

function FrontCanvas({ scene }: { scene: SceneState }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#1a1a20", borderRadius: 8, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => { gl.setClearColor("#1a1a20"); }}
      >
        <FrontCameraController scene={scene} />
        <SceneObjects scene={scene} />
      </Canvas>
    </div>
  );
}

function TopCanvas({ scene }: { scene: SceneState }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#1a1a20", borderRadius: 8, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => { gl.setClearColor("#1a1a20"); }}
      >
        <TopCameraController />
        <SceneObjects scene={scene} />
      </Canvas>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene }: DeskScene3DProps) {
  return (
    <div className="flex gap-2" style={{ height: 390 }}>
      <div className="flex-1 flex flex-col">
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Front View</div>
        <div className="flex-1 rounded-xl border border-border overflow-hidden">
          <FrontCanvas scene={scene} />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top View</div>
        <div className="flex-1 rounded-xl border border-border overflow-hidden">
          <TopCanvas scene={scene} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
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
// useThree inside Canvas children to configure the default camera

function FrontCameraSetup({ scene }: { scene: SceneState }) {
  const { camera } = useThree() as { camera: PerspectiveCamera };
  useEffect(() => {
    camera.position.set(0, PERSON_EYE_H, scene.headDistance - 20);
    camera.lookAt(0, scene.deskHeightCm + 10, scene.headDistance + scene.deskDepthCm / 2);
    camera.updateProjectionMatrix();
  }, [camera, scene.headDistance, scene.deskHeightCm, scene.deskDepthCm]);
  return null;
}

function TopCameraSetup() {
  const { camera } = useThree() as { camera: OrthographicCamera };
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.position.set(0, 280, 140);
    cam.left = -200;
    cam.right = 200;
    cam.top = 200;
    cam.bottom = -200;
    cam.zoom = 3;
    cam.lookAt(0, 0, 150);
    cam.updateProjectionMatrix();
  }, [camera]);
  return null;
}

// ─── Canvas wrappers ──────────────────────────────────────────────────────────

function FrontCanvas({ scene }: { scene: SceneState }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#2a1a1a", borderRadius: 8, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, PERSON_EYE_H, scene.headDistance - 20], fov: 50, near: 1, far: 500 }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor("#2a1a1a", 1);
          const cam = camera as PerspectiveCamera;
          cam.lookAt(0, scene.deskHeightCm + 10, scene.headDistance + scene.deskDepthCm / 2);
          cam.updateProjectionMatrix();
          gl.render(threeScene, camera);
        }}
      >
        <FrontCameraSetup scene={scene} />
        <SceneObjects scene={scene} />
      </Canvas>
    </div>
  );
}

function TopCanvas({ scene }: { scene: SceneState }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0a1a0a", borderRadius: 8, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl, scene: threeScene, camera }) => {
          gl.setClearColor("#0a1a0a", 1);
          const cam = camera as OrthographicCamera;
          cam.position.set(0, 280, 140);
          cam.left = -180;
          cam.right = 180;
          cam.top = 180;
          cam.bottom = -180;
          cam.lookAt(0, 0, 150);
          cam.updateProjectionMatrix();
          gl.render(threeScene, camera);
        }}
      >
        <TopCameraSetup />
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
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Front View</div>
        <div className="rounded-xl border border-border overflow-hidden" style={{ height: 380 }}>
          <FrontCanvas scene={scene} />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">Top View</div>
        <div className="rounded-xl border border-border overflow-hidden" style={{ height: 380 }}>
          <TopCanvas scene={scene} />
        </div>
      </div>
    </div>
  );
}

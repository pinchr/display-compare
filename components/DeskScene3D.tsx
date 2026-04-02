"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, OrthographicCamera } from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Monitor } from "@/lib/monitors/types";
import { calcWidthCm, calcHeightCm } from "@/lib/monitors/calculations";

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

const WALL_GAP_CM = 5
const BODY_OFFSET_CM = 10
const MONITOR_BACK_OFFSET = 15
const MONITOR_STAND_H = 3
const PERSON_EYE_H = 105
const ROOM_DEPTH_CM = 400

function derivePositions(scene: SceneState) {
  const deskBackZ  = WALL_GAP_CM
  const deskFrontZ = WALL_GAP_CM + scene.deskDepthCm
  const minObsZ    = deskFrontZ + BODY_OFFSET_CM
  const naturalMonitorZ = deskBackZ + MONITOR_BACK_OFFSET
  const naturalObsZ     = naturalMonitorZ + scene.headDistance
  const observerZ = Math.max(minObsZ, naturalObsZ)
  const rawMonitorZ     = observerZ - scene.headDistance
  const baseMonitorZ    = Math.max(deskBackZ + 5, Math.min(deskFrontZ - 5, rawMonitorZ))
  const actualDistance  = Math.round(observerZ - baseMonitorZ)
  return { deskBackZ, deskFrontZ, observerZ, baseMonitorZ, actualDistance }
}

interface DragState {
  monitorId: string;
  startMouseX: number;
  startMouseY: number;
  startXCm: number;
  startZCm: number;
}

function Desk({ width, depth, height, backZ }: { width: number; depth: number; height: number; backZ: number }) {
  const centerZ = backZ + depth / 2
  return (
    <group>
      <mesh position={[0, height, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#8B7355" roughness={0.75} />
      </mesh>
      {([[-width/2+3, backZ+3],[width/2-3, backZ+3],[-width/2+3, backZ+depth-3],[width/2-3, backZ+depth-3]] as [number,number][]).map(([x,z],i) => (
        <mesh key={i} position={[x, height/2, z]}>
          <boxGeometry args={[2.5, height, 2.5]} />
          <meshStandardMaterial color="#3a3a4a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function MonitorModel({ layout, deskTopY, baseMonitorZ, isDragging, onPointerDown }: {
  layout: MonitorLayout3D; deskTopY: number; baseMonitorZ: number;
  isDragging: boolean; onPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const m = layout.monitor;
  const isPortrait = layout.rotation === 90;
  const wCm = isPortrait ? calcHeightCm(m.diagonal, m.widthPx, m.heightPx) : calcWidthCm(m.diagonal, m.widthPx, m.heightPx);
  const hCm = isPortrait ? calcWidthCm(m.diagonal, m.widthPx, m.heightPx) : calcHeightCm(m.diagonal, m.widthPx, m.heightPx);
  const dCm = MONITOR_STAND_H;
  return (
    <group
      position={[layout.xCm, deskTopY + (layout.yCm ?? 0) + hCm/2, baseMonitorZ + (layout.zCm ?? 0) + dCm/2]}
      rotation={[0, ((layout.yawDeg ?? 0) * Math.PI) / 180, 0]}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(layout.id, e); }}
    >
      <group rotation={[0, isPortrait ? Math.PI/2 : 0, 0]}>
        <mesh>
          <boxGeometry args={[wCm, hCm, dCm]} />
          <meshStandardMaterial color={isDragging ? "#3a3a50" : "#1e1e24"} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, dCm/2+0.05]}>
          <planeGeometry args={[wCm-0.8, hCm-0.8]} />
          <meshStandardMaterial color="#080810" emissive="#1a2a55" emissiveIntensity={0.4} roughness={0.05} metalness={0.95} />
        </mesh>
        <mesh position={[0, -hCm/2-1.5, 0]}>
          <boxGeometry args={[wCm*0.25, 3, dCm*1.2]} />
          <meshStandardMaterial color="#2a2a32" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Person({ observerZ }: { observerZ: number }) {
  return (
    <group position={[0, 0, observerZ]}>
      <mesh position={[0, PERSON_EYE_H, 0]}>
        <sphereGeometry args={[7, 16, 16]} />
        <meshStandardMaterial color="#ddb898" roughness={0.9} />
      </mesh>
      <mesh position={[-3, PERSON_EYE_H+1, 6]}><sphereGeometry args={[1.2, 8, 8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[3, PERSON_EYE_H+1, 6]}><sphereGeometry args={[1.2, 8, 8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, PERSON_EYE_H-30, 0]}>
        <cylinderGeometry args={[10, 8, 40, 12]} />
        <meshStandardMaterial color="#3366aa" roughness={0.95} />
      </mesh>
    </group>
  );
}

function SceneObjects({ scene, draggingId, showPerson, positions, lightsConfig, onMonitorPointerDown }: {
  scene: SceneState; draggingId: string | null; showPerson: boolean;
  positions: ReturnType<typeof derivePositions>;
  lightsConfig: { ambient: boolean; ceiling: boolean; desk: boolean };
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const { deskBackZ, observerZ, baseMonitorZ } = positions;
  return (
    <>
      {lightsConfig.ambient && <ambientLight intensity={1.2} />}
      {lightsConfig.ceiling && <directionalLight position={[60, 300, observerZ]} intensity={1.2} castShadow />}
      {lightsConfig.desk && <pointLight position={[0, 180, (deskBackZ+observerZ)/2]} intensity={0.8} color="#ffeecc" />}
      <mesh position={[0, 120, 0]}><planeGeometry args={[600, 240]} /><meshStandardMaterial color="#2a2a32" /></mesh>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, ROOM_DEPTH_CM/2]}>
        <planeGeometry args={[600, ROOM_DEPTH_CM]} />
        <meshStandardMaterial color="#2e2e38" roughness={1} />
      </mesh>
      <Desk width={scene.deskWidthCm} depth={scene.deskDepthCm} height={scene.deskHeightCm} backZ={deskBackZ} />
      {scene.monitors.map((m) => (
        <MonitorModel key={m.id} layout={m} deskTopY={scene.deskHeightCm} baseMonitorZ={baseMonitorZ} isDragging={draggingId === m.id} onPointerDown={onMonitorPointerDown} />
      ))}
      {showPerson && <Person observerZ={observerZ} />}
    </>
  );
}

function FrontCameraSetup({ positions }: { positions: ReturnType<typeof derivePositions> }) {
  const { camera } = useThree() as { camera: PerspectiveCamera };
  const { observerZ, baseMonitorZ } = positions;
  useEffect(() => {
    camera.position.set(0, PERSON_EYE_H, observerZ);
    camera.lookAt(0, PERSON_EYE_H, baseMonitorZ);
    camera.fov = 55; camera.near = 1; camera.far = 1000;
    camera.updateProjectionMatrix();
  }, [camera, observerZ, baseMonitorZ]);
  return null;
}

function TopCameraSetup({ scene, positions }: { scene: SceneState; positions: ReturnType<typeof derivePositions> }) {
  const { camera } = useThree() as { camera: OrthographicCamera };
  const { deskBackZ, observerZ } = positions;
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const sceneDepth = observerZ - deskBackZ + 20;
    const cameraZ = deskBackZ + sceneDepth / 2;
    const halfW = Math.max(scene.deskWidthCm / 2 + 40, 160);
    const halfH = sceneDepth / 2 + 20;
    cam.position.set(0, 300, cameraZ);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, scene.deskHeightCm, cameraZ);
    cam.left = -halfW; cam.right = halfW;
    cam.top = halfH; cam.bottom = -halfH;
    cam.near = 1; cam.far = 1000;
    cam.updateProjectionMatrix();
  }, [camera, scene.deskWidthCm, scene.deskHeightCm, deskBackZ, observerZ]);
  return null;
}

function DragController({ dragging, scene, onUpdate }: {
  dragging: DragState | null; scene: SceneState;
  onUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  useEffect(() => {
    if (!dragging) return;
    const CM_PER_PX = 0.3;
    const handleMove = (e: PointerEvent) => {
      const dx = (e.clientX - dragging.startMouseX) * CM_PER_PX;
      const dz = -(e.clientY - dragging.startMouseY) * CM_PER_PX;
      const newXCm = Math.max(-scene.deskWidthCm/2+10, Math.min(scene.deskWidthCm/2-10, dragging.startXCm + dx));
      const maxZ = scene.deskDepthCm/2 - 5;
      const newZCm = Math.max(-maxZ, Math.min(maxZ, dragging.startZCm + dz));
      onUpdate(dragging.monitorId, newXCm, newZCm);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [dragging, scene.deskWidthCm, scene.deskDepthCm, onUpdate]);
  return null;
}

function FrontCanvas({ scene, positions, dragging, lightsConfig, onMonitorPointerDown, onDragUpdate }: {
  scene: SceneState; positions: ReturnType<typeof derivePositions>; dragging: DragState | null;
  lightsConfig: { ambient: boolean; ceiling: boolean; desk: boolean };
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Canvas style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, PERSON_EYE_H, positions.observerZ], fov: 55, near: 1, far: 1000 }}
        onCreated={({ gl }) => gl.setClearColor(0x1a1a24, 1)}>
        <FrontCameraSetup positions={positions} />
        <SceneObjects scene={scene} draggingId={dragging?.monitorId ?? null} showPerson={false} positions={positions} lightsConfig={lightsConfig} onMonitorPointerDown={onMonitorPointerDown} />
        <DragController dragging={dragging} scene={scene} onUpdate={onDragUpdate} />
      </Canvas>
    </div>
  );
}

function TopCanvas({ scene, positions, dragging, lightsConfig, onMonitorPointerDown, onDragUpdate }: {
  scene: SceneState; positions: ReturnType<typeof derivePositions>; dragging: DragState | null;
  lightsConfig: { ambient: boolean; ceiling: boolean; desk: boolean };
  onMonitorPointerDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onDragUpdate: (id: string, xCm: number, zCm: number) => void;
}) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>
      <Canvas style={{ width: "100%", height: "100%" }} orthographic
        camera={{ position: [0, 300, 100], near: 1, far: 1000 }}
        onCreated={({ gl }) => gl.setClearColor(0x141820, 1)}>
        <TopCameraSetup scene={scene} positions={positions} />
        <SceneObjects scene={scene} draggingId={dragging?.monitorId ?? null} showPerson={true} positions={positions} lightsConfig={lightsConfig} onMonitorPointerDown={onMonitorPointerDown} />
        <DragController dragging={dragging} scene={scene} onUpdate={onDragUpdate} />
      </Canvas>
    </div>
  );
}

export interface DeskScene3DProps {
  scene: SceneState;
  onSceneChange: (s: SceneState) => void;
}

export default function DeskScene3D({ scene, onSceneChange }: DeskScene3DProps) {
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [lights, setLights] = useState({ ambient: true, ceiling: true, desk: true });

  const toggleLight = (key: keyof typeof lights) => setLights(prev => ({ ...prev, [key]: !prev[key] }));
  const positions = useMemo(() => derivePositions(scene), [scene.headDistance, scene.deskDepthCm, scene.deskHeightCm]);

  const handleMonitorPointerDown = useCallback((id: string, e: ThreeEvent<PointerEvent>) => {
    const monitor = scene.monitors.find(m => m.id === id);
    if (!monitor) return;
    setDragging({ monitorId: id, startMouseX: e.nativeEvent?.clientX ?? 0, startMouseY: e.nativeEvent?.clientY ?? 0, startXCm: monitor.xCm, startZCm: monitor.zCm });
  }, [scene.monitors]);

  const handleDragUpdate = useCallback((id: string, xCm: number, zCm: number) => {
    onSceneChange({ ...scene, monitors: scene.monitors.map(m => m.id === id ? { ...m, xCm, zCm } : m) });
  }, [scene, onSceneChange]);

  useEffect(() => {
    if (!dragging) return;
    const handleUp = () => setDragging(null);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, [dragging]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Light toggles */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
        <span style={{ fontSize: 9, color: "#888", textTransform: "uppercase" }}>Światło:</span>
        {(["ambient", "ceiling", "desk"] as const).map(key => (
          <button key={key} onClick={() => toggleLight(key)}
            style={{
              padding: "4px 10px", fontSize: 9, borderRadius: 6, border: "1px solid",
              background: lights[key] ? "#2a3a4a" : "#1a1a1a",
              borderColor: lights[key] ? "#4a6a8a" : "#333",
              color: lights[key] ? "#8ab" : "#555",
              cursor: "pointer"
            }}>
            {key === "ambient" ? "💡 Rozp." : key === "ceiling" ? "🔆 Sufit" : "🪫 Biurko"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">
          Front 3D — {positions.actualDistance}cm do monitorów
        </div>
        <div style={{ height: 380, background: "#1a1a22", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <FrontCanvas scene={scene} positions={positions} dragging={dragging} lightsConfig={lights} onMonitorPointerDown={handleMonitorPointerDown} onDragUpdate={handleDragUpdate} />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1 text-center">
          Top 3D — biurko przy ścianie północnej
        </div>
        <div style={{ height: 380, background: "#1a1a22", borderRadius: 12 }} className="rounded-xl border border-border overflow-hidden">
          <TopCanvas scene={scene} positions={positions} dragging={dragging} lightsConfig={lights} onMonitorPointerDown={handleMonitorPointerDown} onDragUpdate={handleDragUpdate} />
        </div>
      </div>
      </div>
    </div>
  );
}
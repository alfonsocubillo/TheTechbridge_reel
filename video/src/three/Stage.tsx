import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame} from 'remotion';
import {Environment, Grid, Lightformer, PerspectiveCamera} from '@react-three/drei';
import * as THREE from 'three';
import {matcap} from './matcap';

export type Vec3 = [number, number, number];
export type Cam = {pos: Vec3; target: Vec3; fov?: number};

const camDist = (c: Cam) => Math.hypot(c.pos[0] - c.target[0], c.pos[1] - c.target[1], c.pos[2] - c.target[2]);

/** Cámara: posición y punto al que mira, calculados fuera a partir del fotograma. */
const CameraRig: React.FC<{cam: Cam}> = ({cam}) => {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  useLayoutEffect(() => {
    ref.current?.lookAt(...cam.target);
  });
  return <PerspectiveCamera ref={ref} makeDefault fov={cam.fov ?? 32} near={0.1} far={80} position={cam.pos} />;
};

/** Partículas de luz que suben despacio. Movidas por el fotograma, nunca por el reloj. */
const Dust: React.FC<{color: string; count?: number}> = ({color, count = 220}) => {
  const f = useCurrentFrame();
  const seeds = useMemo(() => {
    const r = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({length: count}, (_, i) => [r(i) * 22 - 11, r(i + 99) * 9 - 2, r(i + 7) * 18 - 14, 0.004 + r(i + 3) * 0.012]);
  }, [count]);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  useLayoutEffect(() => {
    const pos = new Float32Array(count * 3);
    seeds.forEach(([x, y, z, v], i) => {
      pos[i * 3] = x + Math.sin(f * 0.01 + i) * 0.2;
      pos[i * 3 + 1] = ((y + f * v + 2) % 9) - 2;
      pos[i * 3 + 2] = z;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }, [f, geo, seeds, count]);
  return (
    <points geometry={geo}>
      <pointsMaterial color={color} size={0.045} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
};

/** Plató 3D: iluminación de estudio con reflejos, suelo con rejilla que se desvanece, niebla y partículas. */
export const Stage: React.FC<{
  width: number;
  height: number;
  bg: string;
  accentA: string;
  accentB: string;
  cam: Cam;
  floor?: boolean;
  /** Fracción de la resolución a la que se pinta el 3D. En GitHub no hay tarjeta gráfica: 0.5 = 4 veces menos píxeles. */
  dpr?: number;
  env?: boolean;
  dust?: boolean;
  children?: React.ReactNode;
}> = ({width, height, bg, accentA, accentB, cam, floor = true, dpr = 0.5, env = false, dust = true, children}) => (
  <ThreeCanvas width={width} height={height} gl={{antialias: false, alpha: true, powerPreference: 'high-performance'}} dpr={dpr} style={{position: 'absolute', inset: 0}}>
    <CameraRig cam={cam} />
    {/* La niebla acompaña a la cámara: el objeto se ve igual de nítido esté cerca o lejos */}
    <fog attach="fog" args={[bg, camDist(cam) - 3, camDist(cam) + 16]} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[3, 6, 5]} intensity={1.6} />
    <pointLight position={[-4, 2, 3]} intensity={18} distance={14} color={accentA} />
    <pointLight position={[4, 1, -2]} intensity={14} distance={14} color={accentB} />
    {env && <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.6} position={[0, 5, -6]} scale={[12, 3, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={2.2} position={[-7, 1.5, 0]} rotation-y={Math.PI / 2} scale={[10, 2.5, 1]} color={accentA} />
      <Lightformer form="rect" intensity={2.2} position={[7, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[10, 2.5, 1]} color={accentB} />
      <Lightformer form="ring" intensity={1.6} position={[0, 6, 5]} scale={5} color="#ffffff" />
      <Lightformer form="rect" intensity={0.8} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color={bg} />
    </Environment>}
    {floor && (
      <>
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]}>
          <circleGeometry args={[30, 64]} />
          <meshLambertMaterial color={bg} />
        </mesh>
        <Grid
          position={[0, -1.59, 0]}
          args={[60, 60]}
          cellSize={0.6}
          cellThickness={0.6}
          cellColor={accentA}
          sectionSize={3}
          sectionThickness={1}
          sectionColor={accentB}
          fadeDistance={22}
          fadeStrength={1.6}
        />
      </>
    )}
    {dust && <Dust color={accentB} />}
    {children}
  </ThreeCanvas>
);

/** Material "producto premium": matcap de estudio (brillo, contorno y reflejo de ventana) sin coste de iluminación. */
export const Gloss: React.FC<{color: string; metal?: number; rough?: number; emissive?: string; glow?: number; opacity?: number}> = ({
  color, rough = 0.22, glow = 0, opacity = 1,
}) => {
  const tex = useMemo(() => matcap(color, rough, glow), [color, rough, glow]);
  return <meshMatcapMaterial matcap={tex} transparent={opacity < 1} opacity={opacity} />;
};

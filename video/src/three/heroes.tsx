import React, {useMemo} from 'react';
import {Line, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {Gloss} from './Stage';
import {bubbleGeo, sparkleGeo} from './shapes';

/** t = fotograma global; appear = 0→1 cuando el objeto entra (a partir de ahí sigue animado con t). */
export type HeroProps = {t: number; a: string; b: string; appear: number};
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const PAPER = '#eef2ff';
const INK = '#2b3553';

/** Bocadillo de chat con tres puntos "escribiendo". */
const Bubble: React.FC<{
  t: number;
  color: string;
  dots: string;
  position: [number, number, number];
  flip?: boolean;
  delay?: number;
  appear: number;
}> = ({t, color, dots, position, flip, delay = 0, appear}) => {
  const geo = useMemo(() => bubbleGeo(1.15, 0.72), []);
  const p = Math.max(0.001, easeOut((appear * 40 - delay) / 18));
  return (
    <group position={position} scale={[flip ? -p : p, p, p]} rotation={[0, flip ? 0.35 : -0.35, Math.sin(t * 0.04 + delay) * 0.05]}>
      <mesh geometry={geo}>
        <Gloss color={color} rough={0.18} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 0.26, 0, 0.14]} scale={0.9 + 0.35 * Math.max(0, Math.sin(t * 0.18 - i * 0.9))}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color={dots} emissive={dots} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

/** IA (Copilot, ChatGPT): esfera luminosa con anillos orbitando y bocadillos de chat. */
export const AIOrb: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const s = 0.3 + 0.7 * easeOut(appear);
  return (
    <group scale={s}>
      <group rotation-y={t * 0.008}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <Gloss color={a} metal={0.15} rough={0.1} emissive={a} glow={0.45} />
        </mesh>
        <mesh scale={1.08}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial color={b} transparent opacity={0.16} roughness={0} depthWrite={false} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[1.1 + i * 0.55, t * 0.014 * (i % 2 ? 1 : -1) + i * 2, 0.25 * i]}>
            <mesh>
              <torusGeometry args={[1.55 + i * 0.3, 0.016, 12, 180]} />
              <meshStandardMaterial color="#ffffff" emissive={i === 1 ? b : a} emissiveIntensity={1.4} />
            </mesh>
            <mesh position={[1.55 + i * 0.3, 0, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color="#ffffff" emissive={b} emissiveIntensity={2.5} />
            </mesh>
          </group>
        ))}
      </group>
      <Bubble t={t} color="#f8faff" dots={a} position={[-1.75, 1.25, 0.6]} appear={appear} delay={8} />
      <Bubble t={t} color={b} dots="#ffffff" position={[1.8, -0.75, 0.7]} appear={appear} delay={16} flip />
    </group>
  );
};

/** Excel: hoja de cálculo cuyas celdas se convierten en barras. */
export const SheetGrid: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const cols = 6;
  const rows = 7;
  const grow = easeOut((appear * 40 - 14) / 26);
  return (
    <group rotation={[-0.62, 0.42, 0.12]} scale={0.95}>
      <RoundedBox args={[cols * 0.5 + 0.3, rows * 0.36 + 0.5, 0.08]} radius={0.06} position={[0, 0.08, -0.08]}>
        <Gloss color="#0f1a35" metal={0.4} rough={0.3} />
      </RoundedBox>
      <RoundedBox args={[cols * 0.5 + 0.1, 0.22, 0.06]} radius={0.04} position={[0, rows * 0.18 + 0.12, 0.02]}>
        <Gloss color={a} emissive={a} glow={0.3} />
      </RoundedBox>
      {Array.from({length: cols * rows}, (_, k) => {
        const c = k % cols;
        const r = Math.floor(k / cols);
        const x = (c - (cols - 1) / 2) * 0.5;
        const y = (r - (rows - 1) / 2) * 0.36;
        const hot = c === 4 && r < 5;
        const enter = Math.max(0.001, easeOut((appear * 40 - (c + r) * 0.9) / 10));
        const h = hot ? 0.05 + grow * (0.25 + ((r * 37) % 7) * 0.12) : 0.04;
        const wave = Math.sin(t * 0.07 + c * 0.7 + r * 0.5) * 0.015;
        return (
          <RoundedBox key={k} args={[0.44, 0.3, h]} radius={0.02} position={[x, y, h / 2 + wave]} scale={enter}>
            <Gloss color={hot ? b : '#dfe7ff'} emissive={hot ? b : '#000000'} glow={hot ? 0.35 : 0} rough={hot ? 0.15 : 0.4} />
          </RoundedBox>
        );
      })}
    </group>
  );
};

/** Correo (Outlook): sobre que se abre, carta que sale y aviso de mensaje nuevo. */
export const Envelope: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const open = easeOut((appear * 40 - 10) / 18);
  const letter = easeOut((appear * 40 - 18) / 16);
  const badge = Math.max(0.001, easeOut((appear * 40 - 26) / 8));
  const flap = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.15, 0);
    s.lineTo(1.15, 0);
    s.lineTo(0, -0.85);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2});
  }, []);
  return (
    <group rotation={[0.08, -0.35 + Math.sin(t * 0.02) * 0.08, 0.04]} scale={0.3 + 0.7 * easeOut(appear * 2)}>
      <RoundedBox args={[2.0, 1.25 + letter * 0.9, 0.03]} radius={0.02} position={[0, 0.1 + letter * 0.45, -0.02]}>
        <meshStandardMaterial color={PAPER} roughness={0.6} />
      </RoundedBox>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.2, 0.62 + letter * 0.7 - i * 0.2, 0.0]}>
          <boxGeometry args={[i === 0 ? 1.0 : 1.4 - i * 0.15, i === 0 ? 0.09 : 0.055, 0.005]} />
          <meshStandardMaterial color={i === 0 ? a : INK} />
        </mesh>
      ))}
      <RoundedBox args={[2.3, 1.5, 0.14]} radius={0.06} position={[0, -0.2, 0.07]}>
        <Gloss color="#f4f7ff" rough={0.25} />
      </RoundedBox>
      <group position={[0, 0.55, 0.15]} rotation-x={-open * 2.7}>
        <mesh geometry={flap}>
          <Gloss color={a} rough={0.2} />
        </mesh>
      </group>
      <mesh position={[1.1, 0.5, 0.25]} scale={badge}>
        <sphereGeometry args={[0.26, 32, 32]} />
        <Gloss color="#ef4444" emissive="#ef4444" glow={0.5} />
      </mesh>
      {[0, 1].map((i) => (
        <group
          key={i}
          position={[Math.cos(t * 0.02 + i * 3) * 2.6, 0.9 - i * 1.6, -1.2 + Math.sin(t * 0.02 + i * 3)]}
          scale={0.32 * badge}
          rotation-y={0.5}
        >
          <RoundedBox args={[2.3, 1.5, 0.14]} radius={0.06}>
            <Gloss color={i ? b : '#f4f7ff'} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
};

/** Reuniones (Teams): mosaico de videollamada con quien habla resaltado. */
export const MeetingGrid: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const tones = [a, b, '#f59e0b', '#ec4899'];
  const speaker = Math.floor(t / 45) % 4;
  return (
    <group rotation={[-0.12, -0.38, 0.03]}>
      {tones.map((tone, i) => {
        const x = i % 2 ? 0.86 : -0.86;
        const y = i < 2 ? 0.6 : -0.6;
        const enter = Math.max(0.001, easeOut((appear * 40 - i * 4) / 14));
        const live = i === speaker;
        return (
          <group key={i} position={[x, y, live ? 0.12 : 0]} scale={enter}>
            <RoundedBox args={[1.62, 1.08, 0.08]} radius={0.08}>
              <Gloss color="#111a33" metal={0.5} rough={0.35} />
            </RoundedBox>
            {live && (
              <RoundedBox args={[1.72, 1.18, 0.05]} radius={0.1} position={[0, 0, -0.03]}>
                <meshStandardMaterial color={b} emissive={b} emissiveIntensity={1.6 + Math.sin(t * 0.3) * 0.4} />
              </RoundedBox>
            )}
            <mesh position={[0, 0.12, 0.2]}>
              <sphereGeometry args={[0.2, 32, 32]} />
              <Gloss color={tone} rough={0.3} />
            </mesh>
            <mesh position={[0, -0.32, 0.12]} scale={[0.42, 0.26, 0.18]}>
              <sphereGeometry args={[1, 32, 32]} />
              <Gloss color={tone} rough={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Datos (Power BI): barras que crecen y línea de tendencia. */
export const BarChart: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const heights = [0.7, 1.1, 0.9, 1.6, 2.1];
  const grow = (i: number) => easeOut((appear * 40 - 6 - i * 3) / 16);
  const tops = heights.map((h, i) => new THREE.Vector3((i - 2) * 0.62, -0.93 + Math.max(0.02, h * grow(i)) + 0.18, 0));
  const lineOn = easeOut((appear * 40 - 26) / 10);
  return (
    <group rotation={[0.1, -0.5 + Math.sin(t * 0.015) * 0.06, 0]}>
      <RoundedBox args={[3.6, 0.14, 1.4]} radius={0.06} position={[0, -1.0, 0]}>
        <Gloss color="#111a33" metal={0.5} rough={0.3} />
      </RoundedBox>
      {heights.map((h, i) => {
        const hh = Math.max(0.02, h * grow(i));
        return (
          <RoundedBox key={i} args={[0.44, hh, 0.44]} radius={Math.min(0.05, hh / 2.2)} position={[(i - 2) * 0.62, -0.93 + hh / 2, 0]}>
            <Gloss color={i === 4 ? b : a} emissive={i === 4 ? b : a} glow={i === 4 ? 0.5 : 0.18} />
          </RoundedBox>
        );
      })}
      {lineOn > 0.01 && (
        <>
          <Line points={tops} color="#ffffff" lineWidth={5} transparent opacity={lineOn} />
          <mesh position={tops[4]} scale={0.14 * lineOn}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color="#ffffff" emissive={b} emissiveIntensity={3} />
          </mesh>
        </>
      )}
    </group>
  );
};

/** Documentos (Word, SharePoint, OneDrive): páginas en abanico con un destello de IA. */
export const Documents: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const fan = easeOut((appear * 40 - 4) / 20);
  const star = useMemo(() => sparkleGeo(0.42), []);
  return (
    <group rotation={[-0.08, -0.3 + Math.sin(t * 0.02) * 0.06, 0]}>
      {[3, 2, 1, 0].map((i) => (
        <group key={i} position={[(i - 1.5) * 0.32 * fan, -i * 0.04, -i * 0.12]} rotation-z={(1.5 - i) * 0.13 * fan}>
          <RoundedBox args={[1.6, 2.1, 0.035]} radius={0.015}>
            <meshStandardMaterial color={i === 0 ? '#ffffff' : PAPER} roughness={0.55} />
          </RoundedBox>
          {i === 0 &&
            [0, 1, 2, 3, 4, 5, 6].map((l) => (
              <mesh key={l} position={[l === 0 ? -0.22 : -0.02 - (l % 3) * 0.08, 0.75 - l * 0.22, 0.025]}>
                <boxGeometry args={[l === 0 ? 0.9 : 1.2 - (l % 3) * 0.16, l === 0 ? 0.12 : 0.055, 0.005]} />
                <meshStandardMaterial color={l === 0 ? a : INK} />
              </mesh>
            ))}
        </group>
      ))}
      <mesh geometry={star} position={[0.95, 1.15, 0.5]} rotation={[0, t * 0.03, t * 0.01]} scale={Math.max(0.001, easeOut((appear * 40 - 20) / 10))}>
        <Gloss color={b} emissive={b} glow={0.9} />
      </mesh>
    </group>
  );
};

/** Presentaciones (PowerPoint): diapositivas girando en carrusel. */
export const Slides: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const enter = easeOut(appear * 1.6);
  return (
    <group rotation-x={-0.1}>
      {[0, 1, 2, 3, 4].map((i) => {
        const ang = (i / 5) * Math.PI * 2 + t * 0.012;
        return (
          <group key={i} position={[Math.sin(ang) * 1.9 * enter, Math.sin(ang * 2) * 0.1, Math.cos(ang) * 1.9 * enter - 0.6]} rotation-y={ang}>
            <RoundedBox args={[1.7, 1.0, 0.04]} radius={0.015}>
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </RoundedBox>
            <mesh position={[-0.2, 0.3, 0.03]}>
              <boxGeometry args={[1.1, 0.13, 0.01]} />
              <meshStandardMaterial color={i % 2 ? a : b} />
            </mesh>
            <mesh position={[0.45, -0.15, 0.03]}>
              <boxGeometry args={[0.6, 0.45, 0.01]} />
              <meshStandardMaterial color={i % 2 ? b : a} emissive={i % 2 ? b : a} emissiveIntensity={0.3} />
            </mesh>
            {[0, 1, 2].map((l) => (
              <mesh key={l} position={[-0.42, 0.02 - l * 0.13, 0.03]}>
                <boxGeometry args={[0.6, 0.045, 0.01]} />
                <meshStandardMaterial color={INK} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

/** Automatización (Power Automate, Power Apps): red de nodos con impulsos viajando. */
export const Network: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const nodes = useMemo(
    () =>
      ([[0, 0, 0], [1.6, 0.9, -0.3], [-1.5, 1.0, 0.2], [1.3, -1.1, 0.4], [-1.4, -0.9, -0.4], [0.2, 1.7, -0.6], [0.1, -1.8, 0.1]] as [
        number,
        number,
        number,
      ][]).map((p) => new THREE.Vector3(...p)),
    [],
  );
  const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 5], [3, 6], [4, 6], [1, 3]];
  const on = easeOut(appear * 1.5);
  return (
    <group rotation-y={t * 0.006} scale={0.4 + 0.6 * on}>
      {edges.map(([i, j], k) => (
        <Line key={k} points={[nodes[i], nodes[j]]} color={k % 2 ? a : b} lineWidth={3} transparent opacity={0.8 * on} />
      ))}
      {edges.map(([i, j], k) => {
        const u = (t * 0.022 + k * 0.37) % 1;
        return (
          <mesh key={`p${k}`} position={nodes[i].clone().lerp(nodes[j], u)}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#ffffff" emissive={b} emissiveIntensity={3} />
          </mesh>
        );
      })}
      {nodes.map((p, i) => (
        <mesh key={`n${i}`} position={p} scale={i === 0 ? 0.42 : 0.2}>
          <sphereGeometry args={[1, 32, 32]} />
          <Gloss color={i === 0 ? a : i % 2 ? b : '#e8eeff'} emissive={i === 0 ? a : '#000000'} glow={i === 0 ? 0.5 : 0} />
        </mesh>
      ))}
    </group>
  );
};

/** Formas pequeñas flotando alrededor del plató: dan profundidad y paralaje en todas las escenas. */
const FLOAT = [
  {k: 'cube', r: 5.6, ang: 0.5, y: 2.6, s: 0.42, c: 0},
  {k: 'sphere', r: 6.4, ang: 1.4, y: -0.6, s: 0.34, c: 1},
  {k: 'torus', r: 5.2, ang: 2.3, y: 1.6, s: 0.48, c: 2},
  {k: 'cube', r: 7.0, ang: 3.0, y: 0.3, s: 0.34, c: 1},
  {k: 'sphere', r: 5.5, ang: -0.4, y: 3.2, s: 0.26, c: 0},
  {k: 'pill', r: 6.2, ang: -1.2, y: -1.0, s: 0.42, c: 2},
  {k: 'torus', r: 7.4, ang: -2.0, y: 2.2, s: 0.4, c: 0},
  {k: 'cube', r: 4.8, ang: -2.7, y: 3.6, s: 0.3, c: 2},
  {k: 'sphere', r: 8.0, ang: 0.9, y: 4.2, s: 0.5, c: 1},
  {k: 'pill', r: 8.4, ang: -0.9, y: 4.6, s: 0.36, c: 0},
] as const;

export const Floaters: React.FC<HeroProps> = ({t, a, b, appear}) => {
  const colors = [a, b, '#e8eeff'];
  return (
    <>
      {FLOAT.map((it, i) => {
        const s = it.s * 1.4 * Math.max(0.001, easeOut(appear * 1.4 - i * 0.06));
        const pos: [number, number, number] = [Math.sin(it.ang) * it.r, it.y + Math.sin(t * 0.035 + i * 1.7) * 0.18, Math.cos(it.ang) * it.r - 2.5];
        const rot: [number, number, number] = [t * 0.011 + i, t * 0.017 + i * 2, 0.3 * i];
        return (
          <group key={i} position={pos} rotation={rot} scale={s}>
            {it.k === 'cube' && (
              <RoundedBox args={[1, 1, 1]} radius={0.22} smoothness={4}>
                <Gloss color={colors[it.c]} rough={0.15} />
              </RoundedBox>
            )}
            {it.k === 'sphere' && (
              <mesh>
                <sphereGeometry args={[0.6, 32, 32]} />
                <Gloss color={colors[it.c]} rough={0.12} />
              </mesh>
            )}
            {it.k === 'torus' && (
              <mesh>
                <torusGeometry args={[0.55, 0.2, 24, 48]} />
                <Gloss color={colors[it.c]} rough={0.15} />
              </mesh>
            )}
            {it.k === 'pill' && (
              <mesh rotation-z={Math.PI / 2}>
                <capsuleGeometry args={[0.28, 0.7, 8, 24]} />
                <Gloss color={colors[it.c]} rough={0.15} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
};

export const HEROES = {
  ia: AIOrb,
  excel: SheetGrid,
  correo: Envelope,
  reuniones: MeetingGrid,
  datos: BarChart,
  documentos: Documents,
  presentaciones: Slides,
  automatizacion: Network,
} as const;
export type HeroKey = keyof typeof HEROES;
export const HERO_KEYS = Object.keys(HEROES) as HeroKey[];

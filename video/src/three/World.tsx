import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, Scene, SceneType} from '../types';
import {Stage, type Cam, type Vec3} from './Stage';
import {Floaters, HEROES, easeOut, type HeroKey} from './heroes';

/**
 * Encuadre de cada escena pensado en PÍXELES DE PANTALLA: dónde queda el objeto 3D (x, y) y qué alto tiene (size).
 * Regla: el objeto nunca va detrás del texto.
 *  · Escenas con poco texto (gancho, cita, cierre): grande, en la zona libre de arriba.
 *  · Escenas con tarjetas o mucho texto: pequeño, arriba a la derecha (junto a la cabecera, donde no hay nada).
 * el = altura de la cámara (radianes) · az = giro alrededor del objeto.
 */
type Shot = {x: number; y: number; size: number; el: number; az: number};
const SMALL = {x: 852, y: 300, size: 230};
const SHOTS: Record<SceneType | 'intro', Shot> = {
  intro: {x: 540, y: 640, size: 120, el: 0.3, az: -0.6},
  hook: {x: 540, y: 600, size: 600, el: 0.14, az: 0.15},
  quote: {x: 540, y: 560, size: 520, el: 0.16, az: 0.35},
  outro: {x: 540, y: 590, size: 600, el: 0.1, az: 0.0},
  stat: {...SMALL, el: 0.2, az: 0.55},
  broll: {x: 862, y: 268, size: 170, el: 0.2, az: -0.35},
  list: {...SMALL, el: 0.22, az: 0.75},
  compare: {...SMALL, el: 0.2, az: -0.6},
  prompt: {...SMALL, el: 0.22, az: -0.2},
};

const HERO_UNITS = 3.2; // alto aproximado de los objetos en unidades 3D
const FOV = 40;
const PPU_AT_1 = 960 / Math.tan((FOV / 2) * (Math.PI / 180)); // píxeles por unidad a distancia 1
const HERO: Vec3 = [0, 0.6, 0];

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const mix = (a: Shot, b: Shot, p: number): Shot => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  size: Math.exp(lerp(Math.log(a.size), Math.log(b.size), p)),
  el: lerp(a.el, b.el, p),
  az: lerp(a.az, b.az, p),
});

/** Coloca la cámara para que el objeto aparezca exactamente en (x, y) con ese tamaño. */
const shotToCam = (s: Shot): Cam => {
  const dist = (HERO_UNITS * PPU_AT_1) / s.size;
  const ppu = PPU_AT_1 / dist;
  const ox = (s.x - 540) / ppu;
  const oy = (960 - s.y) / ppu;
  const dir: Vec3 = [Math.cos(s.el) * Math.sin(s.az), Math.sin(s.el), Math.cos(s.el) * Math.cos(s.az)];
  const fwd: Vec3 = [-dir[0], -dir[1], -dir[2]];
  // derecha = fwd × arriba(0,1,0); arriba de cámara = derecha × fwd
  const rl = Math.hypot(fwd[2], fwd[0]) || 1;
  const right: Vec3 = [-fwd[2] / rl, 0, fwd[0] / rl];
  const up: Vec3 = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0],
  ];
  const target: Vec3 = [0, 1, 2].map((k) => HERO[k] - right[k] * ox - up[k] * oy) as Vec3;
  const pos: Vec3 = [0, 1, 2].map((k) => target[k] + dir[k] * dist) as Vec3;
  return {pos, target, fov: FOV};
};

/** Cámara continua: en cada corte viaja al encuadre de la nueva escena, con un vaivén suave. */
export const cameraAt = (f: number, scenes: Pick<Scene, 'type' | 'from' | 'durationInFrames'>[], introFrames = 30): Cam => {
  const idx = Math.max(0, scenes.findIndex((s) => f >= s.from && f < s.from + s.durationInFrames));
  const cur = scenes[idx] ?? scenes[scenes.length - 1];
  const prev = idx === 0 ? SHOTS.intro : SHOTS[scenes[idx - 1].type];
  const blend = idx === 0 ? introFrames : 14;
  const p = interpolate(f - (cur?.from ?? 0), [0, blend], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const shot = mix(prev, SHOTS[cur?.type ?? 'hook'], p);
  return shotToCam({...shot, az: shot.az * 0.8 + Math.sin(f / 150) * 0.16});
};

/** El mundo 3D de fondo de todo el Reel: plató + objeto del producto + cámara. */
export const World: React.FC<{brand: Brand; hero: string; scenes: Scene[]; heroFrom?: number}> = ({brand, hero, scenes, heroFrom = 30}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const Hero = HEROES[(hero in HEROES ? hero : 'ia') as HeroKey];
  // Pequeño "latido" del objeto en cada corte
  const cut = scenes.reduce((acc, s) => (f >= s.from ? s.from : acc), 0);
  const beat = interpolate(f - cut, [0, 5, 16], [1.06, 0.97, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Stage width={width} height={height} bg={brand.bg} accentA={brand.accentA} accentB={brand.accentB} cam={cameraAt(f, scenes)}>
      <group position={HERO} scale={(f > heroFrom + 30 ? beat : 1) * Math.max(0.001, easeOut((f - heroFrom) / 16))}>
        <Hero t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - heroFrom) / 40)} />
      </group>
      <Floaters t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - heroFrom - 10) / 30)} />
    </Stage>
  );
};

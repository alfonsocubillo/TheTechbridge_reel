import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, Scene, SceneType} from '../types';
import {Stage, type Cam} from './Stage';
import {Floaters, HEROES, easeOut, type HeroKey} from './heroes';

/**
 * Encuadre de cada tipo de escena alrededor del objeto protagonista (en el origen, a y=0.6).
 * dist: distancia de la cámara · el: altura · ty: punto al que mira (más bajo = el objeto sube en pantalla)
 * En las escenas con tarjetas el objeto se aleja y queda detrás, como fondo con profundidad.
 */
type Shot = {dist: number; el: number; ty: number; az: number; fov: number};
const SHOTS: Record<SceneType | 'intro', Shot> = {
  intro: {dist: 26, el: 3.0, ty: -0.9, az: -0.6, fov: 40},
  hook: {dist: 13, el: 1.6, ty: -0.95, az: 0.15, fov: 40},
  stat: {dist: 24, el: 3.0, ty: -0.2, az: 0.55, fov: 40},
  broll: {dist: 20, el: 2.5, ty: -0.4, az: -0.35, fov: 40},
  list: {dist: 19, el: 3.2, ty: -0.4, az: 0.75, fov: 40},
  compare: {dist: 19, el: 2.8, ty: -0.4, az: -0.6, fov: 40},
  quote: {dist: 14, el: 2.0, ty: -1.3, az: 0.35, fov: 40},
  prompt: {dist: 20, el: 3.0, ty: -0.4, az: -0.2, fov: 40},
  outro: {dist: 12, el: 1.0, ty: -1.2, az: 0.0, fov: 40},
};

const mix = (a: Shot, b: Shot, p: number): Shot => ({
  dist: a.dist + (b.dist - a.dist) * p,
  el: a.el + (b.el - a.el) * p,
  ty: a.ty + (b.ty - a.ty) * p,
  az: a.az + (b.az - a.az) * p,
  fov: a.fov + (b.fov - a.fov) * p,
});

/** Cámara continua: viaja de un encuadre al siguiente en cada corte y nunca se queda quieta. */
export const cameraAt = (f: number, scenes: Pick<Scene, 'type' | 'from' | 'durationInFrames'>[], introFrames = 22): Cam => {
  const idx = Math.max(0, scenes.findIndex((s) => f >= s.from && f < s.from + s.durationInFrames));
  const cur = scenes[idx] ?? scenes[scenes.length - 1];
  const prevShot = idx === 0 ? SHOTS.intro : SHOTS[scenes[idx - 1].type];
  const blend = idx === 0 ? introFrames : 20;
  const p = interpolate(f - (cur?.from ?? 0), [0, blend], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const shot = mix(prevShot, SHOTS[cur?.type ?? 'hook'], p);
  const az = shot.az * 0.8 + Math.sin(f / 150) * 0.18; // vaivén suave: siempre se ve la cara buena del objeto
  return {
    pos: [Math.sin(az) * shot.dist, 0.6 + shot.el, Math.cos(az) * shot.dist],
    target: [0, 0.6 + shot.ty, 0],
    fov: shot.fov,
  };
};

/** El mundo 3D de fondo de todo el Reel: plató + objeto del producto + cámara. */
export const World: React.FC<{brand: Brand; hero: string; scenes: Scene[]; heroFrom?: number}> = ({brand, hero, scenes, heroFrom = 14}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const Hero = HEROES[(hero in HEROES ? hero : 'ia') as HeroKey];
  // Pequeño "latido" del objeto en cada corte
  const cut = scenes.reduce((acc, s) => (f >= s.from ? s.from : acc), 0);
  const beat = interpolate(f - cut, [0, 5, 16], [1.06, 0.97, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Stage width={width} height={height} bg={brand.bg} accentA={brand.accentA} accentB={brand.accentB} cam={cameraAt(f, scenes)}>
      <group position={[0, 0.6, 0]} scale={(f > heroFrom + 30 ? beat : 1) * Math.max(0.001, easeOut((f - heroFrom) / 16))}>
        <Hero t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - heroFrom) / 40)} />
      </group>
      <Floaters t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - heroFrom - 10) / 30)} />
    </Stage>
  );
};

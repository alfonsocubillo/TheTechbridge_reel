import type {CSSProperties} from 'react';
import {Easing, interpolate, spring} from 'remotion';
import {loadFont as loadDisplay} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as loadBody} from '@remotion/google-fonts/Inter';

// Solo los pesos y alfabetos que se usan: menos descargas al arrancar cada render
export const DISPLAY = loadDisplay('normal', {weights: ['600', '700'], subsets: ['latin', 'latin-ext']}).fontFamily;
export const BODY = loadBody('normal', {weights: ['500', '600', '700', '800'], subsets: ['latin', 'latin-ext']}).fontFamily;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const sp = (frame: number, fps: number, delay = 0, damping = 200, mass = 1) =>
  spring({frame: frame - delay, fps, config: {damping, mass}});

/** Entrada típica: sube, se enfoca y aparece. */
export const fadeUp = (frame: number, fps: number, delay = 0, distance = 60): CSSProperties => {
  const p = sp(frame, fps, delay, 18, 0.6);
  const o = interpolate(frame - delay, [0, 8], [0, 1], clamp);
  return {
    opacity: o,
    transform: `translateY(${(1 - p) * distance}px)`,
    filter: `blur(${(1 - Math.min(p, 1)) * 14}px)`,
  };
};

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const gradientText = (a: string, b: string): CSSProperties => ({
  backgroundImage: `linear-gradient(100deg, ${a}, ${b})`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
});

export const headlineSize = (text: string) => {
  const n = text.length;
  if (n <= 22) return 150;
  if (n <= 38) return 128;
  if (n <= 56) return 106;
  return 90;
};

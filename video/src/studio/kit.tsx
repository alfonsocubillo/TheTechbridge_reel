import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile} from 'remotion';
import {loadFont as loadTight} from '@remotion/google-fonts/InterTight';
import {loadFont as loadPoppins} from '@remotion/google-fonts/Poppins';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadUnbounded} from '@remotion/google-fonts/Unbounded';
import {loadFont as loadFraunces} from '@remotion/google-fonts/Fraunces';
import {loadFont as loadArchivo} from '@remotion/google-fonts/Archivo';

/**
 * Kit del estudio: fuentes, paletas y piezas comunes.
 *
 * Dos identidades separadas a propósito:
 *  · FEED (Reels, carruseles y portadas): azul noche, Inter Tight + Poppins, un color pastel por familia de
 *    contenido. Es lo que se ve en la cuadrícula del perfil y tiene que parecer una sola marca.
 *  · HISTORIAS: cada modelo tiene su propio carácter (colores vivos, otras tipografías). Nunca usan el
 *    lenguaje del feed, para que los dos canales no se confundan.
 */
const latin = {subsets: ['latin', 'latin-ext'] as ('latin' | 'latin-ext')[]};
export const TIGHT = loadTight('normal', {weights: ['700', '800', '900'], ...latin}).fontFamily;
export const POP = loadPoppins('normal', {weights: ['500', '600', '700'], ...latin}).fontFamily;
export const INTER = loadInter('normal', {weights: ['400', '500', '600', '700', '800'], ...latin}).fontFamily;
export const MONO = loadMono('normal', {weights: ['500', '700', '800'], ...latin}).fontFamily;
export const UNB = loadUnbounded('normal', {weights: ['500', '700', '900'], ...latin}).fontFamily;
export const SERIF = loadFraunces('normal', {weights: ['600', '800', '900'], ...latin}).fontFamily;
export const SERIF_I = loadFraunces('italic', {weights: ['600', '800'], ...latin}).fontFamily;
export const ARCH = loadArchivo('normal', {weights: ['700', '800', '900'], ...latin}).fontFamily;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ───────────────────────── Colores de marca y de cada aplicación ─────────────────────────

/** Paleta de thetechbridgesolution.com: degradado #015DAC → #267FCB, carbón del logo y violeta secundario. */
export const BRAND = {
  blue: '#267FCB',
  deep: '#015DAC',
  light: '#5AAEEE', // el azul de marca aclarado para leerse bien sobre fondo oscuro
  sky: '#A9D4F7',
  navy: '#03132A',
  charcoal: '#282828',
  violet: '#5F2DDE',
  violetLight: '#9D86F5',
};

/** Cuando el contenido va de una aplicación con color propio, se usa el suyo (accent = sobre oscuro, deep = sobre claro). */
export const APPS: Record<string, {accent: string; deep: string}> = {
  excel: {accent: '#33C481', deep: '#1D6F42'},
  word: {accent: '#41A5EE', deep: '#185ABD'},
  powerpoint: {accent: '#FF8F6B', deep: '#C43E1C'},
  outlook: {accent: '#28A8EA', deep: '#0F6CBD'},
  teams: {accent: '#7B83EB', deep: '#4B53BC'},
  onenote: {accent: '#CA64EA', deep: '#7719AA'},
  sharepoint: {accent: '#37C6D0', deep: '#036C70'},
  onedrive: {accent: '#28A8EA', deep: '#0364B8'},
  powerbi: {accent: '#F2C811', deep: '#9E7F00'},
  powerautomate: {accent: '#5C9DFF', deep: '#0066FF'},
  chatgpt: {accent: '#19C37D', deep: '#0E8C69'},
  gemini: {accent: '#8AB4F8', deep: '#1A73E8'},
  github: {accent: '#A371F7', deep: '#6E40C9'},
};

export type Theme = {accent: string; deep: string; grad: [string, string]; app: string | null};

export const theme = (app?: string | null): Theme => {
  const a = app ? APPS[app] : undefined;
  return a ? {accent: a.accent, deep: a.deep, grad: [a.deep, a.accent], app: app ?? null} : {accent: BRAND.light, deep: BRAND.blue, grad: [BRAND.deep, BRAND.blue], app: null};
};

// ───────────────────────── Feed ─────────────────────────

export const FEED = {
  bg: BRAND.navy,
  bg2: '#0A2448',
  text: '#FFFFFF',
  muted: '#93A6C2',
  line: '#24476E',
  outline: '#2F5F8E',
  card: '#FFFFFF',
  ink: '#0A1F3D',
  cobalt: BRAND.deep,
};

/** Familias del feed: mismo color (el de la marca o el de la app), cambian el rótulo y el glifo de fondo. */
export const FAMILIES: Record<string, {label: string; glyph: string}> = {
  tutorial: {label: 'TUTORIAL', glyph: '→'},
  noticia: {label: 'NOTICIA', glyph: '!'},
  comparativa: {label: 'COMPARATIVA', glyph: 'VS'},
  analisis: {label: 'ANÁLISIS', glyph: '%'},
  prompting: {label: 'PROMPTING', glyph: '/'},
  curiosidad: {label: 'CURIOSIDAD', glyph: '?'},
};
export const family = (key?: string, app?: string | null) => ({...(FAMILIES[key ?? ''] ?? FAMILIES.tutorial), accent: theme(app).accent});

/** Fondo del feed: azul noche con dos halos suaves (como la referencia). */
export const FeedBg: React.FC<{glow?: string; flip?: boolean}> = ({glow = BRAND.deep, flip}) => (
  <AbsoluteFill
    style={{
      background: [
        `radial-gradient(ellipse 70% 50% at ${flip ? '100% 100%' : '0% 100%'}, ${glow}55 0%, transparent 70%)`,
        `radial-gradient(ellipse 60% 40% at ${flip ? '0% 0%' : '100% 0%'}, ${glow}30 0%, transparent 70%)`,
        FEED.bg,
      ].join(', '),
    }}
  />
);

export const Lockup: React.FC<{x?: number; y?: number; size?: number; color?: string}> = ({x = 90, y = 70, size = 31, color = '#fff'}) => (
  <div style={{position: 'absolute', left: x, top: y, fontFamily: POP, fontWeight: 600, fontSize: size, color, letterSpacing: 0.2}}>
    The TechBridge Solution
  </div>
);

export const PageCount: React.FC<{i: number; n: number; y?: number; right?: number; color?: string}> = ({i, n, y = 70, right = 90, color = FEED.muted}) => (
  <div style={{position: 'absolute', right, top: y, fontFamily: POP, fontWeight: 700, fontSize: 31, color, letterSpacing: 3}}>
    {String(i).padStart(2, '0')} / {String(n).padStart(2, '0')}
  </div>
);

/** Cifra o símbolo gigante solo con contorno, de fondo. */
export const OutlineGlyph: React.FC<{text: string; x: number; y: number; size: number; color?: string; stroke?: number; font?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number}> = ({
  text, x, y, size, color = FEED.outline, stroke = 3, font = TIGHT, anchor = 'start', opacity = 1,
}) => (
  <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity}} width={1} height={1}>
    <text x={x} y={y} fontFamily={font} fontWeight={900} fontSize={size} fill="none" stroke={color} strokeWidth={stroke} textAnchor={anchor} letterSpacing={-size * 0.04}>
      {text}
    </text>
  </svg>
);

export const Spaced: React.FC<{children: React.ReactNode; color: string; size?: number; spacing?: number; font?: string; weight?: number; style?: React.CSSProperties}> = ({
  children, color, size = 31, spacing = 8, font = POP, weight = 700, style,
}) => <div style={{fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: spacing, color, ...style}}>{children}</div>;

export const TagPill: React.FC<{label: string; color: string; size?: number}> = ({label, color, size = 34}) => (
  <div style={{display: 'inline-flex', padding: `${size * 0.42}px ${size * 0.7}px`, borderRadius: 999, border: `3px solid ${color}`, fontFamily: POP, fontWeight: 700, fontSize: size, letterSpacing: size * 0.18, color, lineHeight: 1}}>
    {label}
  </div>
);

/** Raíl inferior con punto (firma visual del feed). */
export const Rail: React.FC<{y: number; color: string; from?: number; to?: number; dot?: number; width?: number}> = ({y, color, from = 0, to = 990, dot = 90, width = 1080}) => (
  <>
    <div style={{position: 'absolute', left: from, top: y, width: Math.min(to, width) - from, height: 2, background: FEED.line}} />
    <div style={{position: 'absolute', left: dot - 10, top: y - 9, width: 20, height: 20, borderRadius: '50%', background: color}} />
  </>
);

// ───────────────────────── Texto ─────────────────────────

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}%]/gu, '');

/** Pinta en `color` las palabras de `text` que forman `highlight` (si aparece). */
export const Hi: React.FC<{text: string; highlight?: string; color: string; style?: React.CSSProperties}> = ({text, highlight, color, style}) => {
  if (!highlight) return <span style={style}>{text}</span>;
  const words = text.split(' ');
  const target = highlight.split(' ').map(norm);
  let start = -1;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((t, k) => norm(words[i + k]) === t)) {
      start = i;
      break;
    }
  }
  return (
    <span style={style}>
      {words.map((w, i) => (
        <span key={i} style={{color: start >= 0 && i >= start && i < start + target.length ? color : undefined}}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
};

/** Estimación del número de líneas (sin medir el DOM) para elegir tamaños que siempre caben. */
export const lines = (text: string, width: number, size: number, k: number): number => {
  let n = 1;
  let cur = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const ww = w.length * size * k;
    if (cur === 0) cur = ww;
    else if (cur + size * 0.28 + ww <= width) cur += size * 0.28 + ww;
    else {
      n += 1;
      cur = ww;
    }
  }
  return n;
};

export const fit = (text: string, width: number, max: number, min: number, maxLines: number, k = 0.56): number => {
  const longest = Math.max(...text.split(/\s+/).map((w) => w.length), 1);
  for (let s = max; s > min; s -= 2) if (lines(text, width, s, k) <= maxLines && longest * s * k <= width) return s;
  return min;
};

// ───────────────────────── Sonido ─────────────────────────

export type Cue = {at: number; sfx: string; vol?: number};

export const SfxTrack: React.FC<{cues: Cue[]; total: number}> = ({cues, total}) => (
  <>
    {cues
      .filter((c) => c.at >= 0 && c.at < total - 2)
      .map((c, i) => (
        <Sequence key={i} from={Math.round(c.at)} durationInFrames={Math.min(120, total - Math.round(c.at))}>
          <Audio src={staticFile(`lib/sfx/${c.sfx}.wav`)} volume={c.vol ?? 0.5} />
        </Sequence>
      ))}
  </>
);

/** Música con entrada y salida suaves; `ducks` = fotogramas en los que baja un momento (golpes, silencios). */
export const Music: React.FC<{src?: string; total: number; volume?: number; startFrom?: number; ducks?: number[]; silence?: [number, number][]}> = ({
  src, total, volume = 0.5, startFrom = 0, ducks = [], silence = [],
}) => {
  if (!src) return null;
  return (
    <Audio
      src={staticFile(src)}
      startFrom={startFrom}
      volume={(f) => {
        const base = interpolate(f, [0, 15, total - 35, total], [0, volume, volume, 0], clamp);
        const duck = ducks.reduce((m, at) => Math.min(m, interpolate(f - at, [0, 3, 18], [1, 0.45, 1], clamp)), 1);
        const mute = silence.reduce((m, [a, b]) => Math.min(m, interpolate(f, [a - 8, a, b, b + 8], [1, 0.08, 0.08, 1], clamp)), 1);
        return base * duck * mute;
      }}
    />
  );
};

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity, mixBlendMode: 'overlay'}}>
    <Img src={staticFile('grain.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

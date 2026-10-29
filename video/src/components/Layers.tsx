import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, CaptionWord} from '../types';
import {BODY, DISPLAY, clamp, sp} from '../anim';

/** Fondo vivo: manchas de luz en movimiento + suelo de rejilla en perspectiva. */
export const Background: React.FC<{brand: Brand}> = ({brand}) => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, size: number, color: string, phase: number) => (
    <div
      style={{
        position: 'absolute',
        left: x + Math.sin(f / 70 + phase) * 140,
        top: y + Math.cos(f / 90 + phase) * 180,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}55 0%, ${color}00 70%)`,
        filter: 'blur(40px)',
      }}
    />
  );
  return (
    <AbsoluteFill style={{backgroundColor: brand.bg, overflow: 'hidden'}}>
      {blob(-200, 200, 1100, brand.accentA, 0)}
      {blob(400, 1000, 1200, brand.accentB, 2)}
      {blob(100, 1500, 900, brand.accentA, 4)}
      <div
        style={{
          position: 'absolute',
          left: -540,
          right: -540,
          bottom: -200,
          height: 1100,
          transform: 'perspective(900px) rotateX(68deg)',
          transformOrigin: 'bottom',
          backgroundImage: `linear-gradient(${brand.accentA}33 2px, transparent 2px), linear-gradient(90deg, ${brand.accentA}33 2px, transparent 2px)`,
          backgroundSize: '120px 120px',
          backgroundPositionY: `${(f * 3) % 120}px`,
          maskImage: 'linear-gradient(to top, black 10%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 85%)',
          opacity: 0.8,
        }}
      />
      <Particles brand={brand} />
      <HudArcs brand={brand} />
    </AbsoluteFill>
  );
};

const rand = (n: number) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** Partículas de luz que suben despacio (profundidad sin distraer). */
const Particles: React.FC<{brand: Brand}> = ({brand}) => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({length: 46}).map((_, i) => {
        const depth = 0.3 + rand(i + 3) * 0.7;
        const y = (rand(i) * 2200 - f * (0.6 + depth * 1.8)) % 2200;
        const size = 2 + depth * 5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: rand(i + 11) * 1080 + Math.sin(f / 40 + i) * 12,
              top: y < -100 ? y + 2200 : y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: i % 3 === 0 ? brand.accentB : '#ffffff',
              opacity: 0.12 + depth * 0.35,
              boxShadow: `0 0 ${size * 3}px ${i % 3 === 0 ? brand.accentB : brand.accentA}`,
            }}
          />
        );
      })}
    </>
  );
};

/** Arcos concéntricos girando: estética de interfaz/HUD. */
const HudArcs: React.FC<{brand: Brand}> = ({brand}) => {
  const f = useCurrentFrame();
  return (
    <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: 0.22}}>
      <g transform={`translate(860 520) rotate(${f * 0.4})`}>
        <circle r="300" fill="none" stroke={brand.accentA} strokeWidth="2" strokeDasharray="4 14" />
      </g>
      <g transform={`translate(860 520) rotate(${-f * 0.7})`}>
        <circle r="380" fill="none" stroke={brand.accentB} strokeWidth="3" strokeDasharray="220 520" />
      </g>
      <g transform={`translate(160 1500) rotate(${f * 0.5})`}>
        <circle r="240" fill="none" stroke={brand.accentB} strokeWidth="2" strokeDasharray="120 280" />
      </g>
    </svg>
  );
};

/** Clip de stock con movimiento de cámara lento y etalonaje de marca. */
export const Broll: React.FC<{src: string; brand: Brand; dur: number; dim?: number}> = ({src, brand, dur, dim = 0.55}) => {
  const f = useCurrentFrame();
  const scale = interpolate(f, [0, dur], [1.12, 1.22], clamp);
  const x = interpolate(f, [0, dur], [-20, 20], clamp);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${x}px)`,
          filter: `saturate(0.75) contrast(1.12) brightness(${dim})`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${brand.bg}cc 0%, ${brand.bg}22 35%, ${brand.bg}33 60%, ${brand.bg}f0 100%)`,
        }}
      />
      <AbsoluteFill style={{background: `linear-gradient(135deg, ${brand.accentA}30, transparent 50%, ${brand.accentB}30)`, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

/** Grano de película + viñeta: quita el aspecto "plano digital". */
export const FilmFinish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="1080" height="1920" style={{position: 'absolute', opacity: 0.09, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Destello de luz en cada corte. */
export const FlashCut: React.FC<{brand: Brand}> = ({brand}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 3, 9], [0, 0.55, 0], clamp);
  const x = interpolate(f, [0, 9], [-600, 1400], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${brand.accentB}, transparent 65%)`, opacity: o}} />
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: x,
          width: 260,
          height: 2400,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
          opacity: o * 1.6,
        }}
      />
    </AbsoluteFill>
  );
};

/** Barra de progreso superior: retiene a la gente hasta el final. */
export const ProgressBar: React.FC<{brand: Brand}> = ({brand}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.08)'}}>
      <div
        style={{
          width: `${(f / durationInFrames) * 100}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${brand.accentA}, ${brand.accentB})`,
          boxShadow: `0 0 18px ${brand.accentB}`,
        }}
      />
    </div>
  );
};

/** Firma discreta de la marca. */
export const Watermark: React.FC<{brand: Brand; hideFrom: number}> = ({brand, hideFrom}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [10, 25, hideFrom - 10, hideFrom], [0, 0.75, 0.75, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top: 200,
        right: 70,
        opacity: o,
        fontFamily: BODY,
        fontWeight: 600,
        fontSize: 30,
        letterSpacing: 1,
        color: brand.text,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {brand.logo ? (
        <div style={{background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: '6px 10px', display: 'flex'}}>
          <Img src={staticFile(brand.logo)} style={{height: 34}} />
        </div>
      ) : (
        brand.handle
      )}
    </div>
  );
};

/** Subtítulos sincronizados palabra a palabra (solo con voz). */
export const Captions: React.FC<{words: CaptionWord[]; brand: Brand}> = ({words, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!words.length) return null;

  // Agrupamos en bloques de hasta 3 palabras, cortando en signos de puntuación
  const chunks: CaptionWord[][] = [];
  let cur: CaptionWord[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length === 3 || /[.,;:!?]$/.test(w.word)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);

  const chunk = chunks.find((c, i) => {
    const end = i + 1 < chunks.length ? chunks[i + 1][0].start : c[c.length - 1].end + 8;
    return f >= c[0].start && f < end;
  });
  if (!chunk) return null;
  const pop = sp(f, fps, chunk[0].start, 14, 0.5);

  return (
    <div
      style={{
        position: 'absolute',
        top: 1390,
        left: 60,
        right: 60,
        textAlign: 'center',
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 66,
        lineHeight: 1.15,
        textTransform: 'uppercase',
        transform: `scale(${0.85 + 0.15 * pop})`,
        textShadow: '0 6px 30px rgba(0,0,0,0.75)',
      }}
    >
      {chunk.map((w, i) => {
        const active = f >= w.start && f <= w.end + 2;
        return (
          <span key={i} style={{color: active ? brand.accentB : brand.text, marginRight: 18, display: 'inline-block'}}>
            {w.word.replace(/[,;:]$/, '')}
          </span>
        );
      })}
    </div>
  );
};

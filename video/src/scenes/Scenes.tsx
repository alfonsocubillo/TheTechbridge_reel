import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, SceneProps} from '../types';
import {BODY, DISPLAY, clamp, easeOut, fadeUp, gradientText, sp} from '../anim';

/**
 * Escenas del Reel (capa de texto). Debajo va siempre el mundo 3D con el objeto del producto.
 * Zona segura: Instagram tapa arriba (~200 px), abajo (~380 px) y la columna de botones de la derecha,
 * así que el texto vive entre x=80 y x=930.
 */
const LEFT = 80;
const WIDTH = 850;

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, '');

/** Etiqueta pequeña tipo píldora (la usan la portada y las historias). */
export const Kicker: React.FC<{label: string; a: string; delay?: number}> = ({label, a, delay = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = sp(f, fps, delay, 20);
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderRadius: 999,
        border: `2px solid ${a}88`, background: `${a}1f`, fontFamily: BODY, fontWeight: 700, fontSize: 30,
        letterSpacing: 6, color: '#fff', clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 999px)`,
      }}
    >
      <span style={{width: 16, height: 16, borderRadius: '50%', background: a, boxShadow: `0 0 ${10 + pulse * 18}px ${a}`}} />
      {label}
    </div>
  );
};

/** Palabras que entran una a una; la palabra clave va sobre una píldora de color (se lee mejor que un degradado). */
export const KineticText: React.FC<{
  text: string;
  highlight?: string;
  size: number;
  a: string;
  b: string;
  color: string;
  delay?: number;
  stagger?: number;
}> = ({text, highlight, size, a, b, color, delay = 0, stagger = 3}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const target = highlight ? norm(highlight.split(' ')[0]) : '';
  const words = text.split(' ');
  const exact = target ? words.findIndex((w) => norm(w) === target) : -1;
  const hotIdx = exact >= 0 ? exact : target ? words.findIndex((w) => norm(w).includes(target)) : -1;
  return (
    <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.08, letterSpacing: -size * 0.025, color}}>
      {words.map((w, i) => {
        const hot = i === hotIdx;
        const start = delay + i * stagger;
        const s = fadeUp(f, fps, start, 70);
        const pill = interpolate(f, [start + 4, start + 12], [0, 1], {...clamp, easing: easeOut});
        return (
          <span key={i} style={{display: 'inline-block', marginRight: size * 0.22, position: 'relative', ...s}}>
            {hot && (
              <span
                style={{
                  position: 'absolute', left: -size * 0.1, right: -size * 0.1, top: size * 0.08, bottom: -size * 0.02,
                  borderRadius: size * 0.16, background: `linear-gradient(100deg, ${a}, ${b})`,
                  transform: `scaleX(${pill})`, transformOrigin: 'left center', boxShadow: `0 0 ${size * 0.4}px ${a}88`,
                }}
              />
            )}
            <span style={{position: 'relative', color: hot ? '#ffffff' : color}}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

const titleSize = (text: string, max = 118) => {
  const n = text.length;
  if (n <= 18) return max;
  if (n <= 32) return Math.round(max * 0.92);
  if (n <= 48) return Math.round(max * 0.84);
  return Math.round(max * 0.74);
};

/** Tarjeta de cristal con entrada en 3D (gira desde atrás, como una ficha que se levanta). */
const Glass: React.FC<{p: number; children: React.ReactNode; style?: React.CSSProperties; hot?: string; from?: 'left' | 'right' | 'bottom'}> = ({
  p, children, style, hot, from = 'bottom',
}) => {
  const rot = from === 'bottom' ? `rotateX(${(1 - p) * 75}deg)` : `rotateY(${(1 - p) * (from === 'left' ? -70 : 70)}deg)`;
  return (
    <div style={{perspective: 1600}}>
      <div
        style={{
          transform: `${rot} translateZ(${(1 - p) * -200}px)`, transformOrigin: from === 'bottom' ? 'center bottom' : from === 'left' ? 'left center' : 'right center',
          opacity: Math.min(1, p * 1.6), borderRadius: 34, padding: '34px 40px',
          background: hot ? `linear-gradient(135deg, ${hot}40, rgba(255,255,255,0.06))` : 'rgba(14,20,44,0.72)',
          border: `2px solid ${hot ? `${hot}aa` : 'rgba(255,255,255,0.14)'}`,
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)${hot ? `, 0 0 60px ${hot}55` : ''}`,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ───────────────────────── HOOK ─────────────────────────
export const Hook: React.FC<SceneProps> = ({scene, brand}) => {
  const text = scene.text ?? '';
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: 1000}}>
        <KineticText text={text} highlight={scene.highlight} size={titleSize(text, 124)} a={brand.accentA} b={brand.accentB} color={brand.text} delay={24} />
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── STAT ─────────────────────────
export const Stat: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const raw = String(scene.value ?? '0').replace(',', '.');
  const value = parseFloat(raw) || 0;
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  const p = interpolate(f, [6, 46], [0, 1], {...clamp, easing: easeOut});
  const shown = (value * p).toLocaleString('es-ES', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  const isPct = (scene.suffix ?? '').includes('%') && value <= 100;
  const R = 300;
  const C = 2 * Math.PI * R;
  const len = shown.length + (scene.prefix?.length ?? 0) + (scene.suffix?.length ?? 0);
  const numSize = len > 7 ? 150 : len > 5 ? 190 : 240;
  const spin = sp(f, fps, 0, 14);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 540 - 380, top: 470, width: 760, height: 760, perspective: 1400}}>
        <div style={{width: '100%', height: '100%', transform: `rotateY(${(1 - spin) * 80}deg) scale(${0.75 + 0.25 * spin})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width="760" height="760" style={{position: 'absolute', transform: 'rotate(-90deg)'}}>
            <defs>
              <linearGradient id="ring" x1="0" x2="1">
                <stop offset="0%" stopColor={brand.accentA} />
                <stop offset="100%" stopColor={brand.accentB} />
              </linearGradient>
            </defs>
            <circle cx="380" cy="380" r={R} stroke="rgba(255,255,255,0.10)" strokeWidth="26" fill="rgba(7,11,24,0.35)" />
            <circle
              cx="380" cy="380" r={R} stroke="url(#ring)" strokeWidth="26" fill="none" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p * (isPct ? value / 100 : 1))}
              style={{filter: `drop-shadow(0 0 22px ${brand.accentB})`}}
            />
          </svg>
          <div style={{position: 'relative', fontFamily: DISPLAY, fontWeight: 700, fontSize: numSize, letterSpacing: -6, ...gradientText('#ffffff', brand.accentB)}}>
            {scene.prefix}{shown}{scene.suffix}
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH + 60, top: 1270, textAlign: 'center', fontFamily: BODY, fontWeight: 700, fontSize: 58, lineHeight: 1.2, color: brand.text, ...fadeUp(f, fps, 20)}}>
        {scene.label}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── BROLL (titular, con clip en una pantalla flotante si lo hay) ─────────────────────────
export const BrollScene: React.FC<SceneProps> = ({scene, brand, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = scene.title ?? '';
  const card = sp(f, fps, 0, 18);
  const tilt = interpolate(f, [0, dur], [-14, -4]);
  const hasVideo = Boolean(scene.video);
  const top = hasVideo ? 1150 : 860;
  return (
    <AbsoluteFill>
      {hasVideo && (
        <div style={{position: 'absolute', left: 110, top: 330, width: 860, height: 760, perspective: 1800}}>
          <div
            style={{
              width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', position: 'relative',
              transform: `rotateY(${tilt * card}deg) rotateX(${(1 - card) * 40 + 4}deg) translateZ(${(1 - card) * -400}px)`,
              opacity: card, border: '3px solid rgba(255,255,255,0.22)',
              boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 80px ${brand.accentA}55`,
            }}
          >
            <OffthreadVideo src={staticFile(scene.video!)} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.9) contrast(1.08)'}} />
            <div style={{position: 'absolute', inset: 0, background: `linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 30%, transparent 70%, ${brand.accentA}44 100%)`}} />
          </div>
        </div>
      )}
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top}}>
        <KineticText text={title} size={titleSize(title, hasVideo ? 96 : 116)} a={brand.accentA} b={brand.accentB} color={brand.text} delay={6} stagger={2} />
        {scene.subtitle && (
          <div style={{marginTop: 30, fontFamily: BODY, fontWeight: 600, fontSize: 48, lineHeight: 1.28, color: brand.muted, ...fadeUp(f, fps, 16, 30)}}>
            {scene.subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── LIST ─────────────────────────
export const LIST_ITEM_START = 10;
export const LIST_ITEM_GAP = 10;
export const List: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = (scene.items ?? []).slice(0, 4);
  const title = scene.title ?? '';
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: 420}}>
        <KineticText text={title} size={titleSize(title, 96)} a={brand.accentA} b={brand.accentB} color={brand.text} stagger={2} />
      </div>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: 680, display: 'flex', flexDirection: 'column', gap: 30}}>
        {items.map((it, i) => (
          <Glass key={i} p={sp(f, fps, LIST_ITEM_START + i * LIST_ITEM_GAP, 15, 0.7)} hot={i === items.length - 1 ? brand.accentA : undefined}>
            <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
              <div style={{minWidth: 80, height: 80, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, color: '#fff', boxShadow: `0 0 30px ${brand.accentA}88`}}>
                {i + 1}
              </div>
              <div style={{fontFamily: BODY, fontWeight: 700, fontSize: 50, lineHeight: 1.2, color: brand.text}}>{it}</div>
            </div>
          </Glass>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── COMPARE (antes / ahora) ─────────────────────────
export const Compare: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const before = sp(f, fps, 0, 16);
  const after = sp(f, fps, 16, 16);
  const vs = sp(f, fps, 26, 10, 0.5);
  const recede = interpolate(f, [16, 30], [0, 1], {...clamp, easing: easeOut});
  const block = (title: string, body: string, hot: boolean) => (
    <>
      <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 32, letterSpacing: 8, color: hot ? brand.accentB : brand.muted, marginBottom: 20}}>{title.toUpperCase()}</div>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, lineHeight: 1.1, letterSpacing: -1.5, color: hot ? brand.text : '#aab3d1'}}>{body}</div>
    </>
  );
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: 420, transform: `scale(${1 - recede * 0.06})`, opacity: 1 - recede * 0.35, filter: `saturate(${1 - recede * 0.8})`}}>
        <Glass p={before} from="left" style={{minHeight: 330, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          {block(scene.left_title ?? 'Antes', scene.left ?? '', false)}
        </Glass>
      </div>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: 880}}>
        <Glass p={after} from="right" hot={brand.accentA} style={{minHeight: 330, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          {block(scene.right_title ?? 'Ahora', scene.right ?? '', true)}
        </Glass>
      </div>
      <div
        style={{
          position: 'absolute', left: 540 - 66, top: 805, width: 132, height: 132, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, color: '#fff',
          transform: `scale(${vs}) rotateY(${(1 - vs) * 180}deg)`, boxShadow: `0 0 50px ${brand.accentA}`,
        }}
      >
        VS
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── QUOTE ─────────────────────────
export const Quote: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = (scene.text ?? '').split(' ');
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: 900}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 260, lineHeight: 0.6, height: 120, ...gradientText(brand.accentA, brand.accentB), ...fadeUp(f, fps, 0)}}>“</div>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: words.length > 12 ? 66 : 80, lineHeight: 1.12, letterSpacing: -1.5, color: brand.text}}>
          {words.map((w, i) => (
            <span key={i} style={{display: 'inline-block', marginRight: 18, ...fadeUp(f, fps, 6 + i * 2, 30)}}>{w}</span>
          ))}
        </div>
        {scene.source && (
          <div style={{marginTop: 36, fontFamily: BODY, fontSize: 38, fontWeight: 600, color: brand.muted, ...fadeUp(f, fps, 10 + words.length * 2)}}>— {scene.source}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── PROMPT (ventana de chat flotando en 3D) ─────────────────────────
export const promptTiming = (prompt: string) => {
  const typeEnd = 12 + Math.min(prompt.length * 0.9, 50);
  return {typeStart: 12, typeEnd, resultsStart: typeEnd + 22};
};
export const Prompt: React.FC<SceneProps> = ({scene, brand, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const prompt = scene.prompt ?? '';
  const {typeStart, typeEnd, resultsStart} = promptTiming(prompt);
  const chars = Math.floor(interpolate(f, [typeStart, typeEnd], [0, prompt.length], clamp));
  const caret = Math.floor(f / 8) % 2 === 0 && f < typeEnd + 6;
  const thinking = f > typeEnd + 4 && f < resultsStart;
  const win = sp(f, fps, 0, 16);
  const ry = interpolate(f, [0, dur], [-12, -5]);
  const angle = (f * 4) % 360;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 70, top: 420, width: 940, perspective: 1800}}>
        <div
          style={{
            padding: 3, borderRadius: 46, transformOrigin: 'center',
            background: `conic-gradient(from ${angle}deg, ${brand.accentA}, transparent 30%, ${brand.accentB}, transparent 70%, ${brand.accentA})`,
            transform: `rotateY(${ry}deg) rotateX(${(1 - win) * 50 + 5}deg) translateZ(${(1 - win) * -300}px)`, opacity: win,
            boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 80px ${brand.accentA}44`,
          }}
        >
          <div style={{borderRadius: 44, background: '#0b1124f2', padding: 44, display: 'flex', flexDirection: 'column', gap: 32}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{width: 20, height: 20, borderRadius: '50%', background: c}} />)}
              <span style={{marginLeft: 20, fontFamily: BODY, fontWeight: 700, fontSize: 32, color: brand.muted}}>{scene.app ?? 'Asistente IA'}</span>
            </div>
            <div style={{alignSelf: 'flex-end', maxWidth: 760, padding: '28px 34px', borderRadius: '34px 34px 8px 34px', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: BODY, fontWeight: 600, fontSize: 44, lineHeight: 1.3, color: '#fff'}}>
              {prompt.slice(0, chars)}
              {caret && <span style={{opacity: 0.9}}>▍</span>}
            </div>
            {thinking && (
              <div style={{display: 'flex', gap: 14, paddingLeft: 10}}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{width: 18, height: 18, borderRadius: '50%', background: brand.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin((f + i * 5) / 5))}} />
                ))}
              </div>
            )}
            <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
              {(scene.result ?? []).map((line, i) => (
                <div key={i} style={{display: 'flex', gap: 20, fontFamily: BODY, fontWeight: 600, fontSize: 44, lineHeight: 1.3, color: brand.text, ...fadeUp(f, fps, resultsStart + i * 8, 24)}}>
                  <span style={{color: brand.accentB}}>✓</span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── OUTRO ─────────────────────────
export const Outro: React.FC<SceneProps & {tagline?: string}> = ({scene, brand, tagline}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const flip = sp(f, fps, 4, 14, 0.7);
  const shine = interpolate(f, [16, 40], [-120, 220], clamp);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center', perspective: 1400}}>
        <div style={{position: 'relative', overflow: 'hidden', borderRadius: 34, background: 'rgba(255,255,255,0.96)', padding: '26px 40px', transform: `rotateY(${(1 - flip) * 90}deg)`, opacity: flip, boxShadow: `0 0 90px ${brand.accentA}88`}}>
          {brand.logo ? (
            <Img src={staticFile(brand.logo)} style={{height: 120, display: 'block'}} />
          ) : (
            <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, color: brand.bg}}>{brand.name}</div>
          )}
          <div style={{position: 'absolute', top: 0, bottom: 0, left: `${shine}%`, width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.85), transparent)'}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: LEFT, width: WIDTH + 60, top: 1170, textAlign: 'center'}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 74, lineHeight: 1.08, letterSpacing: -1.5, color: brand.text, ...fadeUp(f, fps, 12)}}>{scene.text}</div>
        {tagline && (
          <div style={{marginTop: 26, fontFamily: BODY, fontWeight: 600, fontSize: 36, lineHeight: 1.3, color: brand.muted, ...fadeUp(f, fps, 20)}}>{tagline}</div>
        )}
        <div style={{marginTop: 18, fontFamily: BODY, fontWeight: 700, fontSize: 40, ...gradientText(brand.accentA, brand.accentB), ...fadeUp(f, fps, 26)}}>{brand.handle}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Velo oscuro bajo la zona de texto: el texto se lee siempre, pase lo que pase en el 3D. */
export const TextScrim: React.FC<{brand: Brand}> = ({brand}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${brand.bg}00 0%, ${brand.bg}00 38%, ${brand.bg}b0 62%, ${brand.bg}e6 100%)`, pointerEvents: 'none'}} />
);

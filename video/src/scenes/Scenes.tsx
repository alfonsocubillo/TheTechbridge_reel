import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, SceneProps} from '../types';
import {BODY, DISPLAY, clamp, easeOut, fadeUp, gradientText, sp} from '../anim';
import {K_BODY, K_DISPLAY, fitSize} from '../fit';

/**
 * Escenas del Reel (capa de texto). Debajo va el mundo 3D, pero el objeto nunca queda detrás del texto
 * (ver three/World.tsx). Zona segura: Instagram tapa arriba (~200 px), abajo (desde ~1540 px) y la columna
 * de botones de la derecha, así que el texto vive entre x=80 y x=930 y termina antes de y=1520.
 *
 * Cada escena es UNA columna: los elementos se empujan unos a otros y no pueden montarse, y el tamaño de
 * letra se calcula para que cada texto quepa en un número máximo de líneas.
 */
const LEFT = 80;
const WIDTH = 850;

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, '');

/** Etiqueta pequeña tipo píldora. */
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
    <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.1, letterSpacing: -size * 0.025, color}}>
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

/** Columna de la escena: todo lo que va dentro se apila, nunca se superpone. */
const Column: React.FC<{top: number; gap?: number; children: React.ReactNode; align?: 'flex-start' | 'center'}> = ({
  top, gap = 32, children, align = 'flex-start',
}) => (
  <div style={{position: 'absolute', left: LEFT, width: WIDTH, top, display: 'flex', flexDirection: 'column', gap, alignItems: align}}>
    {children}
  </div>
);

/** Tarjeta casi opaca con entrada en 3D (gira desde atrás, como una ficha que se levanta). */
const Glass: React.FC<{p: number; children: React.ReactNode; style?: React.CSSProperties; hot?: string; from?: 'left' | 'right' | 'bottom'}> = ({
  p, children, style, hot, from = 'bottom',
}) => {
  const rot = from === 'bottom' ? `rotateX(${(1 - p) * 75}deg)` : `rotateY(${(1 - p) * (from === 'left' ? -70 : 70)}deg)`;
  return (
    <div style={{perspective: 1600, width: '100%'}}>
      <div
        style={{
          transform: `${rot} translateZ(${(1 - p) * -200}px)`,
          transformOrigin: from === 'bottom' ? 'center bottom' : from === 'left' ? 'left center' : 'right center',
          opacity: Math.min(1, p * 1.6), borderRadius: 34, padding: '30px 38px',
          background: hot ? `linear-gradient(135deg, ${hot}55, rgba(14,20,44,0.92) 70%)` : 'rgba(14,20,44,0.92)',
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
    <Column top={980}>
      <KineticText text={text} highlight={scene.highlight} size={fitSize(text, WIDTH, 124, 70, 4)} a={brand.accentA} b={brand.accentB} color={brand.text} delay={30} />
    </Column>
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
  const R = 290;
  const C = 2 * Math.PI * R;
  const full = `${scene.prefix ?? ''}${(value).toLocaleString('es-ES')}${scene.suffix ?? ''}`;
  const numSize = fitSize(full, 470, 230, 56, 1, 0.62);
  const spin = sp(f, fps, 0, 14);
  const label = scene.label ?? '';
  return (
    <Column top={420} align="center" gap={40}>
      <div style={{width: 720, height: 720, perspective: 1400}}>
        <div style={{width: '100%', height: '100%', position: 'relative', transform: `rotateY(${(1 - spin) * 80}deg) scale(${0.75 + 0.25 * spin})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width="720" height="720" style={{position: 'absolute', transform: 'rotate(-90deg)'}}>
            <defs>
              <linearGradient id="ring" x1="0" x2="1">
                <stop offset="0%" stopColor={brand.accentA} />
                <stop offset="100%" stopColor={brand.accentB} />
              </linearGradient>
            </defs>
            <circle cx="360" cy="360" r={R} stroke="rgba(255,255,255,0.10)" strokeWidth="26" fill="rgba(7,11,24,0.6)" />
            <circle
              cx="360" cy="360" r={R} stroke="url(#ring)" strokeWidth="26" fill="none" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p * (isPct ? value / 100 : 1))}
              style={{filter: `drop-shadow(0 0 22px ${brand.accentB})`}}
            />
          </svg>
          <div style={{position: 'relative', fontFamily: DISPLAY, fontWeight: 700, fontSize: numSize, letterSpacing: -6, ...gradientText('#ffffff', brand.accentB)}}>
            {scene.prefix}{shown}{scene.suffix}
          </div>
        </div>
      </div>
      <div style={{width: '100%', textAlign: 'center', fontFamily: BODY, fontWeight: 700, fontSize: fitSize(label, WIDTH, 58, 38, 3, K_BODY), lineHeight: 1.22, color: brand.text, ...fadeUp(f, fps, 20)}}>
        {label}
      </div>
    </Column>
  );
};

// ───────────────────────── BROLL (titular, con clip en una pantalla flotante si lo hay) ─────────────────────────
export const BrollScene: React.FC<SceneProps> = ({scene, brand, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = scene.title ?? '';
  const sub = scene.subtitle ?? '';
  const card = sp(f, fps, 0, 18);
  const tilt = interpolate(f, [0, dur], [-14, -4]);
  const hasVideo = Boolean(scene.video);
  return (
    <Column top={hasVideo ? 360 : 860} gap={28}>
      {hasVideo && (
        <div style={{width: '100%', height: 600, perspective: 1800, marginBottom: 12}}>
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
      <KineticText text={title} size={fitSize(title, WIDTH, hasVideo ? 96 : 116, 60, hasVideo ? 2 : 3)} a={brand.accentA} b={brand.accentB} color={brand.text} delay={6} stagger={2} />
      {sub && (
        <div style={{fontFamily: BODY, fontWeight: 600, fontSize: fitSize(sub, WIDTH, 48, 34, hasVideo ? 2 : 3, K_BODY), lineHeight: 1.28, color: brand.muted, ...fadeUp(f, fps, 6 + title.split(' ').length * 2 + 8, 30)}}>
          {sub}
        </div>
      )}
    </Column>
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
  const itemSize = Math.min(...items.map((it) => fitSize(it, WIDTH - 190, 50, 36, 2, K_BODY)), 50);
  return (
    <Column top={430} gap={24}>
      <div style={{marginBottom: 16}}>
        <KineticText text={title} size={fitSize(title, WIDTH, 96, 58, 2)} a={brand.accentA} b={brand.accentB} color={brand.text} stagger={2} />
      </div>
      {items.map((it, i) => (
        <Glass key={i} p={sp(f, fps, LIST_ITEM_START + i * LIST_ITEM_GAP, 15, 0.7)} hot={i === items.length - 1 ? brand.accentA : undefined}>
          <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
            <div style={{minWidth: 78, height: 78, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: '#fff', boxShadow: `0 0 30px ${brand.accentA}88`}}>
              {i + 1}
            </div>
            <div style={{fontFamily: BODY, fontWeight: 700, fontSize: itemSize, lineHeight: 1.2, color: brand.text}}>{it}</div>
          </div>
        </Glass>
      ))}
    </Column>
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
  const left = scene.left ?? '';
  const right = scene.right ?? '';
  const bodySize = Math.min(fitSize(left, WIDTH - 80, 64, 42, 3), fitSize(right, WIDTH - 80, 64, 42, 3));
  const block = (title: string, body: string, hot: boolean) => (
    <>
      <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 30, letterSpacing: 8, color: hot ? brand.accentB : brand.muted, marginBottom: 16}}>{title.toUpperCase()}</div>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: bodySize, lineHeight: 1.12, letterSpacing: -1.5, color: hot ? brand.text : '#aab3d1'}}>{body}</div>
    </>
  );
  return (
    <Column top={420} gap={0}>
      <div style={{width: '100%', transform: `scale(${1 - recede * 0.05})`, opacity: 1 - recede * 0.3, filter: `saturate(${1 - recede * 0.8})`}}>
        <Glass p={before} from="left">{block(scene.left_title ?? 'Antes', left, false)}</Glass>
      </div>
      {/* El "VS" ocupa su propio hueco entre las dos tarjetas */}
      <div style={{width: '100%', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            width: 124, height: 124, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, color: '#fff',
            transform: `scale(${vs}) rotateY(${(1 - vs) * 180}deg)`, boxShadow: `0 0 50px ${brand.accentA}`,
          }}
        >
          VS
        </div>
      </div>
      <Glass p={after} from="right" hot={brand.accentA}>{block(scene.right_title ?? 'Ahora', right, true)}</Glass>
    </Column>
  );
};

// ───────────────────────── QUOTE ─────────────────────────
export const Quote: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const text = scene.text ?? '';
  const words = text.split(' ');
  const size = fitSize(text, WIDTH, 80, 50, 5);
  return (
    <Column top={900} gap={20}>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 240, lineHeight: 0.6, height: 100, ...gradientText(brand.accentA, brand.accentB), ...fadeUp(f, fps, 0)}}>“</div>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.14, letterSpacing: -1.5, color: brand.text}}>
        {words.map((w, i) => (
          <span key={i} style={{display: 'inline-block', marginRight: size * 0.24, ...fadeUp(f, fps, 6 + i * 2, 30)}}>{w}</span>
        ))}
      </div>
      {scene.source && (
        <div style={{fontFamily: BODY, fontSize: 36, fontWeight: 600, color: brand.muted, ...fadeUp(f, fps, 10 + words.length * 2)}}>— {scene.source}</div>
      )}
    </Column>
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
  const results = scene.result ?? [];
  const {typeStart, typeEnd, resultsStart} = promptTiming(prompt);
  const chars = Math.floor(interpolate(f, [typeStart, typeEnd], [0, prompt.length], clamp));
  const caret = Math.floor(f / 8) % 2 === 0 && f < typeEnd + 6;
  const thinking = f > typeEnd + 4 && f < resultsStart;
  const win = sp(f, fps, 0, 16);
  const ry = interpolate(f, [0, dur], [-12, -5]);
  const angle = (f * 4) % 360;
  const promptSize = fitSize(prompt, 690, 44, 32, 6, K_BODY);
  const resultSize = Math.min(...results.map((r) => fitSize(r, 760, 44, 32, 2, K_BODY)), 44);
  return (
    <div style={{position: 'absolute', left: 70, top: 420, width: 940, perspective: 1800}}>
      <div
        style={{
          padding: 3, borderRadius: 46, transformOrigin: 'center',
          background: `conic-gradient(from ${angle}deg, ${brand.accentA}, transparent 30%, ${brand.accentB}, transparent 70%, ${brand.accentA})`,
          transform: `rotateY(${ry}deg) rotateX(${(1 - win) * 50 + 5}deg) translateZ(${(1 - win) * -300}px)`, opacity: win,
          boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 80px ${brand.accentA}44`,
        }}
      >
        <div style={{borderRadius: 44, background: '#0b1124f5', padding: 44, display: 'flex', flexDirection: 'column', gap: 30}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{width: 20, height: 20, borderRadius: '50%', background: c}} />)}
            <span style={{marginLeft: 20, fontFamily: BODY, fontWeight: 700, fontSize: 32, color: brand.muted}}>{scene.app ?? 'Asistente IA'}</span>
          </div>
          <div style={{alignSelf: 'flex-end', maxWidth: 760, padding: '26px 32px', borderRadius: '34px 34px 8px 34px', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: BODY, fontWeight: 600, fontSize: promptSize, lineHeight: 1.3, color: '#fff'}}>
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
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            {results.map((line, i) => (
              <div key={i} style={{display: 'flex', gap: 18, fontFamily: BODY, fontWeight: 600, fontSize: resultSize, lineHeight: 1.28, color: brand.text, ...fadeUp(f, fps, resultsStart + i * 8, 24)}}>
                <span style={{color: brand.accentB}}>✓</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── OUTRO ─────────────────────────
export const Outro: React.FC<SceneProps & {tagline?: string}> = ({scene, brand, tagline}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const flip = sp(f, fps, 4, 14, 0.7);
  const shine = interpolate(f, [16, 40], [-120, 220], clamp);
  const text = scene.text ?? '';
  return (
    <Column top={950} align="center" gap={24}>
      <div style={{perspective: 1400}}>
        <div style={{position: 'relative', overflow: 'hidden', borderRadius: 34, background: 'rgba(255,255,255,0.96)', padding: '24px 38px', transform: `rotateY(${(1 - flip) * 90}deg)`, opacity: flip, boxShadow: `0 0 90px ${brand.accentA}88`}}>
          {brand.logo ? (
            <Img src={staticFile(brand.logo)} style={{height: 110, display: 'block'}} />
          ) : (
            <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 52, color: brand.bg}}>{brand.name}</div>
          )}
          <div style={{position: 'absolute', top: 0, bottom: 0, left: `${shine}%`, width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.85), transparent)'}} />
        </div>
      </div>
      <div style={{textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: fitSize(text, WIDTH, 74, 50, 3), lineHeight: 1.1, letterSpacing: -1.5, color: brand.text, ...fadeUp(f, fps, 12)}}>{text}</div>
      {tagline && (
        <div style={{textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 34, lineHeight: 1.3, color: brand.muted, ...fadeUp(f, fps, 20)}}>{tagline}</div>
      )}
      <div style={{fontFamily: BODY, fontWeight: 700, fontSize: 40, ...gradientText(brand.accentA, brand.accentB), ...fadeUp(f, fps, 26)}}>{brand.handle}</div>
    </Column>
  );
};

/** Velo oscuro bajo la zona de texto: el texto se lee siempre, pase lo que pase en el 3D. */
export const TextScrim: React.FC<{brand: Brand}> = ({brand}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${brand.bg}00 0%, ${brand.bg}00 36%, ${brand.bg}b8 58%, ${brand.bg}ee 100%)`, pointerEvents: 'none'}} />
);

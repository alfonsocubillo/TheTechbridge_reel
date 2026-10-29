import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {SceneProps} from '../types';
import {BODY, DISPLAY, clamp, easeOut, fadeUp, gradientText, headlineSize, sp} from '../anim';
import {Broll} from '../components/Layers';

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Etiqueta de formato ("ACABA DE SALIR") con punto pulsante. */
export const Kicker: React.FC<{label: string; a: string; delay?: number}> = ({label, a, delay = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = sp(f, fps, delay, 20);
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 28px',
        borderRadius: 999,
        border: `2px solid ${a}88`,
        background: `${a}1f`,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: 6,
        color: '#fff',
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 999px)`,
      }}
    >
      <span style={{width: 16, height: 16, borderRadius: '50%', background: a, boxShadow: `0 0 ${10 + pulse * 18}px ${a}`}} />
      {label}
    </div>
  );
};

/** Palabras que entran una a una; la palabra clave va en degradado con brillo. */
export const KineticText: React.FC<{text: string; highlight?: string; size: number; a: string; b: string; color: string; delay?: number; stagger?: number}> = ({
  text, highlight, size, a, b, color, delay = 0, stagger = 3,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const target = highlight ? norm(highlight.split(' ')[0]) : '';
  const words = text.split(' ');
  const hotIndex = target ? words.findIndex((w) => norm(w) === target) : -1;
  const hotIdx = hotIndex >= 0 ? hotIndex : target ? words.findIndex((w) => norm(w).includes(target)) : -1;
  return (
    <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color}}>
      {words.map((w, i) => {
        const hot = i === hotIdx;
        const s = fadeUp(f, fps, delay + i * stagger, 70);
        return (
          <span key={i} style={{display: 'inline-block', marginRight: size * 0.24, ...s}}>
            <span style={hot ? {...gradientText(a, b), filter: `drop-shadow(0 0 28px ${a}aa)`} : undefined}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

// ───────────────────────── HOOK ─────────────────────────
export const Hook: React.FC<SceneProps> = ({scene, brand, dur, formatLabel}) => {
  const f = useCurrentFrame();
  const text = scene.text ?? '';
  const scan = interpolate(f, [8, 34], [-200, 2100], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill>
      {scene.video && <Broll src={scene.video} brand={brand} dur={dur} dim={0.45} />}
      <AbsoluteFill style={{padding: '0 80px', justifyContent: 'center'}}>
        <div style={{marginBottom: 56}}>
          <Kicker label={formatLabel} a={brand.accentA} />
        </div>
        <KineticText text={text} highlight={scene.highlight} size={headlineSize(text)} a={brand.accentA} b={brand.accentB} color={brand.text} delay={6} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: scan, height: 180,
          background: `linear-gradient(180deg, transparent, ${brand.accentB}22, transparent)`, mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};

// ───────────────────────── STAT ─────────────────────────
export const Stat: React.FC<SceneProps> = ({scene, brand, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const raw = String(scene.value ?? '0').replace(',', '.');
  const value = parseFloat(raw) || 0;
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  const p = interpolate(f, [6, 46], [0, 1], {...clamp, easing: easeOut});
  const shown = (value * p).toLocaleString('es-ES', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  const isPct = (scene.suffix ?? '').includes('%') && value <= 100;
  const R = 330;
  const C = 2 * Math.PI * R;
  const numSize = shown.length + (scene.prefix?.length ?? 0) + (scene.suffix?.length ?? 0) > 6 ? 190 : 250;
  const pop = sp(f, fps, 0, 14);

  return (
    <AbsoluteFill>
      {scene.video && <Broll src={scene.video} brand={brand} dur={dur} dim={0.35} />}
      <AbsoluteFill style={{alignItems: 'center', top: -120, justifyContent: 'center'}}>
        <div style={{position: 'relative', width: 800, height: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.8 + 0.2 * pop})`}}>
          <svg width="800" height="800" style={{position: 'absolute', transform: 'rotate(-90deg)'}}>
            <defs>
              <linearGradient id="ring" x1="0" x2="1">
                <stop offset="0%" stopColor={brand.accentA} />
                <stop offset="100%" stopColor={brand.accentB} />
              </linearGradient>
            </defs>
            <circle cx="400" cy="400" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="22" fill="none" />
            <circle
              cx="400" cy="400" r={R} stroke="url(#ring)" strokeWidth="22" fill="none" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p * (isPct ? value / 100 : 1))}
              style={{filter: `drop-shadow(0 0 20px ${brand.accentB})`}}
            />
          </svg>
          <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: numSize, letterSpacing: -8, ...gradientText('#ffffff', brand.accentB)}}>
            {scene.prefix}{shown}{scene.suffix}
          </div>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 1180, left: 90, right: 90, textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 56, lineHeight: 1.2, color: brand.text, ...fadeUp(f, fps, 22)}}>
        {scene.label}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── BROLL (titular sobre vídeo) ─────────────────────────
export const BrollScene: React.FC<SceneProps> = ({scene, brand, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = interpolate(f, [4, 22], [100, 0], {...clamp, easing: easeOut});
  const bar = interpolate(f, [0, 16], [0, 140], {...clamp, easing: easeOut});
  const title = scene.title ?? '';
  return (
    <AbsoluteFill>
      {scene.video ? <Broll src={scene.video} brand={brand} dur={dur} /> : null}
      <div style={{position: 'absolute', left: 80, right: 80, top: 760}}>
        <div style={{width: bar, height: 10, borderRadius: 6, background: `linear-gradient(90deg, ${brand.accentA}, ${brand.accentB})`, marginBottom: 36, boxShadow: `0 0 24px ${brand.accentA}`}} />
        <div style={{clipPath: `inset(0 ${reveal}% 0 0)`, fontFamily: DISPLAY, fontWeight: 700, fontSize: Math.min(headlineSize(title), 112), lineHeight: 1.04, letterSpacing: -3, color: brand.text, textShadow: '0 10px 40px rgba(0,0,0,0.6)'}}>
          {title}
        </div>
        {scene.subtitle && (
          <div style={{marginTop: 34, fontFamily: BODY, fontWeight: 500, fontSize: 48, lineHeight: 1.3, color: brand.muted, ...fadeUp(f, fps, 16, 30)}}>
            {scene.subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── LIST ─────────────────────────
export const List: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = (scene.items ?? []).slice(0, 4);
  return (
    <AbsoluteFill style={{padding: '0 70px'}}>
      <div style={{marginTop: 380, fontFamily: DISPLAY, fontWeight: 700, fontSize: 92, lineHeight: 1.05, letterSpacing: -3, color: brand.text, ...fadeUp(f, fps, 0)}}>
        {scene.title}
      </div>
      <div style={{marginTop: 70, display: 'flex', flexDirection: 'column', gap: 34}}>
        {items.map((it, i) => {
          const p = sp(f, fps, 10 + i * 9, 16, 0.7);
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 34, padding: '34px 40px', borderRadius: 34,
                background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(24px)', boxShadow: `0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)`,
                opacity: interpolate(f, [10 + i * 9, 18 + i * 9], [0, 1], clamp),
                transform: `translateX(${(1 - p) * 260}px) rotateY(${(1 - p) * -25}deg)`,
              }}
            >
              <div style={{minWidth: 76, height: 76, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: '#fff', boxShadow: `0 0 30px ${brand.accentA}88`}}>
                {i + 1}
              </div>
              <div style={{fontFamily: BODY, fontWeight: 600, fontSize: 50, lineHeight: 1.2, color: brand.text}}>{it}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── COMPARE (antes / ahora) ─────────────────────────
export const Compare: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const top = sp(f, fps, 0, 18);
  const bottom = sp(f, fps, 14, 18);
  const vs = sp(f, fps, 22, 10, 0.5);
  const panel = (title: string, body: string, hot: boolean, p: number, from: number): React.ReactNode => (
    <div
      style={{
        position: 'absolute', left: 60, right: 60, top: from, height: 520, borderRadius: 44, padding: '60px 56px',
        background: hot ? `linear-gradient(135deg, ${brand.accentA}38, ${brand.accentB}22)` : 'rgba(255,255,255,0.05)',
        border: hot ? `2px solid ${brand.accentB}aa` : '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: hot ? `0 0 80px ${brand.accentA}55` : 'none',
        opacity: p, transform: `translateY(${(1 - p) * (hot ? 120 : -120)}px)`,
        filter: hot ? undefined : 'saturate(0.2)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}
    >
      <div style={{fontFamily: BODY, fontWeight: 700, fontSize: 32, letterSpacing: 8, color: hot ? brand.accentB : brand.muted, marginBottom: 26}}>{title.toUpperCase()}</div>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 68, lineHeight: 1.1, letterSpacing: -2, color: hot ? brand.text : brand.muted}}>{body}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      {panel(scene.left_title ?? 'Antes', scene.left ?? '', false, top, 300)}
      {panel(scene.right_title ?? 'Ahora', scene.right ?? '', true, bottom, 900)}
      <div style={{position: 'absolute', left: 540 - 70, top: 850 - 70 + 0, width: 140, height: 140, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: brand.bg, border: `3px solid ${brand.accentA}`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 48, color: brand.text, transform: `scale(${vs}) rotate(${(1 - vs) * 90}deg)`, boxShadow: `0 0 40px ${brand.accentA}`}}>
        VS
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── QUOTE ─────────────────────────
export const Quote: React.FC<SceneProps> = ({scene, brand, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = (scene.text ?? '').split(' ');
  return (
    <AbsoluteFill>
      {scene.video && <Broll src={scene.video} brand={brand} dur={dur} dim={0.3} />}
      <AbsoluteFill style={{padding: '0 90px', justifyContent: 'center'}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 300, lineHeight: 0.6, height: 150, ...gradientText(brand.accentA, brand.accentB), ...fadeUp(f, fps, 0)}}>“</div>
        <div style={{fontFamily: DISPLAY, fontWeight: 600, fontSize: words.length > 12 ? 70 : 84, lineHeight: 1.12, letterSpacing: -2, color: brand.text}}>
          {words.map((w, i) => (
            <span key={i} style={{display: 'inline-block', marginRight: 20, ...fadeUp(f, fps, 6 + i * 2, 30)}}>{w}</span>
          ))}
        </div>
        {scene.source && (
          <div style={{marginTop: 44, fontFamily: BODY, fontSize: 40, fontWeight: 500, color: brand.muted, ...fadeUp(f, fps, 10 + words.length * 2)}}>— {scene.source}</div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ───────────────────────── PROMPT (ventana de chat animada) ─────────────────────────
export const Prompt: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const prompt = scene.prompt ?? '';
  const typeEnd = 10 + Math.min(prompt.length * 0.9, 50);
  const chars = Math.floor(interpolate(f, [10, typeEnd], [0, prompt.length], clamp));
  const caret = Math.floor(f / 8) % 2 === 0 && f < typeEnd + 6;
  const thinking = f > typeEnd + 4 && f < typeEnd + 22;
  const win = sp(f, fps, 0, 16);
  const angle = (f * 4) % 360;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{padding: 3, borderRadius: 46, background: `conic-gradient(from ${angle}deg, ${brand.accentA}, transparent 30%, ${brand.accentB}, transparent 70%, ${brand.accentA})`, transform: `translateY(${(1 - win) * 200}px) scale(${0.9 + 0.1 * win})`, opacity: win, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${brand.accentA}44`}}>
        <div style={{width: 960, minHeight: 760, borderRadius: 44, background: '#0d1326f2', padding: 48, display: 'flex', flexDirection: 'column', gap: 36}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{width: 20, height: 20, borderRadius: '50%', background: c}} />)}
            <span style={{marginLeft: 20, fontFamily: BODY, fontWeight: 600, fontSize: 32, color: brand.muted}}>{scene.app ?? 'Asistente IA'}</span>
          </div>
          <div style={{alignSelf: 'flex-end', maxWidth: 760, padding: '30px 36px', borderRadius: '34px 34px 8px 34px', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: BODY, fontWeight: 500, fontSize: 46, lineHeight: 1.32, color: '#fff'}}>
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
          <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
            {(scene.result ?? []).map((line, i) => (
              <div key={i} style={{display: 'flex', gap: 22, fontFamily: BODY, fontWeight: 500, fontSize: 46, lineHeight: 1.3, color: brand.text, ...fadeUp(f, fps, typeEnd + 22 + i * 8, 24)}}>
                <span style={{color: brand.accentB}}>✓</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── OUTRO ─────────────────────────
export const Outro: React.FC<SceneProps> = ({scene, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = sp(f, fps, 0, 12, 0.6);
  const ring = interpolate(f % 40, [0, 40], [0, 1]);
  const shine = interpolate(f, [10, 40], [-120, 220], clamp);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 90px'}}>
      <div style={{position: 'relative', marginBottom: 80, transform: `scale(${0.6 + 0.4 * p})`, opacity: p}}>
        <div style={{position: 'absolute', inset: -40, borderRadius: 60, border: `3px solid ${brand.accentA}`, opacity: 1 - ring, transform: `scale(${1 + ring * 0.25})`}} />
        <div style={{position: 'relative', overflow: 'hidden', borderRadius: 40, background: 'rgba(255,255,255,0.95)', padding: '40px 56px', boxShadow: `0 0 90px ${brand.accentA}88`}}>
          {brand.logo ? (
            <Img src={staticFile(brand.logo)} style={{height: 150, display: 'block'}} />
          ) : (
            <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, color: brand.bg}}>{brand.name}</div>
          )}
          <div style={{position: 'absolute', top: 0, bottom: 0, left: `${shine}%`, width: '40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.8), transparent)'}} />
        </div>
      </div>
      <div style={{textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 80, lineHeight: 1.08, letterSpacing: -2, color: brand.text, ...fadeUp(f, fps, 10)}}>
        {scene.text}
      </div>
      <div style={{marginTop: 40, fontFamily: BODY, fontWeight: 600, fontSize: 42, ...gradientText(brand.accentA, brand.accentB), ...fadeUp(f, fps, 18)}}>{brand.handle}</div>
    </AbsoluteFill>
  );
};

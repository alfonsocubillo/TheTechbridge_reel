import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND, FEED, FeedBg, theme, Grain, Hi, INTER, Lockup, PageCount, POP, Spaced, TIGHT, fit} from '../kit';
import type {SlideProps} from './types';

/**
 * Carrusel Modelo 03 · "Comparativa".
 * Azul noche dividido en dos columnas con un color cada una (A celeste, B ámbar), marcadores de puntuación y
 * un veredicto honesto por criterio. Cierra con "cuándo elegir cada uno", nunca con un ganador absoluto.
 *   duelo    → {title, highlight?}                     (usa extra.a / extra.b: {name, tagline})
 *   criterio → {criterion, a, b, a_score (0-10), b_score, verdict}
 *   tabla    → {title, rows: [{criterion, a, b}]}      (a/b: "✓", "–" o texto corto)
 *   eleccion → {title, a_if: [], b_if: []}
 *   closing  → {title, highlight?, text}
 */
// A = azul de la marca, B = violeta secundario de la marca. Si un lado es una app con color propio (extra.a.app), se usa el suyo.
let A = BRAND.light;
let B = BRAND.violetLight;

type Side = {name: string; tagline?: string; app?: string};

export const CarouselComparativa: React.FC<SlideProps> = ({slide, index, total, extra}) => {
  const s = slide as Record<string, any>;
  const a = (extra?.a ?? {name: 'A'}) as Side;
  const b = (extra?.b ?? {name: 'B'}) as Side;
  A = a.app ? theme(a.app).accent : BRAND.light;
  B = b.app ? theme(b.app).accent : BRAND.violetLight;
  const Body = {duelo: Duelo, criterio: Criterio, tabla: Tabla, eleccion: Eleccion, closing: Closing}[s.kind as string] ?? Tabla;
  return (
    <AbsoluteFill style={{background: FEED.bg, overflow: 'hidden'}}>
      <FeedBg glow={BRAND.deep} flip={index % 2 === 0} />
      {/* Halo de cada lado */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 40% 60% at 0% 55%, ${A}1c, transparent 70%), radial-gradient(ellipse 40% 60% at 100% 55%, ${B}1c, transparent 70%)`}} />
      <Lockup />
      <PageCount i={index + 1} n={total} />
      <div style={{position: 'absolute', left: 90, right: 90, top: 190, bottom: 120}}>
        <Body s={s} a={a} b={b} />
      </div>
      <div style={{position: 'absolute', left: 90, right: 90, bottom: 70, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{flex: 1, height: 6, borderRadius: 3, background: A}} />
        <div style={{fontFamily: POP, fontWeight: 700, fontSize: 24, letterSpacing: 6, color: FEED.muted}}>VS</div>
        <div style={{flex: 1, height: 6, borderRadius: 3, background: B}} />
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

type BodyP = React.FC<{s: Record<string, any>; a: Side; b: Side}>;

const Name: React.FC<{side: Side; color: string; align: 'left' | 'right'; size?: number}> = ({side, color, align, size = 64}) => (
  <div style={{textAlign: align}}>
    <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: fit(side.name, 420, size, 38, 2, 0.55), color, letterSpacing: -1, lineHeight: 1}}>{side.name}</div>
    {side.tagline && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 28, color: FEED.muted, marginTop: 10, lineHeight: 1.3}}>{side.tagline}</div>}
  </div>
);

const Duelo: BodyP = ({s, a, b}) => (
  <div style={{display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 60}}>
    <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: fit(String(s.title), 900, 96, 64, 3, 0.5), lineHeight: 1.02, letterSpacing: -2.5, color: '#fff'}}>
      <Hi text={String(s.title)} highlight={s.highlight} color={B} />
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
      <div style={{flex: 1, padding: 36, borderRadius: 28, border: `3px solid ${A}`, background: `${A}12`}}><Name side={a} color={A} align="left" /></div>
      <div style={{width: 110, height: 110, borderRadius: '50%', background: '#fff', color: FEED.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TIGHT, fontWeight: 900, fontSize: 44, flexShrink: 0}}>VS</div>
      <div style={{flex: 1, padding: 36, borderRadius: 28, border: `3px solid ${B}`, background: `${B}12`}}><Name side={b} color={B} align="right" /></div>
    </div>
  </div>
);

const Meter: React.FC<{score: number; color: string; align: 'left' | 'right'}> = ({score, color, align}) => (
  <div style={{display: 'flex', gap: 8, justifyContent: align === 'left' ? 'flex-start' : 'flex-end'}}>
    {Array.from({length: 10}, (_, i) => (
      <div key={i} style={{width: 34, height: 34, borderRadius: 9, background: (align === 'left' ? i < score : 9 - i < score) ? color : `${color}22`}} />
    ))}
  </div>
);

const Criterio: BodyP = ({s, a, b}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 46, paddingTop: 40}}>
    <Spaced color={FEED.muted} size={26} spacing={7}>CRITERIO</Spaced>
    <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: fit(String(s.criterion), 900, 100, 64, 2, 0.5), lineHeight: 1.0, letterSpacing: -2.5, color: '#fff', marginTop: -16}}>{s.criterion}</div>
    <div style={{display: 'flex', gap: 30}}>
      {[{side: a, c: A, t: s.a, sc: s.a_score, al: 'left' as const}, {side: b, c: B, t: s.b, sc: s.b_score, al: 'right' as const}].map((x) => (
        <div key={x.al} style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 22, padding: '34px 30px', borderRadius: 26, background: 'rgba(255,255,255,0.04)', border: `2px solid ${x.c}66`}}>
          <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: 40, color: x.c, textAlign: x.al}}>{x.side.name}</div>
          <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(String(x.t), 370, 44, 32, 6, 0.53), color: '#E6ECF8', lineHeight: 1.35, minHeight: 340, textAlign: x.al}}>{x.t}</div>
          <Meter score={Number(x.sc ?? 5)} color={x.c} align={x.al} />
        </div>
      ))}
    </div>
    <div style={{display: 'flex', gap: 24, alignItems: 'flex-start'}}>
      <div style={{fontFamily: POP, fontWeight: 700, fontSize: 24, letterSpacing: 5, color: FEED.ink, background: '#fff', padding: '10px 16px', borderRadius: 10, flexShrink: 0, marginTop: 4}}>VEREDICTO</div>
      <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 42, color: '#fff', lineHeight: 1.35}}>{s.verdict}</div>
    </div>
  </div>
);

const Tabla: BodyP = ({s, a, b}) => {
  const rows: {criterion: string; a: string; b: string}[] = (s.rows ?? []).slice(0, 7);
  const cell = (v: string, c: string) => {
    if (v === '✓') return <div style={{width: 52, height: 52, borderRadius: '50%', background: c, color: FEED.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 30}}>✓</div>;
    if (v === '–' || v === '-') return <div style={{width: 30, height: 5, background: `${c}55`, borderRadius: 3}} />;
    return <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 28, color: c, textAlign: 'center', lineHeight: 1.2}}>{v}</div>;
  };
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 36}}>
      <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: fit(String(s.title), 900, 84, 60, 2, 0.5), lineHeight: 1.02, letterSpacing: -2, color: '#fff'}}>
        <Hi text={String(s.title)} highlight={s.highlight} color={B} />
      </div>
      <div style={{borderRadius: 26, overflow: 'hidden', border: `2px solid ${FEED.line}`}}>
        <div style={{display: 'flex', background: 'rgba(255,255,255,0.06)', padding: '22px 28px'}}>
          <div style={{flex: 1.6}} />
          <div style={{flex: 1, textAlign: 'center', fontFamily: TIGHT, fontWeight: 900, fontSize: 32, color: A}}>{a.name}</div>
          <div style={{flex: 1, textAlign: 'center', fontFamily: TIGHT, fontWeight: 900, fontSize: 32, color: B}}>{b.name}</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', padding: '34px 28px', borderTop: `2px solid ${FEED.line}`, minHeight: 64}}>
            <div style={{flex: 1.6, fontFamily: INTER, fontWeight: 600, fontSize: 38, color: '#fff', lineHeight: 1.25}}>{r.criterion}</div>
            <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>{cell(r.a, A)}</div>
            <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>{cell(r.b, B)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Eleccion: BodyP = ({s, a, b}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 40}}>
    <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: fit(String(s.title), 900, 92, 60, 2, 0.5), lineHeight: 1.02, letterSpacing: -2, color: '#fff'}}>{s.title}</div>
    {[{side: a, c: A, list: s.a_if}, {side: b, c: B, list: s.b_if}].map((x, k) => (
      <div key={k} style={{padding: '34px 38px', borderRadius: 26, background: `${x.c}14`, borderLeft: `10px solid ${x.c}`}}>
        <div style={{fontFamily: POP, fontWeight: 700, fontSize: 26, letterSpacing: 5, color: x.c}}>ELIGE {x.side.name.toUpperCase()} SI…</div>
        {(x.list ?? []).slice(0, 3).map((t: string, i: number) => (
          <div key={i} style={{marginTop: 20, fontFamily: INTER, fontWeight: 500, fontSize: 42, color: '#fff', lineHeight: 1.3}}>· {t}</div>
        ))}
      </div>
    ))}
  </div>
);

const Closing: BodyP = ({s}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 150}}>
    <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: fit(String(s.title), 900, 110, 70, 3, 0.5), lineHeight: 1.02, letterSpacing: -3, color: '#fff'}}>
      <Hi text={String(s.title)} highlight={s.highlight} color={B} />
    </div>
    {s.text && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 44, color: FEED.muted, lineHeight: 1.38}}>{s.text}</div>}
    <div style={{display: 'flex', gap: 24, marginTop: 20}}>
      {['GUARDAR', 'COMPARTIR'].map((x, i) => (
        <div key={x} style={{padding: '26px 32px', borderRadius: 18, background: i === 0 ? B : 'transparent', border: i === 0 ? 'none' : `2px solid ${FEED.line}`, fontFamily: POP, fontWeight: 700, fontSize: 32, letterSpacing: 5, color: i === 0 ? FEED.ink : '#fff'}}>{x}</div>
      ))}
    </div>
  </div>
);

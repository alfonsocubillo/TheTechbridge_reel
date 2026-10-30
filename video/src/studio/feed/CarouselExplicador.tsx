import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Grain, Hi, INTER, POP, Spaced, TIGHT, fit} from '../kit';
import type {SlideProps} from './types';

/**
 * Carrusel Modelo 02 · "Explicador" (plano técnico).
 * Fondo claro con rejilla de plano, tinta azul noche y diagramas: definiciones, flujos con flechas, pasos en
 * línea de tiempo, antes/después y resumen. Para explicar conceptos y tutoriales paso a paso.
 *   definicion → {kicker, term, definition, analogy?}
 *   flujo      → {title, nodes: [{label, sub?}], caption?}
 *   pasos      → {title, steps: [{title, text}]}
 *   ejemplo    → {title, before: {label, text}, after: {label, text}}
 *   resumen    → {title, points: []}
 *   closing    → {title, highlight?, text}
 */
const PAPER = '#F3F6FB';
const INK = '#0B1530';
const SOFT = '#55617A';
const DEEP: Record<string, string> = {
  tutorial: '#1D6FD8', noticia: '#D9452E', comparativa: '#B07800', analisis: '#6545D8', prompting: '#0E8F6C', curiosidad: '#C93C84',
};

export const CarouselExplicador: React.FC<SlideProps> = ({slide, index, total, family: famKey}) => {
  const accent = DEEP[famKey] ?? DEEP.tutorial;
  const s = slide as Record<string, any>;
  const Body = {definicion: Definicion, flujo: Flujo, pasos: Pasos, ejemplo: Ejemplo, resumen: Resumen, closing: Closing}[s.kind as string] ?? Resumen;
  return (
    <AbsoluteFill style={{background: PAPER, overflow: 'hidden'}}>
      {/* Rejilla de plano */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${accent}14 2px, transparent 2px), linear-gradient(90deg, ${accent}14 2px, transparent 2px), linear-gradient(${accent}0a 1px, transparent 1px), linear-gradient(90deg, ${accent}0a 1px, transparent 1px)`,
          backgroundSize: '135px 135px, 135px 135px, 27px 27px, 27px 27px',
          backgroundPosition: '-2px -2px',
        }}
      />
      <div style={{position: 'absolute', left: 90, top: 70, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 18, height: 18, background: accent, transform: 'rotate(45deg)'}} />
        <div style={{fontFamily: POP, fontWeight: 600, fontSize: 30, color: INK}}>The TechBridge Solution</div>
      </div>
      <div style={{position: 'absolute', right: 90, top: 70, fontFamily: POP, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: SOFT}}>
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
      <div style={{position: 'absolute', left: 90, top: 200, width: 900, bottom: 140}}>
        <Body s={s} accent={accent} />
      </div>
      {/* Cota inferior, como en un plano */}
      <div style={{position: 'absolute', left: 90, right: 90, bottom: 86, height: 2, background: `${INK}22`}} />
      <div style={{position: 'absolute', left: 90, bottom: 78, width: 2, height: 18, background: `${INK}55`}} />
      <div style={{position: 'absolute', right: 90, bottom: 78, width: 2, height: 18, background: `${INK}55`}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', fontFamily: POP, fontWeight: 600, fontSize: 22, letterSpacing: 6, color: SOFT}}>
        {index + 1 < total ? 'DESLIZA →' : 'GUÁRDALO PARA DESPUÉS'}
      </div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

type B = React.FC<{s: Record<string, any>; accent: string}>;

const Title: React.FC<{text: string; highlight?: string; accent: string; max?: number}> = ({text, highlight, accent, max = 92}) => {
  const size = fit(text, 900, max, 60, 3, 0.5);
  return (
    <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color: INK}}>
      <Hi text={text} highlight={highlight} color={accent} />
    </div>
  );
};

const Definicion: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 34, paddingTop: 60}}>
    <Spaced color={accent} size={28} spacing={7}>{s.kicker ?? 'QUÉ ES'}</Spaced>
    <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: fit(String(s.term), 900, 150, 80, 2, 0.52), lineHeight: 0.95, letterSpacing: -4, color: INK}}>{s.term}</div>
    <div style={{width: 120, height: 8, background: accent, borderRadius: 4}} />
    <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(String(s.definition), 900, 48, 36, 6, 0.52), lineHeight: 1.38, color: INK}}>{s.definition}</div>
    {s.analogy && (
      <div style={{marginTop: 20, padding: '34px 38px', border: `3px dashed ${accent}88`, borderRadius: 24, background: '#ffffffaa'}}>
        <Spaced color={accent} size={22} spacing={5}>PIÉNSALO ASÍ</Spaced>
        <div style={{marginTop: 14, fontFamily: INTER, fontWeight: 600, fontSize: 38, lineHeight: 1.35, color: INK}}>{s.analogy}</div>
      </div>
    )}
  </div>
);

const Flujo: B = ({s, accent}) => {
  const nodes: {label: string; sub?: string}[] = (s.nodes ?? []).slice(0, 5);
  const gap = nodes.length > 4 ? 30 : 44;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 40}}>
      <Title text={String(s.title)} highlight={s.highlight} accent={accent} max={80} />
      <div style={{display: 'flex', flexDirection: 'column', gap}}>
        {nodes.map((nd, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, marginLeft: i % 2 ? 110 : 0, position: 'relative'}}>
            <div style={{width: 84, height: 84, borderRadius: '50%', background: i === nodes.length - 1 ? accent : '#fff', border: `4px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TIGHT, fontWeight: 900, fontSize: 40, color: i === nodes.length - 1 ? '#fff' : accent, flexShrink: 0}}>
              {i + 1}
            </div>
            <div style={{flex: 1, padding: '22px 30px', background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(11,21,48,0.08)', border: `2px solid ${INK}10`}}>
              <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: 42, color: INK, letterSpacing: -0.5}}>{nd.label}</div>
              {nd.sub && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 30, color: SOFT, marginTop: 6, lineHeight: 1.3}}>{nd.sub}</div>}
            </div>
            {i < nodes.length - 1 && (
              <svg style={{position: 'absolute', left: i % 2 ? -66 : 30, top: 84, overflow: 'visible'}} width={140} height={gap + 4}>
                <path d={i % 2 ? `M 108 4 C 108 ${gap * 0.7}, 22 ${gap * 0.3}, 22 ${gap}` : `M 12 4 C 12 ${gap * 0.7}, 98 ${gap * 0.3}, 98 ${gap}`} stroke={accent} strokeWidth={4} fill="none" strokeDasharray="10 8" />
              </svg>
            )}
          </div>
        ))}
      </div>
      {s.caption && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 34, color: SOFT, lineHeight: 1.35}}>{s.caption}</div>}
    </div>
  );
};

const Pasos: B = ({s, accent}) => {
  const steps: {title: string; text: string}[] = (s.steps ?? []).slice(0, 4);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 46}}>
      <Title text={String(s.title)} highlight={s.highlight} accent={accent} max={80} />
      <div style={{position: 'relative', display: 'flex', flexDirection: 'column', gap: 40, paddingLeft: 90}}>
        <div style={{position: 'absolute', left: 27, top: 20, bottom: 20, width: 4, background: `${accent}55`}} />
        {steps.map((st, i) => (
          <div key={i} style={{position: 'relative'}}>
            <div style={{position: 'absolute', left: -90, top: 0, width: 58, height: 58, borderRadius: 14, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TIGHT, fontWeight: 900, fontSize: 30}}>{i + 1}</div>
            <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: 44, color: INK, letterSpacing: -0.5, lineHeight: 1.1}}>{st.title}</div>
            <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 34, color: SOFT, marginTop: 10, lineHeight: 1.35}}>{st.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Ejemplo: B = ({s, accent}) => {
  const card = (c: {label: string; text: string}, good: boolean) => (
    <div style={{padding: '34px 38px', borderRadius: 24, background: good ? '#fff' : '#E7EBF3', border: good ? `4px solid ${accent}` : `2px solid ${INK}18`, boxShadow: good ? `0 20px 50px ${accent}30` : 'none'}}>
      <Spaced color={good ? accent : SOFT} size={24} spacing={6}>{c.label}</Spaced>
      <div style={{marginTop: 16, fontFamily: good ? INTER : INTER, fontWeight: good ? 600 : 500, fontSize: fit(c.text, 820, 40, 30, 6, 0.52), color: good ? INK : SOFT, lineHeight: 1.38, textDecoration: 'none'}}>{c.text}</div>
    </div>
  );
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 34}}>
      <Title text={String(s.title)} highlight={s.highlight} accent={accent} max={80} />
      {card(s.before, false)}
      <div style={{alignSelf: 'center', width: 70, height: 70, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontFamily: TIGHT, fontWeight: 900}}>↓</div>
      {card(s.after, true)}
    </div>
  );
};

const Resumen: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 44}}>
    <Title text={String(s.title)} highlight={s.highlight} accent={accent} max={86} />
    {(s.points ?? []).slice(0, 5).map((pt: string, i: number) => (
      <div key={i} style={{display: 'flex', gap: 26, alignItems: 'flex-start'}}>
        <div style={{width: 50, height: 50, borderRadius: 12, border: `4px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2}}>
          <svg width={28} height={28}><path d="M 4 14 L 11 21 L 24 6" stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{fontFamily: INTER, fontWeight: 600, fontSize: fit(pt, 820, 42, 32, 3, 0.52), color: INK, lineHeight: 1.32}}>{pt}</div>
      </div>
    ))}
  </div>
);

const Closing: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 140}}>
    <Title text={String(s.title)} highlight={s.highlight} accent={accent} max={110} />
    {s.text && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 44, color: SOFT, lineHeight: 1.38}}>{s.text}</div>}
    <div style={{display: 'flex', gap: 22, marginTop: 30}}>
      {['GUARDAR', 'COMPARTIR'].map((b, i) => (
        <div key={b} style={{padding: '24px 34px', borderRadius: 16, background: i === 0 ? INK : 'transparent', border: `3px solid ${INK}`, fontFamily: POP, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: i === 0 ? '#fff' : INK}}>{b}</div>
      ))}
    </div>
  </div>
);

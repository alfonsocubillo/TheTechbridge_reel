import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Grain, INTER, POP, SERIF, SERIF_I, fit, theme} from '../kit';
import type {SlideProps} from './types';

/**
 * Carrusel Modelo 04 · "Análisis" (revista).
 * Papel cálido, titulares en serifa (Fraunces), capitular, cifras grandes y cita destacada. Para noticias
 * importantes contadas con contexto: qué ha pasado, las cifras, por qué importa y qué hacer.
 *   lead    → {kicker, title, text}
 *   cifras  → {title, stats: [{value, label}]}
 *   cita    → {quote, author?}
 *   claves  → {title, points: []}
 *   accion  → {title, steps: []}
 *   closing → {title, text}
 */
const PAPER = '#F4F7FB';
const INK = '#1B2027';
const SOFT = '#5F6B7A';

export const CarouselAnalisis: React.FC<SlideProps> = ({slide, index, total, app}) => {
  const accent = theme(app).deep;
  const s = slide as Record<string, any>;
  const Body = {lead: Lead, cifras: Cifras, cita: Cita, claves: Claves, accion: Accion, closing: Closing}[s.kind as string] ?? Claves;
  return (
    <AbsoluteFill style={{background: PAPER, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 30% 20%, #ffffff80, transparent 60%)'}} />
      {/* Cabecera de revista */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 66, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 18, borderBottom: `3px solid ${INK}`}}>
        <div style={{fontFamily: SERIF, fontWeight: 800, fontSize: 34, color: INK, letterSpacing: -0.5}}>The TechBridge Solution</div>
        <div style={{fontFamily: POP, fontWeight: 600, fontSize: 22, letterSpacing: 5, color: SOFT}}>ANÁLISIS · {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}</div>
      </div>
      <div style={{position: 'absolute', left: 90, top: 128, width: 900, height: 2, background: `${INK}40`}} />
      <div style={{position: 'absolute', left: 90, right: 90, top: 200, bottom: 130}}>
        <Body s={s} accent={accent} />
      </div>
      <div style={{position: 'absolute', left: 90, right: 90, bottom: 66, display: 'flex', justifyContent: 'space-between', fontFamily: POP, fontWeight: 600, fontSize: 22, letterSpacing: 4, color: SOFT}}>
        <span>@thetechbridgesolution</span>
        <span style={{color: accent}}>{index + 1 < total ? 'SIGUE →' : 'FIN'}</span>
      </div>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

type B = React.FC<{s: Record<string, any>; accent: string}>;

const Kick: React.FC<{text: string; accent: string}> = ({text, accent}) => (
  <div style={{fontFamily: POP, fontWeight: 700, fontSize: 26, letterSpacing: 7, color: accent}}>{text}</div>
);

const Lead: B = ({s, accent}) => {
  const text = String(s.text ?? '');
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 34}}>
      <Kick text={s.kicker ?? 'QUÉ HA PASADO'} accent={accent} />
      <div style={{fontFamily: SERIF, fontWeight: 800, fontSize: fit(String(s.title), 900, 84, 58, 3, 0.5), lineHeight: 1.06, letterSpacing: -1.5, color: INK}}>{s.title}</div>
      <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(text, 900, 40, 31, 10, 0.52), lineHeight: 1.5, color: '#2A3038'}}>
        <span style={{float: 'left', fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 0.8, marginRight: 18, marginTop: 10, color: accent}}>{text.charAt(0)}</span>
        {text.slice(1)}
      </div>
    </div>
  );
};

const Cifras: B = ({s, accent}) => {
  const stats: {value: string; label: string}[] = (s.stats ?? []).slice(0, 3);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
      <Kick text={s.kicker ?? 'LAS CIFRAS'} accent={accent} />
      <div style={{fontFamily: SERIF, fontWeight: 800, fontSize: fit(String(s.title), 900, 70, 50, 2, 0.5), lineHeight: 1.08, color: INK}}>{s.title}</div>
      {stats.map((st, i) => (
        <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 34, paddingTop: 26, borderTop: `2px solid ${INK}25`}}>
          <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: fit(st.value, 420, 130, 60, 1, 0.78), color: accent, letterSpacing: -3, lineHeight: 1, width: 460, flexShrink: 0, whiteSpace: 'nowrap'}}>{st.value}</div>
          <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 34, color: '#2A3038', lineHeight: 1.35}}>{st.label}</div>
        </div>
      ))}
    </div>
  );
};

const Cita: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 40}}>
    <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 260, lineHeight: 0.6, color: accent, height: 120}}>“</div>
    <div style={{fontFamily: SERIF_I, fontWeight: 600, fontSize: fit(String(s.quote), 900, 76, 50, 6, 0.5), lineHeight: 1.18, color: INK}}>{s.quote}</div>
    {s.author && <div style={{fontFamily: POP, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: SOFT}}>— {String(s.author).toUpperCase()}</div>}
  </div>
);

const Claves: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 34}}>
    <Kick text={s.kicker ?? 'POR QUÉ IMPORTA'} accent={accent} />
    <div style={{fontFamily: SERIF, fontWeight: 800, fontSize: fit(String(s.title), 900, 76, 52, 3, 0.5), lineHeight: 1.06, color: INK}}>{s.title}</div>
    {(s.points ?? []).slice(0, 4).map((pt: string, i: number) => (
      <div key={i} style={{display: 'flex', gap: 28}}>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 56, color: accent, lineHeight: 1, minWidth: 54}}>{i + 1}</div>
        <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(pt, 800, 38, 30, 3, 0.52), color: '#2A3038', lineHeight: 1.4, paddingTop: 6}}>{pt}</div>
      </div>
    ))}
  </div>
);

const Accion: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 34}}>
    <Kick text={s.kicker ?? 'QUÉ HACER AHORA'} accent={accent} />
    <div style={{fontFamily: SERIF, fontWeight: 800, fontSize: fit(String(s.title), 900, 76, 52, 3, 0.5), lineHeight: 1.06, color: INK}}>{s.title}</div>
    <div style={{padding: '36px 40px', background: INK, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 26}}>
      {(s.steps ?? []).slice(0, 4).map((st: string, i: number) => (
        <div key={i} style={{display: 'flex', gap: 22, fontFamily: INTER, fontWeight: 500, fontSize: fit(st, 760, 36, 28, 3, 0.52), color: PAPER, lineHeight: 1.38}}>
          <span style={{color: '#A9D4F7', fontWeight: 800}}>→</span>
          <span>{st}</span>
        </div>
      ))}
    </div>
  </div>
);

const Closing: B = ({s, accent}) => (
  <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 40}}>
    <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: fit(String(s.title), 900, 110, 70, 3, 0.5), lineHeight: 1.0, letterSpacing: -2, color: INK}}>{s.title}</div>
    {s.text && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 42, color: SOFT, lineHeight: 1.4}}>{s.text}</div>}
    <div style={{display: 'flex', gap: 22}}>
      {['GUARDAR', 'COMPARTIR'].map((b, i) => (
        <div key={b} style={{padding: '22px 32px', background: i === 0 ? accent : 'transparent', border: `3px solid ${i === 0 ? accent : INK}`, fontFamily: POP, fontWeight: 700, fontSize: 28, letterSpacing: 5, color: i === 0 ? '#fff' : INK}}>{b}</div>
      ))}
    </div>
  </div>
);

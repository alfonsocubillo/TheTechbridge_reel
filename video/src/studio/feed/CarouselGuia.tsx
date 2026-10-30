import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND, FEED, FeedBg, theme, Grain, Hi, INTER, MONO, POP, Lockup, OutlineGlyph, PageCount, Rail, Spaced, TIGHT, TagPill, family, fit} from '../kit';
import type {SlideProps} from './types';

/**
 * Carrusel Modelo 01 · "Guía numerada" (la referencia de la marca).
 * Azul noche, números gigantes de contorno que se van encadenando entre diapositivas, etiqueta del producto,
 * tarjeta blanca con el contenido para copiar y un consejo con barra lateral.
 *   item    → {n, tag, title, card_label?, card, tip?}
 *   text    → {kicker, title, highlight?, body}
 *   closing → {kicker, title, highlight?, text, buttons?}
 */
export const CarouselGuia: React.FC<SlideProps> = ({slide, index, total, family: famKey, app}) => {
  const fam = family(famKey, app);
  const s = slide as Record<string, any>;
  return (
    <AbsoluteFill style={{background: FEED.bg, overflow: 'hidden'}}>
      <FeedBg glow={app ? theme(app).deep : index % 2 ? BRAND.deep : BRAND.blue} flip={index % 2 === 0} />
      {s.kind === 'item' && <Item s={s} accent={fam.accent} />}
      {s.kind === 'text' && <Text s={s} accent={fam.accent} />}
      {s.kind === 'closing' && <Closing s={s} accent={fam.accent} />}
      <Lockup />
      <PageCount i={index + 1} n={total} />
      <Rail y={1200} color={fam.accent} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

const Item: React.FC<{s: Record<string, any>; accent: string}> = ({s, accent}) => {
  const n = Number(s.n ?? 1);
  const card = String(s.card ?? '');
  const title = String(s.title ?? '');
  const titleSize = fit(title, 900, 96, 70, 2, 0.5);
  const formula = /^=/.test(card);
  const cardSize = formula ? fit(card, 800, 44, 30, 4, 0.62) : fit(card, 800, 52, 34, 5, 0.53);
  return (
    <>
      {/* El número anterior asoma por la izquierda y el actual ocupa la derecha: la serie se lee al deslizar */}
      <OutlineGlyph text={String(Math.max(n - 1, 0) || '')} x={-150} y={410} size={520} />
      <OutlineGlyph text={String(n).padStart(2, '0')} x={1180} y={410} size={520} anchor="end" />
      <div style={{position: 'absolute', left: 90, top: 250, width: 900, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 34}}>
        <TagPill label={String(s.tag ?? '')} color={accent} />
        <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -titleSize * 0.035, color: '#fff', marginTop: -6}}>{title}</div>
        <div style={{width: 900, boxSizing: 'border-box', padding: '50px 48px 54px', borderRadius: 30, background: FEED.card, boxShadow: '0 30px 80px rgba(0,0,0,0.45)', marginTop: 20}}>
          <Spaced color={FEED.cobalt} size={24} spacing={5.5}>{String(s.card_label ?? 'PROMPT · COPIA Y PEGA')}</Spaced>
          <div style={{marginTop: 22, fontFamily: formula ? MONO : INTER, fontWeight: 500, fontSize: cardSize, lineHeight: 1.36, color: FEED.ink, overflowWrap: 'anywhere'}}>{card}</div>
        </div>
        {s.tip && (
          <div style={{display: 'flex', gap: 26, marginTop: 24}}>
            <div style={{width: 7, borderRadius: 4, background: accent, flexShrink: 0}} />
            <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 40, lineHeight: 1.38, color: FEED.muted}}>{s.tip}</div>
          </div>
        )}
      </div>
    </>
  );
};

const Text: React.FC<{s: Record<string, any>; accent: string}> = ({s, accent}) => {
  const size = fit(String(s.title), 900, 104, 72, 3, 0.5);
  return (
    <div style={{position: 'absolute', left: 90, top: 300, width: 900, display: 'flex', flexDirection: 'column', gap: 36}}>
      <Spaced color={accent}>{s.kicker}</Spaced>
      <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: -size * 0.035, color: '#fff'}}>
        <Hi text={String(s.title)} highlight={s.highlight} color={accent} />
      </div>
      <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(String(s.body), 900, 46, 36, 7, 0.52), lineHeight: 1.4, color: FEED.muted}}>{s.body}</div>
    </div>
  );
};

const Closing: React.FC<{s: Record<string, any>; accent: string}> = ({s, accent}) => {
  const size = fit(String(s.title), 900, 116, 80, 3, 0.5);
  const buttons: string[] = s.buttons ?? ['GUARDAR', 'COMPARTIR'];
  return (
    <>
      <svg style={{position: 'absolute', left: -170, top: 140}} width={340} height={280}>
        <circle cx={170} cy={140} r={130} fill="none" stroke={FEED.outline} strokeWidth={3} />
        <circle cx={170} cy={140} r={56} fill="none" stroke={FEED.outline} strokeWidth={3} />
      </svg>
      <div style={{position: 'absolute', left: 90, top: 330, width: 900, display: 'flex', flexDirection: 'column', gap: 34}}>
        <Spaced color={accent}>{s.kicker ?? 'PARA LLEVAR'}</Spaced>
        <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -size * 0.035, color: '#fff'}}>
          <Hi text={String(s.title)} highlight={s.highlight} color={accent} />
        </div>
        {s.text && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 44, lineHeight: 1.38, color: FEED.muted}}>{s.text}</div>}
        <div style={{display: 'flex', gap: 24, marginTop: 20}}>
          {buttons.map((b, i) => (
            <div key={b} style={{padding: '26px 32px', borderRadius: 18, background: i === 0 ? accent : 'transparent', border: i === 0 ? 'none' : `2px solid ${FEED.line}`, fontFamily: 'inherit'}}>
              <Spaced color={i === 0 ? FEED.ink : '#fff'} size={32} spacing={5}>{b}</Spaced>
            </div>
          ))}
        </div>
        <div style={{marginTop: 36, fontFamily: POP, fontWeight: 700, fontSize: 40, color: '#fff'}}>
          <Spaced color="#fff" size={40} spacing={0.2} style={{display: 'inline'}}>The TechBridge Solution</Spaced>
          <span style={{color: accent, fontSize: 40}}> · IA y tecnología</span>
        </div>
      </div>
    </>
  );
};

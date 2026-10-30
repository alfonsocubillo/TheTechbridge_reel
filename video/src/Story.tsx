import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, SfxKit} from './types';
import {BODY, DISPLAY, clamp, fadeUp, sp} from './anim';
import {K_BODY, fitSize} from './fit';
import {FilmFinish} from './components/Layers';
import {KineticText} from './scenes/Scenes';
import {Stage} from './three/Stage';
import {Floaters, HEROES, easeOut, type HeroKey} from './three/heroes';
import {FormatHeader} from './three/Badge';

export type StoryProps = {
  brand: Brand;
  kind: string;
  /** Icono de la insignia 3D (mismos que los formatos del Reel). */
  badge: string;
  label: string;
  hero: string;
  title: string;
  highlight?: string;
  body: string;
  /** Solo noticias: 2-3 puntos concretos (qué es, quién lo tiene, cuándo) que se ven en una segunda parte. */
  points?: string[];
  /** Solo noticias: de dónde sale (p. ej. "Microsoft · Blog de Excel, 28 oct"). */
  source?: string;
  cta: string;
  music: string;
  sfx: SfxKit | null;
  durationInFrames: number;
  /** Fotograma en el que empieza la segunda parte (si hay puntos). */
  splitAt?: number;
};

// Instagram tapa arriba (barras y nombre, ~230 px) y abajo (caja de respuesta, desde ~1700 px).
const LEFT = 80;
const WIDTH = 920;
const TOP = 940;

/** Una "página" de la historia: columna que nunca se monta y que siempre cabe antes de la caja de respuesta. */
const Page: React.FC<{opacity: number; shift: number; children: React.ReactNode}> = ({opacity, shift, children}) => (
  <div style={{position: 'absolute', left: LEFT, width: WIDTH, top: TOP, display: 'flex', flexDirection: 'column', gap: 28, opacity, transform: `translateY(${shift}px)`}}>
    {children}
  </div>
);

/** Historia de 7-20 s: misma estética que los Reels. Las noticias tienen dos partes para entenderse sin enlace. */
export const Story: React.FC<StoryProps> = (p) => {
  const f = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  const brand: Brand = p.brand;
  const sfx = p.sfx;
  const Hero = HEROES[(p.hero in HEROES ? p.hero : 'ia') as HeroKey];
  const twoParts = Boolean(p.points?.length) && Boolean(p.splitAt);
  const split = twoParts ? p.splitAt! : durationInFrames + 100;
  const out1 = interpolate(f, [split - 8, split], [1, 0], clamp);
  const in2 = interpolate(f, [split, split + 10], [0, 1], clamp);

  const push = interpolate(f, [0, durationInFrames], [13.5, 11.5]);
  const az = 0.25 + Math.sin(f / 90) * 0.12;
  const titleSize = fitSize(p.title, WIDTH, 112, 64, 3);
  const bodySize = fitSize(p.body, WIDTH, 46, 34, 5, K_BODY);
  const pointSize = Math.min(...(p.points ?? []).map((pt) => fitSize(pt, WIDTH - 130, 46, 34, 2, K_BODY)), 46);
  const ctaAt = twoParts ? split + 40 : 58;
  const cta = sp(f, fps, ctaAt, 12, 0.6);
  const ctaPill = p.cta ? (
    <div style={{marginTop: 8, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          padding: '22px 42px', borderRadius: 999, fontFamily: BODY, fontWeight: 800, fontSize: fitSize(p.cta, 760, 40, 30, 1, K_BODY), color: '#fff',
          background: `linear-gradient(100deg, ${brand.accentA}, ${brand.accentB})`, boxShadow: `0 0 50px ${brand.accentA}99`,
          transform: `scale(${0.6 + 0.4 * cta})`, opacity: interpolate(f, [ctaAt, ctaAt + 6], [0, 1], clamp),
        }}
      >
        {p.cta}
      </div>
    </div>
  ) : null;

  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 32%, ${brand.accentA}2e 0%, ${brand.bg} 62%)`}}>
      <Stage width={width} height={height} bg={brand.bg} accentA={brand.accentA} accentB={brand.accentB}
        cam={{pos: [Math.sin(az) * push, 2.0, Math.cos(az) * push], target: [0, -0.9, 0], fov: 40}}>
        <group position={[0, 0.6, 0]} scale={Math.max(0.001, easeOut((f - 30) / 16))}>
          <Hero t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - 30) / 40)} />
        </group>
        <Floaters t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - 36) / 30)} />
      </Stage>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${brand.bg}00 0%, ${brand.bg}00 40%, ${brand.bg}c8 56%, ${brand.bg}f2 100%)`}} />

      {/* Parte 1: titular y qué ha pasado */}
      {f < split && (
        <Page opacity={out1} shift={(1 - out1) * -30}>
          <KineticText text={p.title} highlight={p.highlight} size={titleSize} a={brand.accentA} b={brand.accentB} color={brand.text} delay={30} />
          {p.body && (
            <div style={{fontFamily: BODY, fontWeight: 600, fontSize: bodySize, lineHeight: 1.3, color: '#cdd5f0', ...fadeUp(f, fps, 30 + p.title.split(' ').length * 3 + 8, 30)}}>{p.body}</div>
          )}
          {!twoParts && ctaPill}
        </Page>
      )}

      {/* Parte 2 (noticias): lo que cambia, en puntos, y la fuente */}
      {twoParts && f >= split && (
        <Page opacity={in2} shift={(1 - in2) * 40}>
          <div style={{fontFamily: BODY, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: brand.accentB}}>LO QUE CAMBIA</div>
          {(p.points ?? []).slice(0, 3).map((pt, i) => {
            const s = sp(f, fps, split + 6 + i * 8, 15, 0.7);
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24, padding: '22px 30px', borderRadius: 28, background: 'rgba(14,20,44,0.92)', border: '2px solid rgba(255,255,255,0.14)', opacity: Math.min(1, s * 1.5), transform: `translateX(${(1 - s) * 120}px)`}}>
                <div style={{minWidth: 58, height: 58, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${brand.accentA}, ${brand.accentB})`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, color: '#fff'}}>{i + 1}</div>
                <div style={{fontFamily: BODY, fontWeight: 700, fontSize: pointSize, lineHeight: 1.22, color: brand.text}}>{pt}</div>
              </div>
            );
          })}
          {p.source && (
            <div style={{fontFamily: BODY, fontWeight: 600, fontSize: 30, color: brand.muted, ...fadeUp(f, fps, split + 30, 20)}}>Fuente: {p.source}</div>
          )}
          {ctaPill}
        </Page>
      )}

      <FormatHeader brand={brand} format={p.badge} label={p.label} hideFrom={durationInFrames + 30} />
      <FilmFinish />

      {sfx && (
        <>
          <Audio src={staticFile(sfx.whoosh2)} volume={0.5} />
          <Sequence from={12}><Audio src={staticFile(sfx.impact)} volume={0.7} /></Sequence>
          <Sequence from={24}><Audio src={staticFile(sfx.swipe)} volume={0.3} /></Sequence>
          {twoParts && <Sequence from={split - 4}><Audio src={staticFile(sfx.whoosh1)} volume={0.45} /></Sequence>}
          {twoParts && (p.points ?? []).slice(0, 3).map((_, i) => (
            <Sequence key={i} from={split + 8 + i * 8}><Audio src={staticFile(sfx.pop)} volume={0.45} /></Sequence>
          ))}
          {p.cta && <Sequence from={ctaAt + 2}><Audio src={staticFile(sfx.pop)} volume={0.5} /></Sequence>}
        </>
      )}
      {p.music && (
        <Audio src={staticFile(p.music)} volume={(fr) => interpolate(fr, [0, 10, durationInFrames - 20, durationInFrames], [0, 0.45, 0.45, 0], clamp)} />
      )}
    </AbsoluteFill>
  );
};

export const storySample: StoryProps = {
  brand: {
    name: 'The TechBridge Solution',
    handle: '@thetechbridgesolution',
    bg: '#070B18',
    text: '#F5F7FF',
    muted: '#9AA4C7',
    accentA: '#3B82F6',
    accentB: '#22D3EE',
    logo: null,
  },
  kind: 'noticia',
  badge: 'noticia',
  label: 'NOTICIA',
  hero: 'excel',
  title: 'Copilot ya limpia los datos de tus tablas en Excel',
  highlight: 'limpia',
  body: 'La actualización de octubre añade a Copilot una función que revisa la tabla y corrige espacios sobrantes y formatos de texto y número que no cuadran.',
  points: ['Detecta espacios de más y formatos mezclados', 'En Excel para Windows, Mac y web', 'Necesita licencia de Microsoft 365 Copilot'],
  source: 'Microsoft · Blog de Excel, octubre 2026',
  cta: '¿Lo probarías en tu equipo?',
  music: '',
  sfx: null,
  durationInFrames: 480,
  splitAt: 230,
};

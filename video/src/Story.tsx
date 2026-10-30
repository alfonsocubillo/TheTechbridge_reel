import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Brand, SfxKit} from './types';
import {BODY, DISPLAY, clamp, fadeUp, sp} from './anim';
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
  cta: string;
  music: string;
  sfx: SfxKit | null;
  durationInFrames: number;
};

// Instagram tapa arriba (barras y nombre de la cuenta, ~230 px) y abajo (caja de respuesta, desde ~1700 px).
const CTA_AT = 58;

/** Historia de 7-12 s: misma estética que los Reels para que la cuenta se reconozca de un vistazo. */
export const Story: React.FC<StoryProps> = (p) => {
  const f = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  const Hero = HEROES[(p.hero in HEROES ? p.hero : 'ia') as HeroKey];
  const push = interpolate(f, [0, durationInFrames], [13.5, 11.5]);
  const az = 0.25 + Math.sin(f / 90) * 0.12;
  const titleLen = p.title.length;
  const size = titleLen <= 22 ? 112 : titleLen <= 38 ? 98 : 86;
  const cta = sp(f, fps, CTA_AT, 12, 0.6);
  const brand: Brand = p.brand;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 32%, ${brand.accentA}2e 0%, ${brand.bg} 62%)`}}>
      <Stage width={width} height={height} bg={brand.bg} accentA={brand.accentA} accentB={brand.accentB}
        cam={{pos: [Math.sin(az) * push, 2.0, Math.cos(az) * push], target: [0, -0.9, 0], fov: 40}}>
        <group position={[0, 0.6, 0]} scale={Math.max(0.001, easeOut((f - 14) / 16))}>
          <Hero t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - 14) / 40)} />
        </group>
        <Floaters t={f} a={brand.accentA} b={brand.accentB} appear={Math.max(0, (f - 24) / 30)} />
      </Stage>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${brand.bg}00 0%, ${brand.bg}00 42%, ${brand.bg}b8 60%, ${brand.bg}ee 100%)`}} />

      <div style={{position: 'absolute', left: 80, right: 80, top: 990, display: 'flex', flexDirection: 'column', gap: 34}}>
        <KineticText text={p.title} highlight={p.highlight} size={size} a={brand.accentA} b={brand.accentB} color={brand.text} delay={24} />
        {p.body && (
          <div style={{fontFamily: BODY, fontWeight: 600, fontSize: 48, lineHeight: 1.3, color: '#c9d1ee', ...fadeUp(f, fps, 40, 30)}}>
            {p.body}
          </div>
        )}
      </div>

      {p.cta && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1540, display: 'flex', justifyContent: 'center'}}>
          <div
            style={{
              padding: '24px 44px', borderRadius: 999, fontFamily: BODY, fontWeight: 800, fontSize: 40, color: '#fff',
              background: `linear-gradient(100deg, ${brand.accentA}, ${brand.accentB})`, boxShadow: `0 0 50px ${brand.accentA}99`,
              transform: `scale(${0.6 + 0.4 * cta})`, opacity: interpolate(f, [CTA_AT, CTA_AT + 6], [0, 1], clamp),
            }}
          >
            {p.cta}
          </div>
        </div>
      )}

      <FormatHeader brand={brand} format={p.badge} label={p.label} hideFrom={durationInFrames + 30} />
      <FilmFinish />

      {p.sfx && (
        <>
          <Audio src={staticFile(p.sfx.whoosh2)} volume={0.5} />
          <Sequence from={12}><Audio src={staticFile(p.sfx.impact)} volume={0.7} /></Sequence>
          <Sequence from={24}><Audio src={staticFile(p.sfx.swipe)} volume={0.3} /></Sequence>
          {p.cta && <Sequence from={CTA_AT + 2}><Audio src={staticFile(p.sfx.pop)} volume={0.5} /></Sequence>}
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
  title: 'Copilot ya trabaja dentro de Excel',
  highlight: 'Excel',
  body: 'Ahora puede crear tablas, fórmulas y gráficos a partir de una petición escrita, sin salir de la hoja.',
  cta: 'Te lo enseñamos esta semana',
  music: '',
  sfx: null,
  durationInFrames: 270,
};

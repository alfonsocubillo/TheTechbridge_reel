import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CoverProps} from './types';
import {BODY, DISPLAY} from './anim';
import {KineticText} from './scenes/Scenes';
import {Stage} from './three/Stage';
import {Floaters, HEROES, type HeroKey} from './three/heroes';
import {Badge3D} from './three/Badge';

// El perfil muestra la portada recortada a 3:4 (de y=240 a y=1680): todo lo importante va dentro.
const SAFE_TOP = 320;

/** Portada: misma plantilla siempre. Cambian el color del formato, el objeto 3D del producto y el título. */
export const Cover: React.FC<CoverProps> = ({brand, formatKey, formatLabel, hero, title, highlight}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const Hero = HEROES[(hero in HEROES ? hero : 'ia') as HeroKey];
  const longest = Math.max(...title.split(' ').map((w) => w.length), 1);
  const size = Math.min(title.length <= 22 ? 128 : title.length <= 36 ? 112 : 96, Math.floor(880 / (longest * 0.6)));
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 38%, ${brand.accentA}30 0%, ${brand.bg} 62%)`}}>
      <Stage width={width} height={height} bg={brand.bg} accentA={brand.accentA} accentB={brand.accentB} dpr={1}
        cam={{pos: [Math.sin(0.4) * 16, 2.4, Math.cos(0.4) * 16], target: [0, -0.62, 0], fov: 40}}>
        <group position={[0, 0.6, 0]}>
          <Hero t={f} a={brand.accentA} b={brand.accentB} appear={1} />
        </group>
        <Floaters t={f} a={brand.accentA} b={brand.accentB} appear={1} />
      </Stage>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${brand.bg}00 0%, ${brand.bg}00 45%, ${brand.bg}c0 62%, ${brand.bg}ee 100%)`}} />
      <div style={{position: 'absolute', left: 84, top: SAFE_TOP, display: 'flex', alignItems: 'center', gap: 22}}>
        <Badge3D size={130} format={formatKey} brand={brand} ry={-0.35} rx={0.12} />
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 52, letterSpacing: 4, color: '#fff', textShadow: `0 0 18px ${brand.accentA}`}}>
          {formatLabel}
        </div>
      </div>
      <div style={{position: 'absolute', left: 84, right: 84, top: 1010}}>
        <KineticText text={title} highlight={highlight} size={size} a={brand.accentA} b={brand.accentB} color={brand.text} />
      </div>
      <div style={{position: 'absolute', left: 84, top: 1540, display: 'flex', alignItems: 'center', gap: 22}}>
        {brand.logo ? (
          <div style={{background: 'rgba(255,255,255,0.94)', borderRadius: 14, padding: '10px 16px', display: 'flex'}}>
            <Img src={staticFile(brand.logo)} style={{height: 46}} />
          </div>
        ) : null}
        <div style={{fontFamily: BODY, fontWeight: 600, fontSize: 34, color: brand.muted, letterSpacing: 0.5}}>{brand.handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const coverSample: CoverProps = {
  brand: {
    name: 'The TechBridge Solution',
    handle: '@thetechbridgesolution',
    bg: '#070B18',
    text: '#F5F7FF',
    muted: '#9AA4C7',
    accentA: '#06B6D4',
    accentB: '#10B981',
    logo: null,
  },
  formatKey: 'truco',
  formatLabel: 'TRUCO',
  hero: 'excel',
  title: 'Excel separa nombres sin fórmulas',
  highlight: 'fórmulas',
};

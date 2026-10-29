import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import type {CoverProps} from './types';
import {BODY, DISPLAY, headlineSize} from './anim';
import {Background} from './components/Layers';
import {Kicker, KineticText} from './scenes/Scenes';

// El perfil de Instagram muestra la portada recortada a 3:4 (de y=240 a y=1680).
// Todo lo importante va dentro de esa franja para que se lea igual en la cuadrícula y en la pestaña de Reels.
const SAFE_TOP = 330;
const SAFE_BOTTOM = 1920 - 1590;

/** Portada: misma plantilla y mismo fondo de marca para todos los vídeos (sin clips de stock, para que la
 *  cuadrícula del perfil sea coherente). Solo cambian el color del formato y el título. */
export const Cover: React.FC<CoverProps> = ({brand, formatLabel, title, highlight}) => {
  const longest = Math.max(...title.split(' ').map((w) => w.length), 1);
  const size = Math.min(headlineSize(title) + 12, Math.floor(900 / (longest * 0.6)));
  return (
    <AbsoluteFill style={{backgroundColor: brand.bg}}>
      <Background brand={brand} />
      <div
        style={{
          position: 'absolute',
          left: 84,
          right: 84,
          top: SAFE_TOP,
          bottom: SAFE_BOTTOM,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <Kicker label={formatLabel} a={brand.accentA} />
        </div>
        <div>
          <KineticText text={title} highlight={highlight} size={size} a={brand.accentA} b={brand.accentB} color={brand.text} />
          <div
            style={{
              width: 220,
              height: 12,
              marginTop: 44,
              borderRadius: 6,
              background: `linear-gradient(90deg, ${brand.accentA}, ${brand.accentB})`,
              boxShadow: `0 0 28px ${brand.accentA}`,
            }}
          />
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
          {brand.logo ? (
            <div style={{background: 'rgba(255,255,255,0.94)', borderRadius: 14, padding: '10px 16px', display: 'flex'}}>
              <Img src={staticFile(brand.logo)} style={{height: 46}} />
            </div>
          ) : null}
          <div style={{fontFamily: BODY, fontWeight: 600, fontSize: 34, color: brand.muted, letterSpacing: 0.5}}>
            {brand.handle}
          </div>
        </div>
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
  formatLabel: 'TRUCO',
  title: 'Copilot resume tus correos',
  highlight: 'Copilot',
};

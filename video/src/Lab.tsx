import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Stage} from './three/Stage';
import {HEROES, type HeroKey} from './three/heroes';

/** Banco de pruebas: un objeto 3D sobre el plató. Solo para revisar diseño y tiempos de render. */
export type LabProps = {hero: HeroKey; accentA: string; accentB: string; bg: string; mode?: 'full' | 'noenv' | 'empty' | 'none'};

export const Lab: React.FC<LabProps> = ({hero, accentA, accentB, bg, mode = 'full'}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const Hero = HEROES[hero];
  const az = 0.25 + f * 0.004;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 35%, #16224a 0%, ${bg} 70%)`}}>
      {mode !== 'none' && <Stage env={mode === 'full'} floor={mode !== 'empty'} dust={mode !== 'empty'} width={width} height={height} bg={bg} accentA={accentA} accentB={accentB}
        cam={{pos: [Math.sin(az) * 12, 1.8, Math.cos(az) * 12], target: [0, -1.3, 0], fov: 40}}>
        {mode !== 'empty' && <group position={[0, 0.5, 0]}>
          <Hero t={f} a={accentA} b={accentB} appear={Math.min(1, f / 40)} />
        </group>}
      </Stage>}
    </AbsoluteFill>
  );
};

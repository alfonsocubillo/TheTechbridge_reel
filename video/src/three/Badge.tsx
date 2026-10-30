import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {PerspectiveCamera, RoundedBox} from '@react-three/drei';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import type {Brand} from '../types';
import {DISPLAY} from '../anim';
import {Gloss} from './Stage';
import {arrowGeo, barsGeo, boltGeo, bubbleGeo, sparkleGeo, swapGeo} from './shapes';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Icono 3D de cada formato. */
const FormatIcon: React.FC<{format: string; color: string; t: number}> = ({format, color, t}) => {
  const geo = useMemo(() => {
    switch (format) {
      case 'truco':
        return boltGeo(1.15);
      case 'dato':
        return barsGeo(1.05);
      case 'tendencia':
        return arrowGeo(1.1);
      case 'prompt':
      case 'pregunta':
        return bubbleGeo(1.05, 0.72);
      case 'antes_despues':
        return swapGeo(1.15);
      case 'mito':
        return null;
      default:
        return sparkleGeo(0.55);
    }
  }, [format]);
  if (format === 'mito') {
    return (
      <group rotation-z={-0.6} position={[-0.06, 0.06, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <torusGeometry args={[0.3, 0.075, 20, 48]} />
          <Gloss color={color} rough={0.15} glow={0.3} />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <capsuleGeometry args={[0.07, 0.3, 8, 16]} />
          <Gloss color={color} rough={0.15} glow={0.3} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh geometry={geo!}>
        <Gloss color={color} rough={0.15} glow={0.3} />
      </mesh>
      {(format === 'prompt' || format === 'pregunta') &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.24, 0.02, 0.14]} scale={0.9 + 0.3 * Math.max(0, Math.sin(t * 0.2 - i))}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#1b2550" />
          </mesh>
        ))}
    </group>
  );
};

const BadgeCam: React.FC = () => {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  useLayoutEffect(() => ref.current?.lookAt(0, 0, 0));
  return <PerspectiveCamera ref={ref} makeDefault fov={30} position={[0, 0, 6.2]} />;
};

/** Insignia 3D: baldosa brillante del color del formato con el icono delante. */
export const Badge3D: React.FC<{
  size: number;
  format: string;
  brand: Brand;
  rx?: number;
  ry?: number;
  z?: number;
  scale?: number;
}> = ({size, format, brand, rx = 0, ry = 0, z = 0, scale = 1}) => {
  const t = useCurrentFrame();
  return (
    <ThreeCanvas width={size} height={size} dpr={1} gl={{antialias: false, alpha: true}} style={{width: size, height: size}}>
      <BadgeCam />
      <group rotation={[rx, ry, 0]} position={[0, 0, z]} scale={scale}>
        <RoundedBox args={[1.9, 1.9, 0.5]} radius={0.42} smoothness={6}>
          <Gloss color={brand.accentA} rough={0.18} glow={0.15} />
        </RoundedBox>
        <RoundedBox args={[1.7, 1.7, 0.1]} radius={0.36} position={[0, 0, 0.22]}>
          <Gloss color={brand.accentB} rough={0.1} glow={0.25} opacity={0.35} />
        </RoundedBox>
        <group position={[0, 0, 0.42]}>
          <FormatIcon format={format} color="#ffffff" t={t} />
        </group>
      </group>
    </ThreeCanvas>
  );
};

/**
 * Apertura + cabecera: en el primer segundo la insignia del formato llega volando, "aterriza" con un golpe
 * y debajo aparece el tipo de vídeo en grande (NOTICIA, TRUCO...). Después se encoge a la esquina superior
 * y se queda ahí todo el vídeo, para que quien entre a mitad sepa qué está viendo.
 */
export const FormatHeader: React.FC<{brand: Brand; format: string; label: string; hideFrom: number}> = ({brand, format, label, hideFrom}) => {
  const f = useCurrentFrame();
  const BIG = 400;
  const SMALL = 112;
  // 0-12 llega · 12-20 golpe y rótulo · 24-36 viaja a la cabecera
  const fly = interpolate(f, [0, 12], [0, 1], {...clamp, easing: Easing.bezier(0.2, 0.8, 0.2, 1)});
  const punch = interpolate(f, [12, 15, 21], [1, 1.14, 1], clamp);
  const dock = interpolate(f, [24, 36], [0, 1], {...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1)});
  const fade = interpolate(f, [hideFrom - 10, hideFrom], [1, 0], clamp);

  const size = BIG + (SMALL - BIG) * dock;
  const cx = 540 + (70 + SMALL / 2 - 540) * dock;
  const cy = 700 + (262 - 700) * dock;
  const ry = interpolate(fly, [0, 1], [-2.8, 0]) + (dock > 0 ? Math.sin(f / 28) * 0.35 * dock : 0);
  const rx = interpolate(fly, [0, 1], [0.6, 0]);
  const z = interpolate(fly, [0, 1], [-14, 0]);

  // Rótulo: grande y centrado bajo la insignia → pequeño a la derecha de la insignia pequeña
  const letters = label.length;
  const bigFont = Math.min(132, Math.floor(940 / Math.max(letters * 0.72, 1)));
  const font = bigFont + (46 - bigFont) * dock;
  const reveal = interpolate(f, [13, 22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const labelX = interpolate(dock, [0, 1], [540, 70 + SMALL + 26]);
  const labelY = interpolate(dock, [0, 1], [700 + BIG / 2 + 40 + bigFont / 2, 262]);
  const shock = interpolate(f, [12, 30], [0, 1], clamp);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: fade}}>
      {f < 36 && (
        <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, transparent 30%, ${brand.bg}cc 100%)`, opacity: 1 - dock}} />
      )}
      {f >= 12 && f < 32 && (
        <div
          style={{
            position: 'absolute', left: 540 - 260, top: 700 - 260, width: 520, height: 520, borderRadius: '50%',
            border: `6px solid ${brand.accentB}`, opacity: (1 - shock) * 0.8, transform: `scale(${0.6 + shock * 1.4})`,
            boxShadow: `0 0 60px ${brand.accentB}`,
          }}
        />
      )}
      <div style={{position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, height: size, transform: `scale(${punch})`}}>
        <div style={{position: 'absolute', inset: '12%', borderRadius: '30%', boxShadow: `0 0 ${80 * (1 - dock) + 20}px ${brand.accentA}aa`}} />
        <div style={{transform: `scale(${size / BIG})`, transformOrigin: 'top left', width: BIG, height: BIG}}>
          <Badge3D size={BIG} format={format} brand={brand} rx={rx} ry={ry} z={z} />
        </div>
      </div>
      <div
        style={{
          position: 'absolute', left: labelX, top: labelY, transform: `translate(${-50 * (1 - dock)}%, -50%)`,
          whiteSpace: 'nowrap', fontFamily: DISPLAY, fontWeight: 700, fontSize: font, letterSpacing: font * 0.08,
          color: '#ffffff', textShadow: `0 0 ${30 * (1 - dock) + 8}px ${brand.accentA}`,
          clipPath: `inset(0 ${(1 - reveal) * 50}% 0 ${(1 - reveal) * 50}%)`,
        }}
      >
        {label}
        <div
          style={{
            height: 8 - 4 * dock, marginTop: 14 - 8 * dock, borderRadius: 4, width: `${reveal * 100}%`,
            background: `linear-gradient(90deg, ${brand.accentA}, ${brand.accentB})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

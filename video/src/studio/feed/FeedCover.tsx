import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BRAND, FEED, FeedBg, theme, Grain, Hi, INTER, Lockup, OutlineGlyph, PageCount, Rail, Spaced, TIGHT, family, fit} from '../kit';

/**
 * Sistema de portadas del feed. Una sola gramática para Reels y carruseles:
 *   marca arriba a la izquierda · antetítulo espaciado en el color de la familia · titular grande en Inter Tight
 *   con la parte clave en color · subtítulo gris · glifo gigante de contorno · raíl con punto · llamada abajo.
 * Cambian el color y el glifo de cada familia (noticia, tutorial, comparativa, análisis, prompting, curiosidad) y
 * una de tres composiciones, así el perfil se ve variado pero claramente de la misma marca.
 *
 * Zonas seguras: la cuadrícula del perfil recorta a 3:4. En Reel (1080x1920) se ve de y=240 a y=1680; en
 * carrusel (1080x1350) se pierden ~34 px por cada lado. Todo lo importante va dentro.
 */
export type FeedCoverProps = {
  family: string;
  kicker: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  /** Glifo de fondo (por defecto el de la familia; en listas, el número de elementos). */
  glyph?: string;
  /** a = titular arriba y glifo abajo · b = glifo arriba y titular abajo · c = titular centrado con glifo detrás */
  layout?: 'a' | 'b' | 'c';
  cta?: string;
  /** Solo carrusel: número de diapositivas para "01 / 07". */
  total?: number;
  /** Aplicación de la que trata (excel, teams…): usa su color. Sin app, el azul de la marca. */
  app?: string | null;
};

export const FeedCover: React.FC<FeedCoverProps & {format: 'reel' | 'carousel'}> = (p) => {
  const fam = family(p.family, p.app);
  const reel = p.format === 'reel';
  const H = reel ? 1920 : 1350;
  const top = reel ? 300 : 70; // dentro del recorte 3:4
  const bottom = reel ? 1620 : 1290;
  const layout = p.layout ?? 'a';
  const glyph = p.glyph ?? fam.glyph;
  const titleW = 900;
  const size = fit(p.title, titleW, glyph.length > 2 ? 120 : 128, 78, layout === 'c' ? 4 : 3, 0.5);
  const kickerSize = fit(p.kicker, 900, 31, 22, 1, 0.95);

  // Posición vertical del bloque de texto según la composición
  const blockTop = layout === 'b' ? (reel ? 860 : 500) : layout === 'c' ? (reel ? 640 : 380) : reel ? 560 : 300;
  const glyphBox = {
    a: {x: 1095, y: bottom - 20, size: reel ? 560 : 470, anchor: 'end' as const},
    b: {x: 1095, y: blockTop - 40, size: reel ? 520 : 430, anchor: 'end' as const},
    c: {x: 540, y: blockTop + (reel ? 560 : 520), size: reel ? 760 : 640, anchor: 'middle' as const},
  }[layout];

  return (
    <AbsoluteFill style={{background: FEED.bg, overflow: 'hidden'}}>
      <FeedBg glow={p.app ? theme(p.app).deep : layout === 'b' ? BRAND.blue : BRAND.deep} flip={layout === 'b'} />
      <OutlineGlyph text={glyph} x={glyphBox.x} y={glyphBox.y} size={glyphBox.size} anchor={glyphBox.anchor} opacity={layout === 'c' ? 0.3 : 1} />
      <Lockup y={top} />
      {p.total ? <PageCount i={1} n={p.total} y={top} /> : <Spaced color={fam.accent} size={26} spacing={6} style={{position: 'absolute', right: 90, top: top + 4}}>{fam.label}</Spaced>}

      <div style={{position: 'absolute', left: 90, top: blockTop, width: titleW, display: 'flex', flexDirection: 'column', gap: 34, textAlign: layout === 'c' ? 'left' : 'left'}}>
        <Spaced color={fam.accent} size={kickerSize} spacing={kickerSize * 0.26}>{p.kicker}</Spaced>
        <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: -size * 0.035, color: FEED.text}}>
          <Hi text={p.title} highlight={p.highlight} color={fam.accent} />
        </div>
        {p.subtitle && (
          <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(p.subtitle, 740, 42, 32, 2, 0.52), lineHeight: 1.32, color: FEED.muted, maxWidth: 740}}>{p.subtitle}</div>
        )}
      </div>

      <Rail y={bottom - 100} color={fam.accent} />
      <Spaced color="#fff" size={33} spacing={8} style={{position: 'absolute', right: 160, top: bottom - 122}}>{p.cta ?? (reel ? 'VER' : 'DESLIZA')}</Spaced>
      <div style={{position: 'absolute', right: 90, top: bottom - 103, width: 56, height: 3, background: fam.accent}} />
      <div style={{position: 'absolute', right: 86, top: bottom - 112, width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: `16px solid ${fam.accent}`}} />
      {reel && <div style={{position: 'absolute', left: 0, right: 0, top: H - 1, height: 1}} />}
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

export const FeedCoverReel: React.FC<FeedCoverProps> = (p) => <FeedCover {...p} format="reel" />;

export const feedCoverSample: FeedCoverProps = {
  family: 'tutorial',
  kicker: 'GUÍA RÁPIDA · MICROSOFT 365 COPILOT',
  title: '5 prompts que te ahorran tiempo cada día',
  highlight: 'cada día',
  subtitle: 'Uno para cada herramienta que ya usas en el trabajo.',
  glyph: '5',
  layout: 'a',
};

import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cue, FEED, Grain, Hi, INTER, Music, POP, SfxTrack, Spaced, TIGHT, clamp, family, fit} from '../kit';
import {Stage} from '../../three/Stage';
import {Floaters, HEROES, type HeroKey} from '../../three/heroes';

/**
 * Reels del feed (1080x1920, 25-45 s). Familia propia, nunca usada en historias.
 *   RL01 Cinemático 3D  · plató 3D con movimientos de cámara por capítulo, bandas de cine, tipografía editorial
 *                         centrada y destellos de luz entre escenas. Azul noche + color de la familia.
 *   RL02 Documental     · fondo claro, cuadrícula de baldosas 3D que se recolocan, etiqueta roja de NOTICIA,
 *                         capítulos "QUÉ HACE · 1/3", fecha y fuente. Para noticias y análisis.
 *   RL03 Versus         · pantalla partida A/B, rondas por criterio con marcadores y conclusión honesta.
 *
 * Escenas comunes: hook {kicker, text, highlight} · chapter {label, title, body} · stat {value, label, source}
 *   · points {title, items} · insight {text} · end {title, highlight, text}
 * Documental añade: date {label, title, text}. Versus añade: duel · round {criterion, a, b, a_score, b_score, verdict}
 *   · choose {a_if, b_if}. Versus usa extra.a / extra.b = {name, tagline}.
 */
export type ReelScene = {type: string} & Record<string, any>;
export type StudioReelProps = {
  model: string;
  family: string;
  hero?: string;
  scenes: ReelScene[];
  extra?: Record<string, any>;
  music?: string;
  musicStart?: number;
  musicVolume?: number;
};

const words = (s: ReelScene) => Object.values(s).filter((v) => typeof v === 'string').join(' ').split(/\s+/).length
  + (s.items ?? []).join(' ').split(/\s+/).length + (s.a_if ?? []).join(' ').split(/\s+/).length + (s.b_if ?? []).join(' ').split(/\s+/).length;

/** Duración de cada escena según lo que hay que leer (unas 3 palabras por segundo, con mínimos y máximos). */
export const reelTimeline = (scenes: ReelScene[]) => {
  let t = 0;
  return scenes.map((s) => {
    const min = s.type === 'hook' ? 3.2 : s.type === 'end' ? 4.5 : 3.6;
    const sec = Math.min(Math.max(1.6 + words(s) * 0.31, min), s.type === 'round' ? 8 : 7.5);
    const from = t;
    const dur = Math.round(sec * 30);
    t += dur;
    return {from, dur};
  });
};
export const reelDuration = (scenes: ReelScene[]) => reelTimeline(scenes).reduce((a, x) => a + x.dur, 0);

export const StudioReel: React.FC<StudioReelProps> = (p) => {
  const {durationInFrames} = useVideoConfig();
  const tl = reelTimeline(p.scenes);
  const Body = {RL01: Cine, RL02: Doc, RL03: Versus}[p.model] ?? Cine;
  const cues = reelCues(p.model, p.scenes, tl);
  return (
    <AbsoluteFill>
      <Body {...p} tl={tl} />
      <SfxTrack cues={cues} total={durationInFrames} />
      <Music src={p.music} total={durationInFrames} volume={p.musicVolume ?? 0.45} startFrom={Math.round((p.musicStart ?? 0) * 30)} ducks={tl.slice(1).map((x) => x.from)} />
    </AbsoluteFill>
  );
};

type BodyProps = StudioReelProps & {tl: {from: number; dur: number}[]};

/** Entrada/salida de cada escena con desplazamiento y desenfoque. */
const Enter: React.FC<{dur: number; children: React.ReactNode; dy?: number}> = ({dur, children, dy = 50}) => {
  const f = useCurrentFrame();
  const i = interpolate(f, [0, 12], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const o = interpolate(f, [dur - 8, dur], [0, 1], clamp);
  return <AbsoluteFill style={{opacity: Math.min(i, 1 - o), transform: `translateY(${(1 - i) * dy - o * 30}px)`, filter: `blur(${(1 - i) * 10 + o * 8}px)`}}>{children}</AbsoluteFill>;
};

const stagger = (f: number, fps: number, at: number) => spring({frame: f - at, fps, config: {damping: 16, mass: 0.7}});

// ───────────────────────── RL01 · Cinemático 3D ─────────────────────────

const camFor = (type: string, k: number, local: number, dur: number): {pos: [number, number, number]; target: [number, number, number]; fov: number} => {
  const p = local / Math.max(dur, 1);
  const side = k % 2 ? -1 : 1;
  switch (type) {
    case 'hook': { // dolly lento desde lejos
      const d = 17 - 5 * p;
      return {pos: [Math.sin(0.3) * d, 2.4 - p, Math.cos(0.3) * d], target: [0, -0.4, 0], fov: 36};
    }
    case 'stat': { // grúa: sube y mira desde arriba
      const a = 0.2 + p * 0.5;
      return {pos: [side * 4, 6 + p * 3, 8 - p * 2], target: [0, -0.8, 0], fov: 40 + a};
    }
    case 'end': { // se aleja
      const d = 10 + p * 6;
      return {pos: [Math.sin(-0.4 + p * 0.3) * d, 2.2 + p * 1.5, Math.cos(-0.4 + p * 0.3) * d], target: [0, -0.2, 0], fov: 38};
    }
    default: { // órbita lateral alrededor del objeto
      const a = side * (0.9 - p * 0.9) + 0.2;
      return {pos: [Math.sin(a) * 11, 1.2 + Math.sin(p * Math.PI) * 0.8, Math.cos(a) * 11], target: [0, 0.1, 0], fov: 34};
    }
  }
};

const Cine: React.FC<BodyProps> = ({scenes, tl, family: famKey, hero}) => {
  const f = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  const fam = family(famKey);
  const idx = Math.max(0, tl.findIndex((x) => f >= x.from && f < x.from + x.dur));
  const cur = tl[idx] ?? tl[0];
  const scene = scenes[idx] ?? scenes[0];
  const Hero = HEROES[((scene.hero ?? hero ?? 'ia') in HEROES ? scene.hero ?? hero ?? 'ia' : 'ia') as HeroKey];
  const cam = camFor(scene.type, idx, f - cur.from, cur.dur);
  const bars = interpolate(f, [0, 40], [190, 0], clamp) + interpolate(f, [durationInFrames - 40, durationInFrames], [0, 190], clamp);
  return (
    <AbsoluteFill style={{background: FEED.bg}}>
      <Stage width={width} height={height} bg={FEED.bg} accentA={fam.accent} accentB="#3B82F6" cam={cam} env dpr={1}>
        <group position={[0, scene.type === 'end' ? -0.2 : 0.3, 0]} scale={Math.max(0.001, spring({frame: f - 10, fps, config: {damping: 18}}))}>
          <Hero t={f} a={fam.accent} b="#3B82F6" appear={Math.min(1, f / 40)} />
        </group>
        <Floaters t={f} a={fam.accent} b="#3B82F6" appear={Math.min(1, f / 50)} />
      </Stage>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${FEED.bg}f0 0%, ${FEED.bg}b0 30%, ${FEED.bg}00 48%, ${FEED.bg}00 70%, ${FEED.bg}d0 100%)`}} />
      {scenes.map((s, i) => (
        <Sequence key={i} from={tl[i].from} durationInFrames={tl[i].dur}>
          <Enter dur={tl[i].dur}>
            <CineText s={s} i={i} n={scenes.filter((x) => x.type === 'chapter').length} accent={fam.accent} chapterNo={scenes.slice(0, i + 1).filter((x) => x.type === 'chapter').length} />
          </Enter>
        </Sequence>
      ))}
      {/* Destello de luz en cada corte */}
      {tl.slice(1).map((x, i) => {
        const o = interpolate(f, [x.from - 4, x.from, x.from + 10], [0, 0.55, 0], clamp);
        return o > 0 ? <AbsoluteFill key={i} style={{background: `linear-gradient(${100 + i * 30}deg, transparent 30%, ${fam.accent}${Math.round(o * 255).toString(16).padStart(2, '0')} 50%, transparent 70%)`}} /> : null;
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: POP, fontWeight: 600, fontSize: 28, color: '#ffffffcc'}}>
        The TechBridge Solution <span style={{color: fam.accent}}>|</span> {fam.label.charAt(0) + fam.label.slice(1).toLowerCase()}
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, height: 6, width: `${(f / durationInFrames) * 100}%`, background: fam.accent}} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};

const CineText: React.FC<{s: ReelScene; i: number; n: number; chapterNo: number; accent: string}> = ({s, n, chapterNo, accent}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const center: React.CSSProperties = {position: 'absolute', left: 80, right: 80, top: 230, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26};
  const title = (t: string, hl?: string, max = 104) => {
    const size = fit(t, 920, max, 62, 3, 0.5);
    return <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color: '#fff'}}><Hi text={t} highlight={hl} color={accent} /></div>;
  };
  switch (s.type) {
    case 'hook':
      return <div style={center}>{s.kicker && <Spaced color={accent} size={28} spacing={8}>{s.kicker}</Spaced>}{title(s.text, s.highlight, 116)}</div>;
    case 'chapter':
      return (
        <div style={center}>
          <Spaced color={accent} size={28} spacing={7}>{`${String(chapterNo).padStart(2, '0')} / ${String(n).padStart(2, '0')}${s.label ? ' — ' + s.label : ''}`}</Spaced>
          {title(s.title, s.highlight, 92)}
          {s.body && <div style={{position: 'absolute', top: 1050, left: 0, right: 0, fontFamily: INTER, fontWeight: 600, fontSize: fit(s.body, 900, 46, 34, 4, 0.52), lineHeight: 1.35, color: '#E2E8F5', textAlign: 'center'}}>{s.body}</div>}
        </div>
      );
    case 'stat': {
      const raw = String(s.value);
      const m = raw.match(/^([^\d]*)([\d.,]+)(.*)$/);
      const target = m ? parseFloat(m[2].replace(/\./g, '').replace(',', '.')) : 0;
      const p = interpolate(f, [6, 46], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
      const shown = m ? `${m[1]}${Math.round(target * p).toLocaleString('es-ES')}${m[3]}` : raw;
      return (
        <div style={center}>
          <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: fit(raw, 920, 260, 130, 1, 0.6), color: accent, letterSpacing: -6, lineHeight: 1}}>{shown}</div>
          <div style={{fontFamily: INTER, fontWeight: 600, fontSize: fit(String(s.label), 900, 50, 36, 3, 0.52), color: '#fff', lineHeight: 1.3}}>{s.label}</div>
          {s.source && <div style={{position: 'absolute', top: 1260, fontFamily: INTER, fontSize: 26, color: '#ffffff99'}}>Fuente: {s.source}</div>}
        </div>
      );
    }
    case 'points':
      return (
        <div style={{...center, alignItems: 'stretch', textAlign: 'left'}}>
          {title(s.title, s.highlight, 80)}
          <div style={{position: 'absolute', top: 1000, left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 20}}>
            {(s.items ?? []).slice(0, 4).map((it: string, k: number) => {
              const sp = stagger(f, fps, 10 + k * 9);
              return (
                <div key={k} style={{display: 'flex', gap: 22, alignItems: 'center', padding: '22px 28px', borderRadius: 22, background: 'rgba(8,16,40,0.82)', border: `2px solid ${accent}55`, transform: `translateX(${(1 - sp) * 200}px)`, opacity: sp}}>
                  <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: 40, color: accent, minWidth: 50}}>{String(k + 1).padStart(2, '0')}</div>
                  <div style={{fontFamily: INTER, fontWeight: 600, fontSize: fit(it, 760, 40, 30, 2, 0.52), color: '#fff', lineHeight: 1.25}}>{it}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    case 'insight':
      return <div style={{...center, top: 300}}><div style={{fontFamily: TIGHT, fontWeight: 700, fontSize: fit(s.text, 920, 80, 52, 5, 0.5), lineHeight: 1.12, color: '#fff'}}><Hi text={s.text} highlight={s.highlight} color={accent} /></div></div>;
    case 'end':
    default:
      return (
        <div style={{...center, top: 260}}>
          {title(s.title ?? '', s.highlight, 104)}
          {s.text && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 42, color: '#C8D2E6', lineHeight: 1.35}}>{s.text}</div>}
          <div style={{position: 'absolute', top: 1150, display: 'flex', gap: 22}}>
            {['GUARDAR', 'COMPARTIR'].map((b, k) => (
              <div key={b} style={{padding: '24px 34px', borderRadius: 18, background: k === 0 ? accent : 'rgba(5,10,26,0.7)', border: k ? `2px solid ${FEED.line}` : 'none', transform: `scale(${stagger(f, fps, 14 + k * 6)})`}}>
                <Spaced color={k === 0 ? FEED.ink : '#fff'} size={30} spacing={5}>{b}</Spaced>
              </div>
            ))}
          </div>
        </div>
      );
  }
};

// ───────────────────────── RL02 · Documental claro ─────────────────────────

const LIGHT = {bg: '#E9EEF6', ink: '#0E1A33', soft: '#5B6B86', red: '#E5322D', blue: '#2453D6'};

/** Baldosas 3D (CSS) que forman una cuadrícula, se dispersan y vuelven a ordenarse según la escena. */
const Tiles: React.FC<{mode: number; f: number}> = ({mode, f}) => {
  const cols = 6;
  const rows = 8;
  return (
    <div style={{position: 'absolute', left: 90, top: 760, width: 900, height: 700, perspective: 1600}}>
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${48 - mode * 6}deg) rotateZ(${-8 + Math.sin(f / 70) * 4}deg)`}}>
        {Array.from({length: cols * rows}, (_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const seed = Math.sin(i * 91.7) * 1000;
          const scatter = mode === 0 ? interpolate(f, [0, 60], [1, 0], clamp) : 0;
          const lift = mode === 2 && (i * 7) % 5 === 0 ? 30 + Math.sin(f / 10 + i) * 10 : 0;
          const x = c * 150 + (seed % 200) * scatter;
          const y = r * 86 + ((seed * 3) % 300) * scatter;
          const head = r === 0;
          const hot = mode >= 1 && (i * 13) % 11 === 0;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y, width: 132, height: 70, borderRadius: 12,
              background: head ? '#7FA4EA' : hot ? '#F3A6A6' : '#FBFCFF', boxShadow: `0 ${8 + lift / 2}px 0 ${head ? '#5C80C8' : hot ? '#D07A7A' : '#C9D2E3'}, 0 ${20 + lift}px 30px rgba(14,26,51,0.18)`,
              transform: `translateZ(${lift + scatter * ((seed % 400) - 100)}px) rotate(${scatter * (seed % 90)}deg)`}} />
          );
        })}
      </div>
    </div>
  );
};

const Doc: React.FC<BodyProps> = ({scenes, tl}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const idx = Math.max(0, tl.findIndex((x) => f >= x.from && f < x.from + x.dur));
  const chapters = scenes.filter((x) => x.type === 'chapter').length;
  const mode = scenes[idx]?.type === 'hook' ? 0 : scenes[idx]?.type === 'chapter' ? 1 : 2;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 30%, #FFFFFF 0%, ${LIGHT.bg} 70%)`}}>
      <Tiles mode={mode} f={f} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: POP, fontWeight: 600, fontSize: 28, color: LIGHT.ink}}>
        The TechBridge Solution <span style={{color: LIGHT.red}}>|</span> Análisis
      </div>
      {scenes.map((s, i) => {
        const chNo = scenes.slice(0, i + 1).filter((x) => x.type === 'chapter').length;
        return (
          <Sequence key={i} from={tl[i].from} durationInFrames={tl[i].dur}>
            <Enter dur={tl[i].dur} dy={30}>
              <div style={{position: 'absolute', left: 90, right: 90, top: 230, display: 'flex', flexDirection: 'column', gap: 22}}>
                <DocText s={s} chNo={chNo} chapters={chapters} f={f - tl[i].from} fps={fps} />
              </div>
            </Enter>
          </Sequence>
        );
      })}
      <div style={{position: 'absolute', left: 0, top: 0, height: 6, width: `${(f / durationInFrames) * 100}%`, background: LIGHT.ink}} />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

const DocText: React.FC<{s: ReelScene; chNo: number; chapters: number; f: number; fps: number}> = ({s, chNo, chapters, f, fps}) => {
  const big = (t: string, hl?: string, max = 96) => {
    const size = fit(t, 900, max, 58, 3, 0.5);
    return <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -size * 0.03, color: LIGHT.ink}}><Hi text={t} highlight={hl} color={LIGHT.blue} /></div>;
  };
  const body = (t?: string) => t ? <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(t, 900, 40, 30, 4, 0.52), lineHeight: 1.38, color: LIGHT.soft}}>{t}</div> : null;
  switch (s.type) {
    case 'hook':
      return (
        <>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <div style={{padding: '8px 16px', background: LIGHT.red, color: '#fff', fontFamily: POP, fontWeight: 700, fontSize: 26, letterSpacing: 3, borderRadius: 6}}>{s.tag ?? 'NOTICIA'}</div>
            <Spaced color={LIGHT.ink} size={26} spacing={5}>{s.kicker}</Spaced>
          </div>
          {big(s.text, s.highlight, 108)}
        </>
      );
    case 'chapter':
      return <><Spaced color={LIGHT.blue} size={26} spacing={6}>{`${s.label ?? 'QUÉ HACE'} · ${chNo}/${chapters}`}</Spaced>{big(s.title, s.highlight)}{body(s.body)}</>;
    case 'date':
      return (
        <>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{width: 16, height: 16, borderRadius: '50%', background: LIGHT.red, opacity: 0.5 + 0.5 * Math.sin(f / 4)}} />
            <Spaced color={LIGHT.ink} size={26} spacing={6}>{s.label ?? 'DISPONIBILIDAD'}</Spaced>
          </div>
          <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: fit(String(s.title), 900, 130, 80, 1, 0.55), color: LIGHT.blue, letterSpacing: -3, lineHeight: 1}}>{s.title}</div>
          {body(s.text)}
          {s.source && <div style={{fontFamily: INTER, fontSize: 26, color: LIGHT.soft}}>Fuente: {s.source}</div>}
        </>
      );
    case 'stat':
      return <><div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: fit(String(s.value), 900, 220, 120, 1, 0.6), color: LIGHT.blue, letterSpacing: -5, lineHeight: 1}}>{s.value}</div>{big(s.label, undefined, 64)}{s.source && body('Fuente: ' + s.source)}</>;
    case 'points':
      return (
        <>
          {big(s.title, s.highlight, 84)}
          {(s.items ?? []).slice(0, 4).map((it: string, k: number) => {
            const sp = stagger(f, fps, 8 + k * 8);
            return <div key={k} style={{fontFamily: INTER, fontWeight: 600, fontSize: 38, color: LIGHT.ink, opacity: sp, transform: `translateX(${(1 - sp) * 60}px)`}}><span style={{color: LIGHT.red}}>●</span> {it}</div>;
          })}
        </>
      );
    case 'insight':
      return big(s.text, s.highlight, 90);
    default:
      return <><div style={{height: 120}} />{big(s.title ?? '', s.highlight, 104)}{body(s.text)}</>;
  }
};

// ───────────────────────── RL03 · Versus ─────────────────────────

const VA = '#7DD3FC';
const VB = '#FCD34D';

const Versus: React.FC<BodyProps> = ({scenes, tl, extra}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const a = extra?.a ?? {name: 'A'};
  const b = extra?.b ?? {name: 'B'};
  const idx = Math.max(0, tl.findIndex((x) => f >= x.from && f < x.from + x.dur));
  // Marcador acumulado de las rondas ya vistas
  let sa = 0;
  let sb = 0;
  scenes.forEach((s, i) => {
    if (s.type === 'round' && i <= idx && f > tl[i].from + 40) {
      sa += Number(s.a_score ?? 0);
      sb += Number(s.b_score ?? 0);
    }
  });
  const split = 540 + Math.sin(f / 30) * 8;
  return (
    <AbsoluteFill style={{background: FEED.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: split, background: `linear-gradient(180deg, ${VA}22, ${VA}05)`}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, left: split, background: `linear-gradient(180deg, ${VB}22, ${VB}05)`}} />
      <div style={{position: 'absolute', left: split - 2, top: 0, bottom: 0, width: 4, background: '#fff', opacity: 0.6}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: POP, fontWeight: 600, fontSize: 28, color: '#fff'}}>The TechBridge Solution <span style={{color: VB}}>|</span> Comparativa</div>
      {/* Marcador fijo */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 200, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: 52, color: VA}}>{a.name} <span style={{color: '#fff'}}>{sa}</span></div>
        <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: 52, color: VB}}><span style={{color: '#fff'}}>{sb}</span> {b.name}</div>
      </div>
      {scenes.map((s, i) => (
        <Sequence key={i} from={tl[i].from} durationInFrames={tl[i].dur}>
          <Enter dur={tl[i].dur}>
            <VersusText s={s} a={a} b={b} f={f - tl[i].from} fps={fps} round={scenes.slice(0, i + 1).filter((x) => x.type === 'round').length} />
          </Enter>
        </Sequence>
      ))}
      <div style={{position: 'absolute', left: 0, top: 0, height: 6, width: `${(f / durationInFrames) * 100}%`, background: `linear-gradient(90deg, ${VA}, ${VB})`}} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

const VersusText: React.FC<{s: ReelScene; a: any; b: any; f: number; fps: number; round: number}> = ({s, a, b, f, fps, round}) => {
  const box: React.CSSProperties = {position: 'absolute', left: 90, right: 90, top: 340, display: 'flex', flexDirection: 'column', gap: 34};
  const big = (t: string, hl?: string, max = 100) => {
    const size = fit(t, 900, max, 60, 3, 0.5);
    return <div style={{fontFamily: TIGHT, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color: '#fff', textAlign: 'center'}}><Hi text={t} highlight={hl} color={VB} /></div>;
  };
  switch (s.type) {
    case 'hook':
      return <div style={{...box, top: 500}}>{s.kicker && <Spaced color={VB} size={28} spacing={8} style={{textAlign: 'center'}}>{s.kicker}</Spaced>}{big(s.text, s.highlight, 116)}</div>;
    case 'duel': {
      const sp = spring({frame: f - 6, fps, config: {damping: 10}});
      return (
        <div style={{...box, top: 620, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          {[{x: a, c: VA, d: -1}, {x: b, c: VB, d: 1}].map(({x, c, d}) => (
            <div key={d} style={{width: 380, textAlign: 'center', transform: `translateX(${(1 - sp) * d * 500}px)`}}>
              <div style={{fontFamily: TIGHT, fontWeight: 900, fontSize: fit(x.name, 380, 92, 50, 2, 0.55), color: c, lineHeight: 1}}>{x.name}</div>
              {x.tagline && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 30, color: '#C8D2E6', marginTop: 16, lineHeight: 1.3}}>{x.tagline}</div>}
            </div>
          ))}
          <div style={{position: 'absolute', left: 390, width: 120, height: 120, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TIGHT, fontWeight: 900, fontSize: 46, color: FEED.ink, transform: `scale(${sp}) rotate(${(1 - sp) * 180}deg)`}}>VS</div>
        </div>
      );
    }
    case 'round': {
      const pa = interpolate(f, [16, 46], [0, Number(s.a_score ?? 0) / 10], clamp);
      const pb = interpolate(f, [16, 46], [0, Number(s.b_score ?? 0) / 10], clamp);
      return (
        <div style={box}>
          <Spaced color="#fff" size={28} spacing={8} style={{textAlign: 'center', opacity: 0.7}}>RONDA {round}</Spaced>
          {big(s.criterion, undefined, 92)}
          <div style={{display: 'flex', gap: 40, marginTop: 30}}>
            {[{t: s.a, c: VA, p: pa, al: 'left'}, {t: s.b, c: VB, p: pb, al: 'right'}].map((x) => (
              <div key={x.al} style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 24, alignItems: x.al === 'left' ? 'flex-start' : 'flex-end'}}>
                <div style={{width: '100%', height: 360, display: 'flex', alignItems: 'flex-end', justifyContent: x.al === 'left' ? 'flex-start' : 'flex-end'}}>
                  <div style={{width: 160, height: `${x.p * 100}%`, borderRadius: '20px 20px 6px 6px', background: `linear-gradient(180deg, ${x.c}, ${x.c}66)`, boxShadow: `0 0 40px ${x.c}55`}} />
                </div>
                <div style={{fontFamily: INTER, fontWeight: 600, fontSize: fit(String(x.t), 400, 44, 32, 5, 0.53), color: '#fff', lineHeight: 1.3, textAlign: x.al as 'left' | 'right'}}>{x.t}</div>
              </div>
            ))}
          </div>
          {s.verdict && f > 50 && <div style={{marginTop: 10, textAlign: 'center', fontFamily: INTER, fontWeight: 700, fontSize: 42, color: '#fff', opacity: interpolate(f, [50, 60], [0, 1], clamp)}}>→ {s.verdict}</div>}
        </div>
      );
    }
    case 'choose':
      return (
        <div style={box}>
          {big(s.title ?? '¿Cuál elegir?', undefined, 92)}
          {[{x: a, c: VA, list: s.a_if}, {x: b, c: VB, list: s.b_if}].map(({x, c, list}, k) => (
            <div key={k} style={{padding: '30px 34px', borderRadius: 24, background: `${c}18`, borderLeft: `10px solid ${c}`, opacity: stagger(f, fps, 8 + k * 14)}}>
              <div style={{fontFamily: POP, fontWeight: 700, fontSize: 26, letterSpacing: 5, color: c}}>{`ELIGE ${String(x.name).toUpperCase()} SI…`}</div>
              {(list ?? []).slice(0, 3).map((t: string, i: number) => <div key={i} style={{marginTop: 14, fontFamily: INTER, fontWeight: 500, fontSize: 36, color: '#fff', lineHeight: 1.3}}>· {t}</div>)}
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div style={{...box, top: 560}}>
          {big(s.title ?? s.text ?? '', s.highlight, 104)}
          {s.text && s.title && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 40, color: '#C8D2E6', textAlign: 'center', lineHeight: 1.35}}>{s.text}</div>}
        </div>
      );
  }
};

// ───────────────────────── Sonido ─────────────────────────

const reelCues = (model: string, scenes: ReelScene[], tl: {from: number; dur: number}[]): Cue[] => {
  const whoosh = ['whoosh1', 'whoosh2', 'whoosh3'];
  const cues: Cue[] = [{at: 0, sfx: model === 'RL01' ? 'reverse' : 'swipe', vol: 0.5}, {at: 10, sfx: model === 'RL02' ? 'notif' : 'boom', vol: 0.55}];
  scenes.forEach((s, i) => {
    const at = tl[i].from;
    if (i > 0) cues.push({at: at - 4, sfx: model === 'RL02' ? 'swipe' : whoosh[i % 3], vol: 0.4});
    if (s.type === 'stat') cues.push({at: at + 6, sfx: 'data', vol: 0.3}, {at: at + 46, sfx: 'ding', vol: 0.45});
    if (s.type === 'points') (s.items ?? []).slice(0, 4).forEach((_: string, k: number) => cues.push({at: at + (model === 'RL02' ? 8 : 10) + k * 9, sfx: 'pop', vol: 0.4}));
    if (s.type === 'chapter' && model === 'RL01') cues.push({at: at + 2, sfx: 'shimmer', vol: 0.25});
    if (s.type === 'date') cues.push({at: at + 4, sfx: 'tick', vol: 0.4});
    if (s.type === 'duel') cues.push({at: at + 6, sfx: 'impact', vol: 0.7}, {at: at + 10, sfx: 'glitch', vol: 0.3});
    if (s.type === 'round') cues.push({at: at + 16, sfx: 'riser', vol: 0.3}, {at: at + 48, sfx: 'thud', vol: 0.5});
    if (s.type === 'end') cues.push({at: Math.max(0, at - 30), sfx: 'riser', vol: 0.4}, {at: at + 14, sfx: 'chime', vol: 0.4});
  });
  return cues;
};

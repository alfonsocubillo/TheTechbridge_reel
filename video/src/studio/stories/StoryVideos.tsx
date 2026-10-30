import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cue, Grain, INTER, MONO, Music, SfxTrack, UNB, clamp, fit} from '../kit';
import {Keycap} from './StoryStills';

/**
 * Vídeos de historias nuevos (el modelo "Actual" sigue siendo Story.tsx):
 *   HVPULSO    · Pulso: tipografía cinética a golpe de ritmo, barridos de color y un elemento central
 *                (teclas que se pulsan, cifra que cuenta o palabra gigante). 11-14 s.
 *   HVTERMINAL · Terminal: comandos que se teclean y su salida, para programación, ciberseguridad y automatización.
 *   HVQUIZ     · Quiz: pregunta, tres opciones, cuenta atrás y respuesta. Pensado para que la gente participe.
 */
export type StoryVideoProps = {model: string; data: Record<string, any>; music?: string; musicStart?: number; bpm?: number; palette?: number};

const FPS = 30;

export const storyVideoDuration = (model: string, d: Record<string, any>): number => {
  if (model === 'HVTERMINAL') {
    const chars = (d.lines ?? []).reduce((a: number, l: any) => a + String(l.cmd).length / 1.6 + 14 + (l.out?.length ?? 0) * 6, 0);
    return Math.round(20 + chars + 30 + 150);
  }
  if (model === 'HVQUIZ') return 450;
  return 400;
};

export const StoryVideo: React.FC<StoryVideoProps> = (p) => {
  const {durationInFrames} = useVideoConfig();
  const Comp = {HVPULSO: Pulso, HVTERMINAL: Terminal, HVQUIZ: Quiz}[p.model] ?? Pulso;
  const {cues, ducks, silence} = cuesFor(p.model, p.data, durationInFrames);
  return (
    <AbsoluteFill>
      <Comp {...p} />
      <SfxTrack cues={cues} total={durationInFrames} />
      <Music src={p.music} total={durationInFrames} volume={0.42} startFrom={Math.round((p.musicStart ?? 0) * FPS)} ducks={ducks} silence={silence} />
    </AbsoluteFill>
  );
};

// ───────────────────────── Pulso ─────────────────────────

const PALETTES = [
  ['#FF3D71', '#FF9F1C', '#1A0710'],
  ['#7C3AED', '#06B6D4', '#0C0620'],
  ['#00C2A8', '#B9F542', '#04140F'],
  ['#2563EB', '#F472B6', '#060B22'],
];

const P = {hookEnd: 80, visEnd: 230, payEnd: 330};

const Pulso: React.FC<StoryVideoProps> = ({data, bpm = 120, palette = 0}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const [a, b, dark] = PALETTES[palette % PALETTES.length];
  const beat = (60 / bpm) * fps;
  const pulse = Math.exp(-((f % beat) / beat) * 5);
  const words = String(data.hook ?? '').split(' ');
  const v = data.visual ?? {type: 'word', word: '?'};

  // Barrido diagonal entre partes
  const wipe = (at: number) => interpolate(f, [at - 8, at, at + 8], [-1.2, 0, 1.2], clamp);
  const wipes = [P.hookEnd, P.visEnd];

  const hookSize = fit(String(data.hook).toUpperCase(), 900, 130, 66, 5, 1.0);
  return (
    <AbsoluteFill style={{background: dark, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% ${45 + Math.sin(f / 40) * 8}%, ${a}${f < P.hookEnd ? '66' : '44'} 0%, transparent ${48 + pulse * 10}%)`}} />
      {/* Anillos que laten con la música */}
      <svg style={{position: 'absolute', left: 0, top: 0}} width={1080} height={1920}>
        {[0, 1, 2].map((k) => (
          <circle key={k} cx={540} cy={960} r={260 + k * 170 + pulse * 30} fill="none" stroke={k % 2 ? b : a} strokeOpacity={0.18 + pulse * 0.15} strokeWidth={3} strokeDasharray={k === 1 ? '14 18' : undefined}
            transform={`rotate(${f * (k % 2 ? -0.6 : 0.4)} 540 960)`} />
        ))}
      </svg>

      {/* 1 · Gancho palabra a palabra */}
      {f < P.hookEnd + 6 && (
        <div style={{position: 'absolute', left: 90, right: 90, top: 560, fontFamily: UNB, fontWeight: 900, fontSize: hookSize, lineHeight: 1.04, color: '#fff', textTransform: 'uppercase'}}>
          {words.map((w, i) => {
            const at = 6 + i * 8;
            const s = spring({frame: f - at, fps, config: {damping: 12, mass: 0.5}});
            return (
              <span key={i} style={{display: 'inline-block', marginRight: hookSize * 0.25, color: i % 3 === 2 ? b : '#fff', opacity: f >= at ? 1 : 0, transform: `scale(${0.4 + 0.6 * s}) rotate(${(1 - s) * (i % 2 ? 8 : -8)}deg)`}}>{w}</span>
            );
          })}
        </div>
      )}

      {/* 2 · Elemento central */}
      {f >= P.hookEnd && f < P.visEnd + 6 && <Visual v={v} from={P.hookEnd} a={a} b={b} />}

      {/* 3 · Remate */}
      {f >= P.visEnd && (
        <div style={{position: 'absolute', left: 90, right: 90, top: 640, display: 'flex', flexDirection: 'column', gap: 60}}>
          <div style={{fontFamily: UNB, fontWeight: 700, fontSize: fit(String(data.payoff), 900, 76, 48, 6, 0.82), lineHeight: 1.18, color: '#fff', opacity: interpolate(f, [P.visEnd + 4, P.visEnd + 14], [0, 1], clamp), transform: `translateY(${interpolate(f, [P.visEnd, P.visEnd + 16], [60, 0], clamp)}px)`}}>
            {data.payoff}
          </div>
          {data.cta && (
            <div style={{alignSelf: 'flex-start', padding: '26px 40px', borderRadius: 26, background: `linear-gradient(100deg, ${a}, ${b})`, fontFamily: UNB, fontWeight: 900, fontSize: 44, color: dark,
              transform: `rotate(-4deg) scale(${spring({frame: f - P.payEnd, fps, config: {damping: 9}})})`}}>
              {data.cta}
            </div>
          )}
        </div>
      )}

      {wipes.map((at) => {
        const w = wipe(at);
        return Math.abs(w) < 1.2 ? (
          <div key={at} style={{position: 'absolute', left: -600, top: -400, width: 2400, height: 2800, background: `repeating-linear-gradient(115deg, ${a} 0 120px, ${b} 120px 240px)`, transform: `translateX(${w * 2200}px) rotate(0deg)`}} />
        ) : null;
      })}

      <div style={{position: 'absolute', left: 0, right: 0, top: 1580, textAlign: 'center', fontFamily: UNB, fontWeight: 500, fontSize: 26, color: '#ffffff88', letterSpacing: 3}}>@thetechbridgesolution</div>
      {/* Progreso propio arriba (las historias tienen el suyo, este marca las partes) */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 250, display: 'flex', gap: 12}}>
        {[[0, P.hookEnd], [P.hookEnd, P.visEnd], [P.visEnd, durationInFrames]].map(([s, e], i) => (
          <div key={i} style={{flex: 1, height: 8, borderRadius: 4, background: '#ffffff25', overflow: 'hidden'}}>
            <div style={{width: `${interpolate(f, [s, e], [0, 100], clamp)}%`, height: '100%', background: i === 1 ? b : a}} />
          </div>
        ))}
      </div>
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{v: Record<string, any>; from: number; a: string; b: string}> = ({v, from, a, b}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = f - from;
  const label = v.label ? (
    <div style={{position: 'absolute', left: 90, right: 90, top: 1150, textAlign: 'center', fontFamily: INTER, fontWeight: 700, fontSize: fit(String(v.label), 900, 50, 36, 3, 0.52), lineHeight: 1.3, color: '#fff', opacity: interpolate(local, [30, 42], [0, 1], clamp)}}>{v.label}</div>
  ) : null;
  if (v.type === 'keys') {
    const keys: string[] = v.keys ?? [];
    const total = keys.reduce((s, k) => s + Math.max(170, k.length * 52 + 90), 0) + (keys.length - 1) * 200;
    const scale = Math.min(1, 940 / total);
    return (
      <>
        <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 70 * scale, transform: `scale(${scale})`}}>
          {keys.map((k, i) => {
            const at = 12 + i * 14;
            const s = spring({frame: local - (at - 10), fps, config: {damping: 14}});
            const press = interpolate(local, [at, at + 3, 100, 104], [0, 1, 1, 0], clamp);
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{fontFamily: UNB, fontWeight: 900, fontSize: 70, color: b, opacity: s}}>+</div>}
                <div style={{transform: `translateY(${(1 - s) * -300}px)`, opacity: s}}><Keycap label={k} press={press} accent={b} /></div>
              </React.Fragment>
            );
          })}
        </div>
        {label}
      </>
    );
  }
  if (v.type === 'number') {
    const raw = String(v.value);
    const m = raw.match(/^([^\d]*)([\d.,]+)(.*)$/);
    const target = m ? parseFloat(m[2].replace(',', '.')) : 0;
    const p = interpolate(local, [6, 50], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
    const shown = m ? `${m[1]}${(target * p).toFixed(m[2].includes(',') || m[2].includes('.') ? 1 : 0).replace('.', ',')}${m[3]}` : raw;
    return (
      <>
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: UNB, fontWeight: 900, fontSize: fit(raw, 980, 300, 140, 1, 0.85), color: '#fff', textShadow: `0 0 60px ${a}`}}>{shown}</div>
        {label}
      </>
    );
  }
  const s = spring({frame: local - 4, fps, config: {damping: 10}});
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', fontFamily: UNB, fontWeight: 900, fontSize: fit(String(v.word), 980, 260, 110, 2, 0.85), color: b, transform: `scale(${s})`, lineHeight: 1}}>{v.word}</div>
      {label}
    </>
  );
};

// ───────────────────────── Terminal ─────────────────────────

const GREEN = '#4ADE80';

type TL = {cmd: string; out?: string[]};

const terminalTimeline = (lines: TL[]) => {
  let t = 20;
  return lines.map((l) => {
    const start = t;
    const typed = start + String(l.cmd).length / 1.6;
    const outAt = typed + 8;
    t = outAt + (l.out?.length ?? 0) * 6 + 6;
    return {start, typed, outAt, end: t};
  });
};

const Terminal: React.FC<StoryVideoProps> = ({data}) => {
  const f = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const lines: TL[] = data.lines ?? [];
  const tl = terminalTimeline(lines);
  const explainAt = (tl.length ? tl[tl.length - 1].end : 40) + 24;
  const up = spring({frame: f - explainAt, fps, config: {damping: 16}});
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{background: '#05080A', overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, #ffffff06 0 2px, transparent 2px 6px)'}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${GREEN}1f, transparent 60%)`}} />
      <div style={{position: 'absolute', left: 80, top: 270, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: GREEN, letterSpacing: 3}}>{'>'} {data.tag ?? 'TERMINAL'}</div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 330, fontFamily: INTER, fontWeight: 800, fontSize: fit(String(data.title), 920, 74, 50, 3, 0.55), lineHeight: 1.1, color: '#fff'}}>{data.title}</div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 640, borderRadius: 26, background: '#0C1214', border: '2px solid #1F2A2E', boxShadow: `0 0 80px ${GREEN}22`, overflow: 'hidden', transform: `translateY(${-up * 30}px) scale(${1 - up * 0.05})`}}>
        <div style={{display: 'flex', gap: 12, padding: '22px 26px', background: '#141C1F'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 20, height: 20, borderRadius: '50%', background: c}} />)}
          <div style={{marginLeft: 20, fontFamily: MONO, fontSize: 24, color: '#6B7C80'}}>{data.shell ?? 'PowerShell'}</div>
        </div>
        <div style={{padding: '30px 34px 40px', fontFamily: MONO, fontWeight: 500, fontSize: 34, lineHeight: 1.5, color: '#D7E2E4', minHeight: 360}}>
          {lines.map((l, i) => {
            const t = tl[i];
            if (f < t.start) return null;
            const n = Math.floor((f - t.start) * 1.6);
            const cmd = String(l.cmd).slice(0, n);
            return (
              <div key={i} style={{marginBottom: 14}}>
                <span style={{color: GREEN}}>❯ </span>
                <span style={{color: '#fff', fontWeight: 700}}>{cmd}</span>
                {f < t.typed + 6 && blink && <span style={{background: GREEN, color: GREEN}}>_</span>}
                {(l.out ?? []).map((o, k) => (f >= t.outAt + k * 6 ? <div key={k} style={{color: '#8FA3A8', fontSize: 30}}>{o}</div> : null))}
              </div>
            );
          })}
        </div>
      </div>
      {f >= explainAt && (
        <div style={{position: 'absolute', left: 80, right: 80, top: 1260 - up * 60, opacity: up, padding: '36px 40px', borderRadius: 26, background: GREEN, color: '#04210F'}}>
          <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 26, letterSpacing: 3}}>QUÉ HACE</div>
          <div style={{marginTop: 12, fontFamily: INTER, fontWeight: 700, fontSize: fit(String(data.explain), 840, 44, 32, 5, 0.53), lineHeight: 1.32}}>{data.explain}</div>
        </div>
      )}
      {data.cta && f > durationInFrames - 70 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1560, textAlign: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 32, color: GREEN, opacity: interpolate(f, [durationInFrames - 70, durationInFrames - 60], [0, 1], clamp)}}>{data.cta}</div>
      )}
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

// ───────────────────────── Quiz ─────────────────────────

const Q = {opts: 70, count: 150, reveal: 240, explain: 275};

const Quiz: React.FC<StoryVideoProps> = ({data}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opts: string[] = data.options ?? [];
  const ans = Number(data.answer ?? 0);
  const revealed = f >= Q.reveal;
  const count = 3 - Math.floor((f - Q.count) / 30);
  const BG = '#FFE14D';
  const INK = '#151208';
  return (
    <AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: `radial-gradient(${INK}14 3px, transparent 3px)`, backgroundSize: '44px 44px'}} />
      <div style={{position: 'absolute', left: 80, top: 270, padding: '12px 26px', borderRadius: 999, background: INK, color: BG, fontFamily: UNB, fontWeight: 900, fontSize: 32}}>QUIZ TECH</div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 370, fontFamily: UNB, fontWeight: 900, fontSize: fit(String(data.question), 920, 76, 50, 5, 0.78), lineHeight: 1.12, color: INK,
        transform: `scale(${spring({frame: f - 4, fps, config: {damping: 12}})})`, transformOrigin: 'left top'}}>{data.question}</div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 860, display: 'flex', flexDirection: 'column', gap: 30}}>
        {opts.slice(0, 3).map((o, i) => {
          const s = spring({frame: f - (Q.opts + i * 10), fps, config: {damping: 13}});
          const right = i === ans;
          const bg = revealed ? (right ? '#16A34A' : '#ffffff') : '#ffffff';
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26, padding: '30px 34px', borderRadius: 28, background: bg, border: `5px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`,
              transform: `translateX(${(1 - s) * 1100}px) scale(${revealed && right ? 1 + 0.04 * Math.sin((f - Q.reveal) / 4) * Math.exp(-(f - Q.reveal) / 30) : 1})`, opacity: revealed && !right ? 0.4 : 1}}>
              <div style={{width: 64, height: 64, borderRadius: 18, background: INK, color: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UNB, fontWeight: 900, fontSize: 34, flexShrink: 0}}>{'ABC'[i]}</div>
              <div style={{fontFamily: INTER, fontWeight: 800, fontSize: fit(o, 700, 44, 32, 2, 0.55), color: revealed && right ? '#fff' : INK, lineHeight: 1.2}}>{o}</div>
            </div>
          );
        })}
      </div>
      {f >= Q.count && f < Q.reveal && (
        <div style={{position: 'absolute', right: 80, top: 1440, width: 150, height: 150, borderRadius: '50%', background: INK, color: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UNB, fontWeight: 900, fontSize: 90,
          transform: `scale(${1.3 - ((f - Q.count) % 30) / 100})`}}>{count}</div>
      )}
      {f >= Q.explain && (
        <div style={{position: 'absolute', left: 80, right: 80, top: 1400, fontFamily: INTER, fontWeight: 700, fontSize: fit(String(data.explain), 920, 40, 30, 4, 0.53), lineHeight: 1.3, color: INK, opacity: interpolate(f, [Q.explain, Q.explain + 12], [0, 1], clamp)}}>
          {data.explain}
        </div>
      )}
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

// ───────────────────────── Sonido de cada modelo ─────────────────────────

const cuesFor = (model: string, d: Record<string, any>, total: number): {cues: Cue[]; ducks: number[]; silence: [number, number][]} => {
  if (model === 'HVTERMINAL') {
    const tl = terminalTimeline(d.lines ?? []);
    const cues: Cue[] = [{at: 0, sfx: 'scan', vol: 0.35}];
    tl.forEach((t, i) => {
      for (let k = t.start; k < t.typed; k += 3) cues.push({at: k, sfx: 'keyclack', vol: 0.35});
      cues.push({at: t.typed + 2, sfx: 'click', vol: 0.4});
      (d.lines[i].out ?? []).forEach((_: string, k: number) => cues.push({at: t.outAt + k * 6, sfx: 'data', vol: 0.18}));
    });
    const explainAt = (tl.length ? tl[tl.length - 1].end : 40) + 24;
    cues.push({at: explainAt, sfx: 'success', vol: 0.45});
    return {cues, ducks: [explainAt], silence: []};
  }
  if (model === 'HVQUIZ') {
    const cues: Cue[] = [{at: 2, sfx: 'notif', vol: 0.5}];
    [0, 1, 2].forEach((i) => cues.push({at: Q.opts + i * 10, sfx: 'pop', vol: 0.45}));
    [0, 1, 2].forEach((i) => cues.push({at: Q.count + i * 30, sfx: 'countdown', vol: 0.55}));
    cues.push({at: Q.reveal, sfx: 'success', vol: 0.6}, {at: Q.reveal, sfx: 'impact', vol: 0.4});
    // Silencio dramático durante la cuenta atrás
    return {cues, ducks: [Q.reveal], silence: [[Q.count, Q.reveal]]};
  }
  const words = String(d.hook ?? '').split(' ');
  const cues: Cue[] = words.map((_, i) => ({at: 6 + i * 8, sfx: i === 0 ? 'thud' : 'click', vol: i === 0 ? 0.7 : 0.45}));
  cues.push({at: P.hookEnd - 8, sfx: 'swoosh_up', vol: 0.5}, {at: P.visEnd - 8, sfx: 'swoosh_up', vol: 0.5});
  const v = d.visual ?? {};
  if (v.type === 'keys') (v.keys ?? []).forEach((_: string, i: number) => cues.push({at: P.hookEnd + 12 + i * 14, sfx: 'keyclack', vol: 0.8}));
  if (v.type === 'number') cues.push({at: P.hookEnd + 6, sfx: 'data', vol: 0.35}, {at: P.hookEnd + 50, sfx: 'ding', vol: 0.5});
  if (v.type === 'word') cues.push({at: P.hookEnd + 4, sfx: 'boom', vol: 0.6});
  cues.push({at: P.visEnd + 4, sfx: 'impact', vol: 0.55}, {at: P.payEnd, sfx: 'pop', vol: 0.6});
  return {cues: cues.filter((c) => c.at < total), ducks: [P.hookEnd, P.visEnd], silence: []};
};

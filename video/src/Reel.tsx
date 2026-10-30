import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {ReelProps, Scene, SceneProps, SceneType, SfxKit} from './types';
import {clamp} from './anim';
import {Captions, FilmFinish, FlashCut, ProgressBar} from './components/Layers';
import {BrollScene, Compare, Hook, LIST_ITEM_GAP, LIST_ITEM_START, List, Outro, Prompt, Quote, Stat, TextScrim, promptTiming} from './scenes/Scenes';
import {World} from './three/World';
import {FormatHeader} from './three/Badge';

const SCENES: Record<SceneType, React.FC<SceneProps & {tagline?: string}>> = {
  hook: Hook,
  stat: Stat,
  broll: BrollScene,
  list: List,
  compare: Compare,
  quote: Quote,
  prompt: Prompt,
  outro: Outro,
};

// Escenas donde los subtítulos de la voz no estorban a la composición
const CAPTION_SCENES: SceneType[] = ['hook', 'stat', 'broll', 'quote'];

/** Entrada y salida de cada escena: zoom corto con un poco de desenfoque. */
const Shell: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [0, 9], [0, 1], clamp);
  const outP = interpolate(f, [dur - 7, dur], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1.06 - 0.06 * inP - 0.05 * outP})`,
        filter: `blur(${(1 - inP) * 8 + outP * 8}px)`,
        opacity: Math.min(inP * 1.5, 1 - outP),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

type Sfx = {at: number; key: keyof SfxKit; volume: number};

/** Diseño de sonido: cada efecto va pegado a algo que pasa en pantalla. */
export const sfxTimeline = (scenes: Scene[]): Sfx[] => {
  const ev: Sfx[] = [
    {at: 0, key: 'whoosh2', volume: 0.55},
    {at: 12, key: 'impact', volume: 0.8},
    {at: 24, key: 'swipe', volume: 0.35},
  ];
  const whooshes: (keyof SfxKit)[] = ['whoosh1', 'whoosh2', 'whoosh3'];
  scenes.forEach((s, i) => {
    if (i > 0 && s.type !== 'outro') ev.push({at: s.from - 4, key: whooshes[i % 3], volume: 0.42});
    switch (s.type) {
      case 'stat':
        for (let k = 6; k < 46; k += 4) ev.push({at: s.from + k, key: 'tick', volume: 0.16});
        ev.push({at: s.from + 46, key: 'ding', volume: 0.5});
        break;
      case 'list':
        (s.items ?? []).slice(0, 4).forEach((_, k) => ev.push({at: s.from + LIST_ITEM_START + k * LIST_ITEM_GAP + 2, key: 'pop', volume: 0.5}));
        break;
      case 'compare':
        ev.push({at: s.from + 2, key: 'swipe', volume: 0.35}, {at: s.from + 18, key: 'swipe', volume: 0.4}, {at: s.from + 27, key: 'pop', volume: 0.45});
        break;
      case 'prompt': {
        const {typeStart, typeEnd, resultsStart} = promptTiming(s.prompt ?? '');
        for (let k = typeStart; k < typeEnd; k += 3) ev.push({at: s.from + k, key: 'type', volume: 0.22});
        ev.push({at: s.from + Math.round(typeEnd) + 2, key: 'swipe', volume: 0.3}, {at: s.from + Math.round(resultsStart), key: 'ding', volume: 0.45});
        break;
      }
      case 'quote':
        ev.push({at: s.from + 2, key: 'shimmer', volume: 0.3});
        break;
      case 'broll':
        if (s.video) ev.push({at: s.from + 1, key: 'swipe', volume: 0.3});
        break;
      case 'outro':
        ev.push({at: Math.max(0, s.from - 30), key: 'riser', volume: 0.45}, {at: s.from, key: 'impact', volume: 0.55}, {at: s.from + 18, key: 'shimmer', volume: 0.45});
        break;
      default:
        break;
    }
  });
  const end = scenes.length ? scenes[scenes.length - 1].from + scenes[scenes.length - 1].durationInFrames : 0;
  return ev.filter((e) => e.at >= 0 && e.at < end - 1);
};

export const Reel: React.FC<ReelProps> = (props) => {
  const {brand, scenes, captions, sfx, durationInFrames} = props;
  const total = Math.max(durationInFrames, 1);
  const outro = scenes.find((s) => s.type === 'outro');
  const impacts = sfx ? sfxTimeline(scenes).filter((e) => e.key === 'impact').map((e) => e.at) : [];

  const captionWords = captions.filter((w) =>
    scenes.some((s) => CAPTION_SCENES.includes(s.type) && w.start >= s.from && w.start < s.from + s.durationInFrames),
  );

  // La música baja un poco en cada golpe para que se note (ducking)
  const musicVolume = (f: number) => {
    const base = interpolate(f, [0, 12, total - 30, total], [0, props.musicVolume, props.musicVolume, 0], clamp);
    const duck = impacts.reduce((m, at) => Math.min(m, interpolate(f - at, [0, 2, 14], [1, 0.55, 1], clamp)), 1);
    return base * duck;
  };

  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 30%, ${brand.accentA}26 0%, ${brand.bg} 60%)`}}>
      <World brand={brand} hero={props.hero} scenes={scenes} />
      <TextScrim brand={brand} />

      {scenes.map((s, i) => {
        const Comp = SCENES[s.type] ?? BrollScene;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name={`${i}-${s.type}`}>
            <Shell dur={s.durationInFrames}>
              <Comp scene={s} brand={brand} dur={s.durationInFrames} formatLabel={props.formatLabel} tagline={props.tagline} />
            </Shell>
            {s.voiceSrc && <Audio src={staticFile(s.voiceSrc)} volume={1} />}
          </Sequence>
        );
      })}

      {scenes.slice(1).map((s, i) => (
        <Sequence key={`cut-${i}`} from={Math.max(s.from - 3, 0)} durationInFrames={10}>
          <FlashCut brand={brand} />
        </Sequence>
      ))}

      <Captions words={captionWords} brand={brand} />
      <FormatHeader brand={brand} format={props.formatKey} label={props.formatLabel} hideFrom={outro ? outro.from : total} />
      <ProgressBar brand={brand} />
      <FilmFinish />

      {sfx &&
        sfxTimeline(scenes).map((e, i) => (
          <Sequence key={`sfx-${i}`} from={e.at} durationInFrames={Math.min(90, total - e.at)}>
            <Audio src={staticFile(sfx[e.key])} volume={e.volume} />
          </Sequence>
        ))}

      {props.music && <Audio src={staticFile(props.music)} volume={musicVolume} />}
    </AbsoluteFill>
  );
};

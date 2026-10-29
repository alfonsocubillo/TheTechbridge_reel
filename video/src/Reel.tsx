import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {ReelProps, SceneProps, SceneType} from './types';
import {clamp} from './anim';
import {Background, Captions, FilmFinish, FlashCut, ProgressBar, Watermark} from './components/Layers';
import {BrollScene, Compare, Hook, List, Outro, Prompt, Quote, Stat} from './scenes/Scenes';

const SCENES: Record<SceneType, React.FC<SceneProps>> = {
  hook: Hook,
  stat: Stat,
  broll: BrollScene,
  list: List,
  compare: Compare,
  quote: Quote,
  prompt: Prompt,
  outro: Outro,
};

// Escenas donde los subtítulos no estorban a la composición
const CAPTION_SCENES: SceneType[] = ['hook', 'stat', 'broll', 'quote'];

/** Entrada "zoom-through" y salida suave de cada escena. */
const Shell: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [0, 10], [0, 1], clamp);
  const outP = interpolate(f, [dur - 8, dur], [0, 1], clamp);
  const scale = 1.08 - 0.08 * inP - 0.06 * outP;
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        filter: `blur(${(1 - inP) * 14 + outP * 12}px)`,
        opacity: Math.min(inP * 1.4, 1 - outP),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = (props) => {
  const {brand, scenes, captions, sfx, durationInFrames} = props;
  const total = Math.max(durationInFrames, 1);
  const outro = scenes.find((s) => s.type === 'outro');

  const captionWords = captions.filter((w) =>
    scenes.some((s) => CAPTION_SCENES.includes(s.type) && w.start >= s.from && w.start < s.from + s.durationInFrames),
  );

  return (
    <AbsoluteFill style={{backgroundColor: brand.bg}}>
      <Background brand={brand} />

      {scenes.map((s, i) => {
        const Comp = SCENES[s.type] ?? BrollScene;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} name={`${i}-${s.type}`}>
            <Shell dur={s.durationInFrames}>
              <Comp scene={s} brand={brand} dur={s.durationInFrames} formatLabel={props.formatLabel} />
            </Shell>
            {s.voiceSrc && <Audio src={staticFile(s.voiceSrc)} volume={1} />}
          </Sequence>
        );
      })}

      {scenes.slice(1).map((s, i) => (
        <Sequence key={`cut-${i}`} from={Math.max(s.from - 3, 0)} durationInFrames={10}>
          <FlashCut brand={brand} />
          {sfx && <Audio src={staticFile(sfx.whoosh)} volume={0.35} />}
        </Sequence>
      ))}
      {sfx && (
        <Sequence from={4} durationInFrames={40}>
          <Audio src={staticFile(sfx.hit)} volume={0.6} />
        </Sequence>
      )}

      <Captions words={captionWords} brand={brand} />
      <Watermark brand={brand} hideFrom={outro ? outro.from : total} />
      <ProgressBar brand={brand} />
      <FilmFinish />

      {props.music && (
        <Audio
          src={staticFile(props.music)}
          volume={(f) => interpolate(f, [0, 12, total - 30, total], [0, props.musicVolume, props.musicVolume, 0], clamp)}
        />
      )}
    </AbsoluteFill>
  );
};

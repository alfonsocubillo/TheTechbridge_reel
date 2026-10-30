import React from 'react';
import {Composition, Still} from 'remotion';
import {Carousel, carouselSample} from './feed/Carousel';
import {FeedCoverReel, feedCoverSample} from './feed/FeedCover';
import {StoryStill, type StoryStillProps} from './stories/StoryStills';
import {StoryVideo, storyVideoDuration, type StoryVideoProps} from './stories/StoryVideos';
import {StudioReel, reelDuration, type StudioReelProps} from './reels/Reels';

const storyStillSample: StoryStillProps = {model: 'HF03', data: {keys: ['Win', 'V'], title: 'Tu portapapeles tiene memoria', what: 'Abre el historial: todo lo que has copiado hoy, listo para pegar.', os: ['Windows 10', 'Windows 11'], app: 'Windows'}};
const storyVideoSample: StoryVideoProps = {model: 'HVPULSO', data: {hook: '¿Capturas de pantalla aún con Recortes?', visual: {type: 'keys', keys: ['Win', 'Shift', 'S'], label: 'Recorta cualquier zona de la pantalla'}, payoff: 'Se copia sola: pégala en el correo o en Teams con Ctrl + V.', cta: 'Pruébalo ya'}};
const reelSample: StudioReelProps = {model: 'RL01', family: 'tutorial', hero: 'correo', scenes: [
  {type: 'hook', kicker: 'PRODUCTIVIDAD', text: '3 reglas para que Outlook trabaje por ti', highlight: 'trabaje por ti'},
  {type: 'chapter', label: 'REGLAS', title: 'Mueve los boletines a una carpeta', body: 'Inicio → Reglas → Crear regla.'},
  {type: 'end', title: 'Guárdalo para el lunes', highlight: 'el lunes', text: 'Tu bandeja te lo agradecerá.'},
]};

/** Composiciones del estudio local (python -m studio). La duración de cada vídeo la marca su guion. */
export const StudioCompositions: React.FC = () => (
  <>
    <Still id="StudioCarousel" component={Carousel} width={1080} height={1350} defaultProps={carouselSample} />
    <Still id="StudioCoverReel" component={FeedCoverReel} width={1080} height={1920} defaultProps={feedCoverSample} />
    <Still id="StudioStoryStill" component={StoryStill} width={1080} height={1920} defaultProps={storyStillSample} />
    <Composition id="StudioStoryVideo" component={StoryVideo} width={1080} height={1920} fps={30} durationInFrames={400} defaultProps={storyVideoSample}
      calculateMetadata={({props}) => ({durationInFrames: storyVideoDuration(props.model, props.data)})} />
    <Composition id="StudioReel" component={StudioReel} width={1080} height={1920} fps={30} durationInFrames={600} defaultProps={reelSample}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(90, reelDuration(props.scenes))})} />
  </>
);

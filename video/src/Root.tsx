import React from 'react';
import {Composition} from 'remotion';
import {Cover, coverSample} from './Cover';
import {Lab} from './Lab';
import {Story, storySample} from './Story';
import {Reel} from './Reel';
import type {ReelProps} from './types';

// Props de ejemplo para previsualizar en Remotion Studio (npm run studio)
const sample: ReelProps = {
  brand: {
    name: 'The TechBridge Solution',
    handle: '@thetechbridgesolution',
    bg: '#070B18',
    text: '#F5F7FF',
    muted: '#9AA4C7',
    accentA: '#3B82F6',
    accentB: '#22D3EE',
    logo: null,
  },
  formatKey: 'prompt',
  formatLabel: 'PROMPT DEL DÍA',
  hero: 'correo',
  tagline: 'Formación en Microsoft 365 e IA para equipos',
  audioMode: 'music',
  music: '',
  musicVolume: 0.5,
  sfx: null,
  captions: [],
  durationInFrames: 750,
  scenes: [
    {type: 'hook', from: 0, durationInFrames: 90, text: 'Tu bandeja de entrada te roba 2 horas al día', highlight: 'roba'},
    {type: 'stat', from: 90, durationInFrames: 120, value: 3, suffix: '', label: 'pasos para dejar la bandeja bajo control (ejemplo)'},
    {type: 'prompt', from: 210, durationInFrames: 180, app: 'Copilot', prompt: 'Resume los correos de hoy y dime cuáles necesitan respuesta antes de las 12', result: ['3 requieren respuesta urgente', '5 son informativos', '2 pueden esperar al lunes']},
    {type: 'compare', from: 390, durationInFrames: 120, left_title: 'Antes', left: '45 minutos leyendo correos uno a uno', right_title: 'Ahora', right: '2 minutos y sabes qué es urgente'},
    {type: 'list', from: 510, durationInFrames: 150, title: 'Pruébalo mañana', items: ['Abre Outlook', 'Pide un resumen', 'Responde solo lo urgente']},
    {type: 'outro', from: 660, durationInFrames: 90, text: 'Guárdalo para tu próximo lunes'},
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={sample.durationInFrames}
    defaultProps={sample}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(props.durationInFrames, 30)})}
  />
  {/* Portada: se renderiza un solo fotograma, cuando las animaciones de entrada ya han terminado */}
  <Composition id="Cover" component={Cover} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={coverSample} />
  {/* Historia de Instagram: la duración la marca cada guion */}
  <Composition id="Story" component={Story} width={1080} height={1920} fps={30} durationInFrames={storySample.durationInFrames}
    defaultProps={storySample} calculateMetadata={({props}) => ({durationInFrames: Math.max(props.durationInFrames, 90)})} />
  <Composition id="Lab" component={Lab} width={1080} height={1920} fps={30} durationInFrames={120}
    defaultProps={{hero: 'ia' as const, accentA: '#3B82F6', accentB: '#22D3EE', bg: '#070B18'}} />
  </>
);

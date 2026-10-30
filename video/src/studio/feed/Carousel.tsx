import React from 'react';
import {FeedCover} from './FeedCover';
import {CarouselGuia} from './CarouselGuia';
import {CarouselExplicador} from './CarouselExplicador';
import {CarouselComparativa} from './CarouselComparativa';
import {CarouselAnalisis} from './CarouselAnalisis';
import type {CarouselProps, SlideProps} from './types';

export const CAROUSELS: Record<string, React.FC<SlideProps>> = {
  CR01: CarouselGuia,
  CR02: CarouselExplicador,
  CR03: CarouselComparativa,
  CR04: CarouselAnalisis,
};

/** Una diapositiva de un carrusel (1080x1350). La 0 es siempre la portada del sistema de portadas. */
export const Carousel: React.FC<CarouselProps> = ({model, family, cover, slides, index, extra, app}) => {
  const total = slides.length + 1;
  if (index === 0) return <FeedCover {...cover} family={family} total={total} app={app ?? cover.app} format="carousel" />;
  const Comp = CAROUSELS[model] ?? CarouselGuia;
  return <Comp slide={slides[index - 1]} index={index} total={total} family={family} extra={extra} app={app ?? cover.app} />;
};

export const carouselSample: CarouselProps = {
  model: 'CR01',
  family: 'tutorial',
  index: 1,
  cover: {family: 'tutorial', kicker: 'GUÍA RÁPIDA · MICROSOFT 365 COPILOT', title: '5 prompts que te ahorran tiempo cada día', highlight: 'cada día', subtitle: 'Uno para cada herramienta que ya usas en el trabajo.', glyph: '5'},
  slides: [
    {kind: 'item', n: 1, tag: 'OUTLOOK', title: 'Pon al día tu bandeja', card: 'Resume este hilo de correos en tres puntos, indica qué se espera de mí y redacta una respuesta breve y profesional.', tip: 'Úsalo en hilos largos antes de responder.'},
    {kind: 'closing', kicker: 'PARA LLEVAR', title: 'Guárdalo para tenerlo a mano', highlight: 'tenerlo a mano', text: 'Funcionan en Microsoft 365 Copilot y, adaptados, también en ChatGPT.'},
  ],
};

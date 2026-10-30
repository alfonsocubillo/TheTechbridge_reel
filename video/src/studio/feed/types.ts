import type {FeedCoverProps} from './FeedCover';

export type Slide = {kind: string} & Record<string, unknown>;

export type SlideProps = {slide: Slide; index: number; total: number; family: string; extra?: Record<string, unknown>};

/** Carrusel completo: la diapositiva 0 siempre es la portada del sistema de portadas. */
export type CarouselProps = {
  model: string;
  family: string;
  cover: FeedCoverProps;
  slides: Slide[];
  /** Diapositiva a pintar (0 = portada). */
  index: number;
  /** Datos propios del modelo (p. ej. nombres de A y B en la comparativa). */
  extra?: Record<string, unknown>;
};

export type SceneType = 'hook' | 'stat' | 'broll' | 'list' | 'compare' | 'quote' | 'prompt' | 'outro';

export type Scene = {
  type: SceneType;
  from: number;
  durationInFrames: number;
  voice?: string;
  voiceSrc?: string;
  video?: string;
  broll?: string;
  text?: string;
  highlight?: string;
  value?: number | string;
  prefix?: string;
  suffix?: string;
  label?: string;
  title?: string;
  subtitle?: string;
  items?: string[];
  left_title?: string;
  left?: string;
  right_title?: string;
  right?: string;
  source?: string;
  app?: string;
  prompt?: string;
  result?: string[];
};

export type Brand = {
  name: string;
  handle: string;
  bg: string;
  text: string;
  muted: string;
  accentA: string;
  accentB: string;
  logo: string | null;
};

export type CaptionWord = {word: string; start: number; end: number};

export type ReelProps = {
  brand: Brand;
  formatLabel: string;
  audioMode: 'voice' | 'music';
  music: string;
  musicVolume: number;
  sfx: {whoosh: string; hit: string} | null;
  scenes: Scene[];
  captions: CaptionWord[];
  durationInFrames: number;
};

export type SceneProps = {scene: Scene; brand: Brand; dur: number; formatLabel: string};

export type CoverProps = {
  brand: Brand;
  formatLabel: string;
  title: string;
  highlight?: string;
};

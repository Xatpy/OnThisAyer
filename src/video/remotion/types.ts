import type { Caption } from '@remotion/captions';

export type EventImage = {
  url: string;
  title?: string;
  description?: string;
};

export type VideoEventScene = {
  id: string;
  year: number;
  text: string;
  images: EventImage[];
  startMs: number;
  endMs: number;
};

export type TikTokVideoProps = {
  dateFormatted: string; // e.g. "09-05"
  dateLabel: string;     // e.g. "September 5th"
  headline: string;      // e.g. "On This Day"
  scenes: VideoEventScene[];
  audioSrc: string;      // Relative path or data URL to MP3
  captions: Caption[];   // Word-level timestamps
  durationInSeconds: number;
  introDurationInSeconds?: number; // Duration in seconds for intro thumbnail cover
};

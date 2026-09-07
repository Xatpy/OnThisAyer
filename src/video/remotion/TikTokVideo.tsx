import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { KenBurnsImage } from './components/KenBurnsImage';
import { EventCard } from './components/EventCard';
import { TikTokCaptions } from './components/TikTokCaptions';
import { ProgressBar } from './components/ProgressBar';
import { AyerOutro } from './components/AyerOutro';
import { ThumbnailCover } from './components/ThumbnailCover';
import type { TikTokVideoProps } from './types';

export const OUTRO_DURATION_SECONDS = 3.0;

export const TikTokVideo: React.FC<TikTokVideoProps> = ({
  dateLabel,
  headline,
  scenes,
  audioSrc,
  captions,
  durationInSeconds,
  introDurationInSeconds = 1.6,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  const outroFrames = Math.round(OUTRO_DURATION_SECONDS * fps);
  const mainContentFrames = Math.max(1, durationInFrames - outroFrames);

  const introSec = introDurationInSeconds > 0 ? introDurationInSeconds : 1.6;
  const introFrames = Math.max(1, Math.round(introSec * fps));
  const introMs = introSec * 1000;

  const years = (scenes || []).map((s) => s.year);
  const coverImage = scenes?.[0]?.images?.[0]?.url;

  return (
    <AbsoluteFill style={{ backgroundColor: '#070709', fontFamily: 'sans-serif' }}>
      {/* 1. Voice Narration Audio */}
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* 2. Top Progress Bar across whole video */}
      <ProgressBar durationInFrames={durationInFrames} />

      {/* 3. First-Frame High-Impact Thumbnail Cover (0 to introFrames) */}
      <Sequence from={0} durationInFrames={introFrames}>
        <ThumbnailCover
          dateLabel={dateLabel}
          headline={headline}
          coverImage={coverImage}
          years={years}
          durationInFrames={introFrames}
        />
      </Sequence>

      {/* 4. Multi-Year Historical Scenes */}
      {scenes && scenes.length > 0 ? (
        scenes.map((scene, idx) => {
          const rawStartMs = idx === 0 ? Math.max(scene.startMs, introMs) : scene.startMs;
          const sceneStartFrame = Math.max(0, Math.round((rawStartMs / 1000) * fps));
          const sceneEndFrame = Math.min(
            mainContentFrames,
            Math.round((scene.endMs / 1000) * fps)
          );
          const sceneDuration = Math.max(1, sceneEndFrame - sceneStartFrame);

          return (
            <Sequence
              key={`${scene.id}-${scene.year}`}
              from={sceneStartFrame}
              durationInFrames={sceneDuration}
            >
              <KenBurnsImage images={scene.images} durationInFrames={sceneDuration} />
              <EventCard dateLabel={dateLabel} headline={headline} year={scene.year} />
            </Sequence>
          );
        })
      ) : null}

      {/* 5. Synchronized TikTok Captions over main content (starts after intro cover) */}
      <Sequence from={0} durationInFrames={mainContentFrames}>
        <TikTokCaptions captions={captions} minStartMs={introMs} />
      </Sequence>

      {/* 6. Brand Call-to-Action Outro */}
      <Sequence from={mainContentFrames} durationInFrames={outroFrames}>
        <AyerOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

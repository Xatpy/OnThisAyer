import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { KenBurnsImage } from './components/KenBurnsImage';
import { EventCard } from './components/EventCard';
import { TikTokCaptions } from './components/TikTokCaptions';
import { ProgressBar } from './components/ProgressBar';
import { AyerOutro } from './components/AyerOutro';
import type { TikTokVideoProps } from './types';

export const OUTRO_DURATION_SECONDS = 3.0;

export const TikTokVideo: React.FC<TikTokVideoProps> = ({
  dateLabel,
  headline,
  scenes,
  audioSrc,
  captions,
  durationInSeconds,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  const outroFrames = Math.round(OUTRO_DURATION_SECONDS * fps);
  const mainContentFrames = Math.max(1, durationInFrames - outroFrames);

  return (
    <AbsoluteFill style={{ backgroundColor: '#070709', fontFamily: 'sans-serif' }}>
      {/* 1. Voice Narration Audio */}
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {/* 2. Top Progress Bar across whole video */}
      <ProgressBar durationInFrames={durationInFrames} />

      {/* 3. Multi-Year Historical Scenes */}
      {scenes && scenes.length > 0 ? (
        scenes.map((scene) => {
          const sceneStartFrame = Math.max(0, Math.round((scene.startMs / 1000) * fps));
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

      {/* 4. Synchronized TikTok Captions over main content */}
      <Sequence from={0} durationInFrames={mainContentFrames}>
        <TikTokCaptions captions={captions} />
      </Sequence>

      {/* 5. Brand Call-to-Action Outro */}
      <Sequence from={mainContentFrames} durationInFrames={outroFrames}>
        <AyerOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

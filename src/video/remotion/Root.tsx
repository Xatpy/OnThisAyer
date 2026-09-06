import React from 'react';
import { Composition, CalculateMetadataFunction } from 'remotion';
import { TikTokVideo, OUTRO_DURATION_SECONDS } from './TikTokVideo';
import type { TikTokVideoProps } from './types';

const defaultDemoProps: TikTokVideoProps = {
  dateFormatted: '09-05',
  dateLabel: 'September 5th',
  headline: 'On This Day',
  durationInSeconds: 15.0,
  audioSrc: '',
  scenes: [
    {
      id: '09-05-1984-52e972c4',
      year: 1984,
      text: 'Space Shuttle Discovery successfully completes its maiden voyage.',
      startMs: 0,
      endMs: 5000,
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/STS41D-01-021.jpg',
          title: 'STS-41-D',
        },
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/STS-133_Space_Shuttle_Discovery_after_undocking_3_%28cropped%29.jpg',
          title: 'Space Shuttle Discovery',
        },
      ],
    },
    {
      id: '09-05-1977-8ba3ca44',
      year: 1977,
      text: 'NASA launches Voyager 1 into deep interstellar space.',
      startMs: 5000,
      endMs: 10000,
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Voyager_spacecraft_model.png',
          title: 'Voyager 1',
        },
      ],
    },
    {
      id: '09-05-1960-4939c6b0',
      year: 1960,
      text: 'Muhammad Ali wins Olympic gold in Rome.',
      startMs: 10000,
      endMs: 15000,
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Muhammad_Ali_NYWTS.jpg',
          title: 'Muhammad Ali',
        },
      ],
    },
  ],
  captions: [
    { text: 'On', startMs: 100, endMs: 300, timestampMs: 100 },
    { text: 'this', startMs: 300, endMs: 500, timestampMs: 300 },
    { text: 'day,', startMs: 500, endMs: 800, timestampMs: 500 },
    { text: 'September', startMs: 800, endMs: 1300, timestampMs: 800 },
    { text: '5th.', startMs: 1300, endMs: 1800, timestampMs: 1300 },
  ],
};

const calculateMetadata: CalculateMetadataFunction<TikTokVideoProps> = async ({ props }) => {
  const narrationSec = props.durationInSeconds > 0 ? props.durationInSeconds : 15.0;
  const totalSeconds = narrationSec + OUTRO_DURATION_SECONDS;
  const fps = 30;

  return {
    durationInFrames: Math.ceil(totalSeconds * fps),
    fps,
    width: 1080,
    height: 1920,
    props,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TikTokShort"
      component={TikTokVideo}
      durationInFrames={Math.ceil((15.0 + OUTRO_DURATION_SECONDS) * 30)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultDemoProps}
      calculateMetadata={calculateMetadata}
    />
  );
};

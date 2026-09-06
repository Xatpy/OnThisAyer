import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

type ProgressBarProps = {
  durationInFrames: number;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #FF9F0A 0%, #FF453A 50%, #FFE600 100%)',
          boxShadow: '0 0 10px rgba(255, 159, 10, 0.8)',
        }}
      />
    </div>
  );
};

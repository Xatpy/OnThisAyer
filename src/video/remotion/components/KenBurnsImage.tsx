import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { EventImage } from '../types';

type KenBurnsImageProps = {
  images: EventImage[];
  durationInFrames: number;
};

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({ images, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const validImages = (images || []).filter(
    (img) => img && typeof img.url === 'string' && img.url.trim().length > 0
  );

  if (validImages.length === 0) {
    const pulseScale = 1 + Math.sin(frame / 25) * 0.06;
    return (
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            transform: `scale(${pulseScale})`,
          }}
        />
        <div
          style={{
            fontSize: 90,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: 'rgba(255, 255, 255, 0.08)',
            letterSpacing: 10,
            textTransform: 'uppercase',
          }}
        >
          HISTORY
        </div>
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(180deg, rgba(5,5,8,0.85) 0%, rgba(5,5,8,0.15) 25%, rgba(5,5,8,0.2) 60%, rgba(5,5,8,0.92) 100%)',
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>
    );
  }

  // If there are multiple images, divide time equally among them
  const numImages = validImages.length;
  const framesPerImage = Math.floor(durationInFrames / numImages);
  const currentImageIdx = Math.min(
    Math.floor(frame / Math.max(1, framesPerImage)),
    numImages - 1
  );
  const currentImage = validImages[currentImageIdx];

  // Local frame within current image slot
  const localFrame = frame - currentImageIdx * framesPerImage;
  const localDuration = framesPerImage;

  // Alternate Ken Burns direction between images:
  // Even: zoom in from 1.05 to 1.20, pan slightly up
  // Odd: zoom out from 1.20 to 1.05, pan slightly down
  const isEven = currentImageIdx % 2 === 0;

  const scale = interpolate(
    localFrame,
    [0, localDuration],
    isEven ? [1.05, 1.22] : [1.22, 1.05],
    { extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    localFrame,
    [0, localDuration],
    isEven ? [0, -35] : [-35, 0],
    { extrapolateRight: 'clamp' }
  );

  // Smooth crossfade opacity (fade in 15 frames at start of next image)
  const fadeInOpacity = currentImageIdx > 0
    ? interpolate(localFrame, [0, Math.min(15, localDuration)], [0, 1], {
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#070709' }}>
      {/* Blurred background for letterbox fill if image doesn't match 9:16 aspect ratio */}
      <Img
        src={currentImage.url}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(35px) brightness(0.35)',
          transform: 'scale(1.2)',
        }}
      />

      {/* Main sharp image with Ken Burns motion */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeInOpacity,
        }}
      >
        <Img
          src={currentImage.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${scale}) translateY(${translateY}px)`,
          }}
        />
      </div>

      {/* Cinematic dark gradients: top for header, bottom for subtitles/branding */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(5,5,8,0.85) 0%, rgba(5,5,8,0.15) 25%, rgba(5,5,8,0.2) 60%, rgba(5,5,8,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

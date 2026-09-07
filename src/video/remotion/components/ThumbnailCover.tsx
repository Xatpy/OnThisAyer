import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { AYER_APP_ICON } from '../assets/icon';

type ThumbnailCoverProps = {
  dateLabel: string;
  headline?: string;
  coverImage?: string;
  years?: number[];
  durationInFrames: number;
};

export const ThumbnailCover: React.FC<ThumbnailCoverProps> = ({
  dateLabel,
  headline = 'On This Day',
  coverImage,
  years = [],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Exit transition in the last 12 frames of the intro hook
  const exitStartFrame = Math.max(1, durationInFrames - 12);
  const opacity = interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [exitStartFrame, durationInFrames], [1, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle background zoom
  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.04], {
    extrapolateRight: 'clamp',
  });

  // Clean date formatting
  const formattedDate = dateLabel ? dateLabel.toUpperCase() : 'TODAY';
  const headlineUpper = headline ? headline.toUpperCase() : 'ON THIS DAY';

  return (
    <AbsoluteFill
      style={{
        zIndex: 25,
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: '#070709',
        overflow: 'hidden',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* 1. Dramatic Background with Photo & Cinematic Dark Vignette */}
      {coverImage ? (
        <AbsoluteFill style={{ transform: `scale(${bgScale})`, transformOrigin: 'center center' }}>
          <Img
            src={coverImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.55) contrast(1.15) saturate(1.1)',
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #1e1b4b 0%, #0f172a 50%, #030712 100%)',
          }}
        />
      )}

      {/* Dark gradient & vignette overlays for 100% text readability */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(7, 7, 10, 0.45) 0%, rgba(7, 7, 10, 0.85) 75%, rgba(7, 7, 10, 0.96) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(7, 7, 10, 0.88) 0%, rgba(7, 7, 10, 0.25) 25%, rgba(7, 7, 10, 0.25) 70%, rgba(7, 7, 10, 0.95) 100%)',
        }}
      />

      {/* Ambient Color Glows (Warm Amber & Ayer Rose) */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 600,
          background: 'radial-gradient(ellipse, rgba(255, 159, 10, 0.22) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 500,
          background: 'radial-gradient(ellipse, rgba(244, 63, 94, 0.18) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* 2. Top Header Branding Bar (Above the 1:1 grid) */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          zIndex: 30,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 24px',
            background: 'rgba(15, 15, 24, 0.75)',
            backdropFilter: 'blur(20px)',
            borderRadius: 999,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)',
          }}
        >
          <img
            src={AYER_APP_ICON}
            alt="Ayer Icon"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          />
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#FFFFFF',
            }}
          >
            OnThisAyer
          </span>
        </div>
      </div>

      {/* 3. Central Hero Card — LOCKED IN THE INSTAGRAM 1:1 GRID SAFE ZONE (Y: 500px - 1420px) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          maxWidth: 960,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 35,
          gap: 24,
        }}
      >
        {/* Glowing Pill Category Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 32px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(255, 69, 58, 0.35) 0%, rgba(255, 159, 10, 0.25) 100%)',
            border: '1.5px solid rgba(255, 159, 10, 0.6)',
            boxShadow: '0 0 30px rgba(255, 69, 58, 0.35), 0 8px 24px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: '#FF453A',
              boxShadow: '0 0 16px #FF453A',
            }}
          />
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#FFFFFF',
            }}
          >
            TODAY IN HISTORY
          </span>
        </div>

        {/* Giant High-Impact Title: ON THIS DAY */}
        <h1
          style={{
            margin: 0,
            fontSize: 104,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            textShadow:
              '0 6px 30px rgba(0, 0, 0, 0.95), 0 2px 6px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 255, 255, 0.2)',
          }}
        >
          {headlineUpper}
        </h1>

        {/* Vibrant Neon Amber Date Line */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#FFE600',
            textShadow:
              '0 0 35px rgba(255, 230, 0, 0.5), 0 6px 30px rgba(0, 0, 0, 0.95), 0 2px 4px rgba(0, 0, 0, 0.9)',
          }}
        >
          {formattedDate}
        </div>

        {/* Sleek Gradient Accent Divider */}
        <div
          style={{
            width: 220,
            height: 6,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #FF453A 0%, #FFE600 100%)',
            boxShadow: '0 0 20px rgba(255, 69, 58, 0.6)',
            margin: '4px 0',
          }}
        />

        {/* Teaser Badges: Years Covered in This Video */}
        {years && years.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginTop: 10,
            }}
          >
            {years.slice(0, 3).map((yr) => (
              <div
                key={yr}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  borderRadius: 16,
                  background: 'rgba(18, 18, 28, 0.88)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                }}
              >
                <span style={{ fontSize: 24 }}>⚡</span>
                <span
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#FFFFFF',
                  }}
                >
                  {yr}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Intrigue / Curiosity Hook Subtitle */}
        <p
          style={{
            margin: 0,
            marginTop: 8,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '1px',
            color: 'rgba(255, 255, 255, 0.92)',
            textShadow: '0 4px 18px rgba(0, 0, 0, 0.9)',
          }}
        >
          What happened today? 👀
        </p>
      </div>

      {/* 4. Bottom Footer Callout (Below 1:1 grid) */}
      <div
        style={{
          position: 'absolute',
          bottom: 90,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 30,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.55)',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
          }}
        >
          Relive your memories with Ayer App
        </span>
      </div>
    </AbsoluteFill>
  );
};

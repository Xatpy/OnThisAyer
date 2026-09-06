import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AYER_APP_ICON } from '../assets/icon';

export const AyerOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animation
  const anim = spring({
    frame,
    fps,
    config: {
      damping: 12,
      mass: 0.8,
    },
  });

  const scale = interpolate(anim, [0, 1], [0.85, 1.0]);
  const opacity = interpolate(anim, [0, 1], [0, 1]);

  // Subtle button pulse after entrance
  const pulse = frame > 25 ? Math.sin((frame - 25) / 10) * 0.03 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'rgba(7, 8, 12, 0.96)',
        backdropFilter: 'blur(30px)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        opacity,
      }}
    >
      {/* Ambient glowing radial lights behind content */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(244, 63, 94, 0.18) 0%, rgba(245, 158, 11, 0.1) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          transform: `scale(${scale})`,
          padding: '40px 50px',
          zIndex: 1,
        }}
      >
        {/* Official Ayer 3D App Icon */}
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 56,
            overflow: 'hidden',
            boxShadow:
              '0 30px 80px rgba(244, 63, 94, 0.45), 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 50px rgba(255, 255, 255, 0.15)',
            marginBottom: 36,
            border: '3px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#fdf6ed',
          }}
        >
          <Img
            src={AYER_APP_ICON}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Brand Name */}
        <h2
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 74,
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 16px 0',
            letterSpacing: '-2px',
          }}
        >
          Ayer App
        </h2>

        {/* Tagline in English */}
        <p
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 36,
            fontWeight: 600,
            color: '#D1D5DB',
            margin: '0 0 52px 0',
            maxWidth: 720,
            lineHeight: 1.35,
          }}
        >
          Your photos are history too.<br />
          Relive your best memories every day.
        </p>

        {/* Call to Action to www.chapiware.com/ayer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            transform: `scale(${1 + pulse})`,
          }}
        >
          {/* Main Website URL Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              padding: '26px 64px',
              borderRadius: 65,
              backgroundColor: '#FFFFFF',
              boxShadow:
                '0 20px 60px rgba(255, 255, 255, 0.35), 0 10px 30px rgba(0, 0, 0, 0.6)',
              border: '3px solid rgba(255, 255, 255, 0.95)',
            }}
          >
            <span style={{ fontSize: 44 }}>📲</span>
            <span
              style={{
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 40,
                fontWeight: 900,
                color: '#07080C',
                letterSpacing: '0.2px',
              }}
            >
              www.chapiware.com/ayer
            </span>
          </div>

          {/* Platform Availability */}
          <span
            style={{
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 28,
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.8)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Free on iOS  & Android 🤖
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type EventCardProps = {
  dateLabel: string;
  headline: string;
  year: number;
};

export const EventCard: React.FC<EventCardProps> = ({ dateLabel, headline, year }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animation for the year pill
  const yearSpring = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 110,
    },
  });

  const yearScale = interpolate(yearSpring, [0, 1], [0.8, 1.0]);
  const yearOpacity = interpolate(yearSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* Top Header Date Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 28px',
          borderRadius: 40,
          background: 'rgba(15, 15, 22, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#FF453A',
            boxShadow: '0 0 12px #FF453A',
          }}
        />
        <span
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#FFFFFF',
          }}
        >
          {headline}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 24 }}>•</span>
        <span
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#FF9F0A',
            letterSpacing: '0.5px',
          }}
        >
          {dateLabel}
        </span>
      </div>

      {/* Year Big Callout Pill with Spring Animation */}
      <div
        style={{
          transform: `scale(${yearScale})`,
          opacity: yearOpacity,
          padding: '8px 28px',
          borderRadius: 24,
          background:
            'linear-gradient(135deg, rgba(255, 159, 10, 0.95), rgba(255, 69, 58, 0.95))',
          boxShadow: '0 6px 30px rgba(255, 69, 58, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
        }}
      >
        <span
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: '1.5px',
            color: '#FFFFFF',
            textShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        >
          YEAR {year}
        </span>
      </div>
    </div>
  );
};

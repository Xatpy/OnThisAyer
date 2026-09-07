import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { Caption } from '@remotion/captions';

const HIGHLIGHT_COLOR = '#FFE600'; // Viral TikTok neon yellow

type SubtitleChunk = {
  tokens: Caption[];
  startMs: number;
  endMs: number;
};

type TikTokCaptionsProps = {
  captions: Caption[];
  minStartMs?: number;
};

function groupCaptionsIntoPages(words: Caption[], minStartMs = 0, maxWords = 4, maxDurationMs = 2400): SubtitleChunk[] {
  if (!words || words.length === 0) return [];
  
  const candidateWords = minStartMs > 0 ? words.filter((w) => w.startMs >= minStartMs) : words;
  if (candidateWords.length === 0) return [];

  const pages: SubtitleChunk[] = [];
  let currentTokens: Caption[] = [];

  for (const word of words) {
    currentTokens.push(word);
    const pageDuration = word.endMs - currentTokens[0].startMs;
    
    // Split on punctuation, max words limit, or max duration
    const endsWithPunctuation = /[.,!?:;]$/.test(word.text);
    if (currentTokens.length >= maxWords || pageDuration >= maxDurationMs || (endsWithPunctuation && currentTokens.length >= 2)) {
      pages.push({
        tokens: currentTokens,
        startMs: currentTokens[0].startMs,
        endMs: word.endMs,
      });
      currentTokens = [];
    }
  }

  if (currentTokens.length > 0) {
    pages.push({
      tokens: currentTokens,
      startMs: currentTokens[0].startMs,
      endMs: currentTokens[currentTokens.length - 1].endMs,
    });
  }

  return pages;
}

const CaptionPageRenderer: React.FC<{ page: SubtitleChunk }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeMs = (frame / fps) * 1000;
  const absoluteTimeMs = page.startMs + currentTimeMs;

  return (
    <div
      style={{
        position: 'absolute',
        top: '70%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '92%',
        maxWidth: 960,
        textAlign: 'center',
        lineHeight: 1.25,
        wordWrap: 'break-word',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px 18px',
        }}
      >
        {page.tokens.map((token, idx) => {
          const isActive =
            token.startMs <= absoluteTimeMs && token.endMs > absoluteTimeMs;

          // Pop animation when the word becomes active
          const wordProgressMs = absoluteTimeMs - token.startMs;
          const wordScale = isActive
            ? interpolate(wordProgressMs, [0, 80, 220], [1.0, 1.15, 1.08], {
                extrapolateRight: 'clamp',
              })
            : 1.0;

          return (
            <span
              key={`${token.startMs}-${idx}`}
              style={{
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Montserrat, sans-serif',
                fontSize: 72,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-1px',
                color: isActive ? HIGHLIGHT_COLOR : '#FFFFFF',
                transform: `scale(${wordScale})`,
                display: 'inline-block',
                textShadow:
                  '-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 8px 18px rgba(0,0,0,0.9)',
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const TikTokCaptions: React.FC<TikTokCaptionsProps> = ({ captions, minStartMs = 0 }) => {
  const { fps } = useVideoConfig();

  const pages = useMemo(() => {
    return groupCaptionsIntoPages(captions, minStartMs, 4, 2200);
  }, [captions, minStartMs]);

  if (pages.length === 0) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 260, // Positioned safely above TikTok/Shorts UI
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = Math.max(0, Math.round((page.startMs / 1000) * fps));
        
        // Extend slightly to next page start or at least 15 frames
        const endFrame = nextPage
          ? Math.max(startFrame + 10, Math.round((nextPage.startMs / 1000) * fps))
          : Math.max(startFrame + 15, Math.round((page.endMs / 1000) * fps));

        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <CaptionPageRenderer page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

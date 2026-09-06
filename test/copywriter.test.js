import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSocialCopy,
  stripTrailingWords,
  stripHtml
} from '../src/core/copywriter.js';

describe('Copywriter Core Tests', () => {
  describe('stripTrailingWords & Sentence Cleaning', () => {
    it('strips dangling prepositions and conjunctions in a loop', () => {
      assert.equal(stripTrailingWords('demonstration for'), 'demonstration');
      assert.equal(stripTrailingWords('negotiation between and for'), 'negotiation');
      assert.equal(stripTrailingWords('The meeting in the city of'), 'The meeting in the city');
      assert.equal(stripTrailingWords('Event ended with,'), 'Event ended');
    });

    it('preserves clean complete sentences', () => {
      assert.equal(stripTrailingWords('Google is founded by Larry Page and Sergey Brin'), 'Google is founded by Larry Page and Sergey Brin');
    });
  });

  describe('Twitter / X Copy Generation', () => {
    it('generates copy within 280 characters limit', () => {
      const sampleEvents = [
        {
          year: 1998,
          text: 'Google is founded by Larry Page and Sergey Brin, two PhD students at Stanford University.',
          category: { icon: '🚀' }
        },
        {
          year: 1989,
          text: 'In Leipzig, East Germany, the first of weekly demonstration for the legalisation of opposition groups takes place.',
          category: { icon: '🏛️' }
        },
        {
          year: 1948,
          text: 'Queen Wilhelmina of the Netherlands abdicates for health reasons after 58 years of reign.',
          category: { icon: '👑' }
        }
      ];

      const copy = generateSocialCopy(9, 4, sampleEvents, 'en');
      assert.ok(copy.twitter);
      assert.ok(copy.twitter.length <= 280, `Twitter length ${copy.twitter.length} exceeded 280 chars`);
      assert.match(copy.twitter, /(?:On this day|OnThisAyer)/i);
    });

    it('generates Instagram copy with structured years ago and CTA', () => {
      const sampleEvents = [
        {
          year: 1998,
          text: 'Google is founded by Larry Page and Sergey Brin.',
          category: { icon: '🚀' }
        }
      ];

      const copy = generateSocialCopy(9, 4, sampleEvents, 'en');
      assert.ok(copy.instagram);
      assert.match(copy.instagram, /years ago/);
      assert.match(copy.instagram, /#OnThisDay/);
    });

    it('generates viral TikTok copy with hooks, emojis, hashtags and CTA', () => {
      const sampleEvents = [
        {
          year: 1998,
          text: 'Google is founded by Larry Page and Sergey Brin.',
          category: { icon: '🚀' }
        }
      ];

      const copy = generateSocialCopy(9, 4, sampleEvents, 'en');
      assert.ok(copy.tiktok);
      assert.match(copy.tiktok, /Wait till you see|Honest question/);
      assert.match(copy.tiktok, /#HistoryTok/);
      assert.match(copy.tiktok, /#FYP/);
      assert.match(copy.tiktok, /chapiware\.com\/ayer/);
    });

    it('generates structured Twitter thread with hook, event stories and Ayer CTA', () => {
      const sampleEvents = [
        {
          year: 1998,
          text: 'Google is founded by Larry Page and Sergey Brin.',
          category: { icon: '🚀' }
        },
        {
          year: 1989,
          text: 'The first weekly demonstration takes place in Leipzig.',
          category: { icon: '🏛️' }
        }
      ];

      const copy = generateSocialCopy(9, 4, sampleEvents, 'en');
      assert.ok(Array.isArray(copy.twitterThread));
      assert.equal(copy.twitterThread.length, 4); // 1 hook + 2 events + 1 CTA
      assert.match(copy.twitterThread[0], /🧵 1\/4/);
      assert.match(copy.twitterThread[1], /2\/4 \| 🔹 1998/);
      assert.match(copy.twitterThread[2], /3\/4 \| 🔹 1989/);
      assert.match(copy.twitterThread[3], /4\/4 \| 💬 What were YOU doing/);
      assert.match(copy.twitterThreadFormatted, /---/);
    });
  });
});

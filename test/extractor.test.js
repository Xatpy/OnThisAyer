import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDate,
  padZero,
  createDeterministicEventId,
  getImageCanonicalKey,
  categorizeEvent,
  calculateMarketingScore,
  selectBest3MarketingEvents
} from '../src/core/extractor.js';

describe('Extractor Core Tests', () => {
  describe('Date Validation (isValidDate)', () => {
    it('accepts valid calendar dates', () => {
      assert.equal(isValidDate(1, 1), true);
      assert.equal(isValidDate(2, 29), true); // Feb in leap year
      assert.equal(isValidDate(8, 29), true);
      assert.equal(isValidDate(12, 31), true);
    });

    it('rejects impossible days for given month', () => {
      assert.equal(isValidDate(2, 30), false);
      assert.equal(isValidDate(2, 31), false);
      assert.equal(isValidDate(4, 31), false);
      assert.equal(isValidDate(6, 31), false);
      assert.equal(isValidDate(9, 31), false);
      assert.equal(isValidDate(11, 31), false);
    });

    it('rejects non-integer strings, decimals, and NaN', () => {
      assert.equal(isValidDate('1.9', '15'), false);
      assert.equal(isValidDate(1.9, 15), false);
      assert.equal(isValidDate('1abc', '10'), false);
      assert.equal(isValidDate('10', '20xyz'), false);
      assert.equal(isValidDate(null, 5), false);
      assert.equal(isValidDate(undefined, 5), false);
    });
  });

  describe('Deterministic Event IDs', () => {
    it('produces identical IDs for identical event inputs', () => {
      const id1 = createDeterministicEventId('08', '29', 1997, 'Netflix is founded by Reed Hastings');
      const id2 = createDeterministicEventId('08', '29', 1997, 'Netflix is founded by Reed Hastings');
      assert.equal(id1, id2);
      assert.match(id1, /^08-29-1997-[a-f0-9]{8}$/);
    });

    it('produces different IDs for different event texts', () => {
      const id1 = createDeterministicEventId('08', '29', 1997, 'Event A');
      const id2 = createDeterministicEventId('08', '29', 1997, 'Event B');
      assert.notEqual(id1, id2);
    });
  });

  describe('Image Canonical Key Deduplication', () => {
    it('extracts clean canonical filename from complex Wikimedia URLs', () => {
      const url1 = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Steve_Jobs_2010.jpg/800px-Steve_Jobs_2010.jpg';
      const url2 = 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Steve_Jobs_2010.jpg';
      assert.equal(getImageCanonicalKey(url1), 'steve_jobs_2010.jpg');
      assert.equal(getImageCanonicalKey(url2), 'steve_jobs_2010.jpg');
    });
  });

  describe('Category Scoring & Marketing Algorithm', () => {
    it('categorizes tech events correctly', () => {
      const cat = categorizeEvent('Apple announces the first iPhone at Macworld', [{ title: 'iPhone' }]);
      assert.equal(cat.id, 'science_tech');
      assert.equal(cat.icon, '🚀');
    });

    it('scores high impact pop culture keywords higher', () => {
      const scoreHigh = calculateMarketingScore('Michael Jackson releases Thriller', [{ title: 'Michael Jackson' }], 1982, 10);
      const scoreLow = calculateMarketingScore('A local municipal meeting takes place', [], 1850, 4);
      assert.ok(scoreHigh > scoreLow);
    });

    it('scores major historical events like 9/11 with top priority', () => {
      const score911 = calculateMarketingScore(
        'Nineteen members of al-Qaeda execute the September 11 attacks, a series of coordinated terrorist attacks in New York City and Washington, D.C.',
        [{ title: 'September 11 attacks', description: '2001 terror attacks in the U.S.' }],
        2001,
        10
      );
      const scoreRoutineSpace = calculateMarketingScore(
        'Progress MS-32 is launched to resupply the International Space Station.',
        [{ title: 'Progress MS-32', description: 'Russian resupply flight' }],
        2025,
        10
      );
      assert.ok(score911 >= 140, `Expected score911 >= 140, got ${score911}`);
      assert.ok(score911 > scoreRoutineSpace, `Expected 9/11 (${score911}) to outscore routine space mission (${scoreRoutineSpace})`);
    });

    it('penalizes routine space shuttle and resupply missions as low impact noise', () => {
      const scoreRoutineShuttle = calculateMarketingScore(
        'NASA launches Space Shuttle Discovery on STS-51.',
        [{ title: 'STS-51', description: 'Space Shuttle mission' }],
        1993,
        10
      );
      const scoreJfkSpeech = calculateMarketingScore(
        'US President John F. Kennedy delivers his "We choose to go to the Moon" speech at Rice University.',
        [{ title: 'We choose to go to the Moon', description: 'Address on the space program' }],
        1962,
        10,
        true
      );
      assert.ok(scoreRoutineShuttle <= 50, `Expected routine shuttle <= 50, got ${scoreRoutineShuttle}`);
      assert.ok(scoreJfkSpeech >= 150, `Expected JFK speech >= 150, got ${scoreJfkSpeech}`);
      assert.ok(scoreJfkSpeech > scoreRoutineShuttle * 2, 'JFK historic speech should overwhelmingly outscore routine shuttle flight');
    });
  });

  describe('Serialized Curation Writes', () => {
    it('handles concurrent saveCuratedDay calls without lost updates', async () => {
      const { saveCuratedDay, getCuratedStore } = await import('../src/core/extractor.js');
      await Promise.all([
        saveCuratedDay(8, 29, ['08-29-2022-b392ed2f']),
        saveCuratedDay(8, 30, ['08-30-2008-e16c58a4'])
      ]);
      const store = await getCuratedStore();
      assert.ok(store['08-29']);
      assert.ok(store['08-30']);
      assert.deepEqual(store['08-29'].selectedEventIds, ['08-29-2022-b392ed2f']);
      assert.deepEqual(store['08-30'].selectedEventIds, ['08-30-2008-e16c58a4']);
    });
  });
});

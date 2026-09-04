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

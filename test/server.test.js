import { test, describe, before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { server } from '../src/server.js';

describe('Server & API Integration Tests', () => {
  let testPort;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        testPort = server.address().port;
        baseUrl = `http://127.0.0.1:${testPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /api/stats returns status 200 with cached counts', async () => {
    const res = await fetch(`${baseUrl}/api/stats`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.totalDaysCached === 'number');
    assert.ok(typeof data.totalCuratedDays === 'number');
  });

  it('GET /api/events/2/31 returns 400 Bad Request for invalid date', async () => {
    const res = await fetch(`${baseUrl}/api/events/2/31`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Invalid calendar date/);
  });

  it('GET /api/events/13/1 returns 400 Bad Request for invalid month', async () => {
    const res = await fetch(`${baseUrl}/api/events/13/1`);
    assert.equal(res.status, 400);
  });

  it('GET /api/events/8/29 returns 200 with deterministic events', async () => {
    const res = await fetch(`${baseUrl}/api/events/8/29`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.events));
    assert.ok(data.events.length > 0);
    assert.match(data.events[0].id, /^08-29-\d{4}-[a-f0-9]{8}$/);
  });

  it('POST /api/generate-copy/8/29 returns social copy', async () => {
    const payload = {
      events: [
        {
          year: 1997,
          text: 'Netflix is founded by Reed Hastings and Marc Randolph in Scotts Valley, California.',
          category: { icon: '🍿' }
        }
      ],
      lang: 'en'
    };

    const res = await fetch(`${baseUrl}/api/generate-copy/8/29`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.twitter);
    assert.ok(data.instagram);
  });

  it('Static file server blocks path traversal attacks with 403 Forbidden', async () => {
    const status = await new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port: testPort,
        path: '/website/../package.json',
        method: 'GET'
      }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });

    assert.equal(status, 403);
  });

  it('POST /api/curated/8/29 rejects non-existent fake event IDs with 400', async () => {
    const res = await fetch(`${baseUrl}/api/curated/8/29`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedEventIds: ['08-29-not-a-real-event-id-fake']
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /None of the selected event IDs exist/);
  });

  it('POST with payload exceeding 1MB returns 413 Payload Too Large', async () => {
    const bigBody = 'x'.repeat(1024 * 1024 + 100);
    const res = await fetch(`${baseUrl}/api/generate-copy/8/29`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bigBody
    });
    assert.equal(res.status, 413);
  });

  it('GET /api/video/:month/:day detects existing video and caption', async () => {
    const res = await fetch(`${baseUrl}/api/video/9/6`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.exists, true);
    assert.equal(data.videoUrl, '/output/videos/09-06.mp4');
    assert.ok(data.downloadFilename.includes('09-06'));
    assert.ok(typeof data.caption === 'string');
  });

  it('GET /api/video/:month/:day returns exists: false for date without video', async () => {
    const res = await fetch(`${baseUrl}/api/video/1/1`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.exists, false);
    assert.equal(data.videoUrl, null);
  });

  it('GET /output/videos/09-06.mp4 supports Range requests for streaming', async () => {
    const res = await fetch(`${baseUrl}/output/videos/09-06.mp4`, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('content-type'), 'video/mp4');
    assert.equal(res.headers.get('accept-ranges'), 'bytes');
    assert.match(res.headers.get('content-range'), /^bytes 0-1023\/\d+$/);
  });
});

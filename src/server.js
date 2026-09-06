import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDayEvents, saveCuratedDay, getCuratedStore, padZero, isValidDate, migrateCachedData } from './core/extractor.js';
import { generateSocialCopy } from './core/copywriter.js';
import { renderMockupScreenshot } from './core/renderer.js';

// Auto-run data migration to ensure deterministic IDs and curation integrity
migrateCachedData().catch(() => {});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_UI_DIR = path.resolve(__dirname, 'admin-ui');
const WEBSITE_DIR = path.resolve(__dirname, '../website');
const OUTPUT_DIR = path.resolve(__dirname, '../output');
const EVENTS_DIR = path.resolve(__dirname, '../data/events');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB limit

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8'
};

class PayloadTooLargeError extends Error {
  constructor(message = 'Payload Too Large (Max 1MB)') {
    super(message);
    this.name = 'PayloadTooLargeError';
    this.statusCode = 413;
  }
}

function readRequestBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let exceeded = false;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        exceeded = true;
        req.pause();
        req.resume(); // drain without buffering
        reject(new PayloadTooLargeError());
      } else if (!exceeded) {
        body += chunk;
      }
    });

    req.on('end', () => {
      if (!exceeded) resolve(body);
    });
    req.on('error', reject);
  });
}

async function handleApiRequest(req, res, url) {
  const pathname = url.pathname;

  // GET /api/stats
  if (pathname === '/api/stats' && req.method === 'GET') {
    try {
      const eventFiles = await fs.readdir(EVENTS_DIR).catch(() => []);
      const curatedStore = await getCuratedStore();
      const cachedCount = eventFiles.filter(f => f.endsWith('.json')).length;
      const curatedCount = Object.keys(curatedStore).length;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        totalDaysCached: cachedCount,
        totalCuratedDays: curatedCount
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/events/:month/:day
  const matchEvents = pathname.match(/^\/api\/events\/(\d+)\/(\d+)$/);
  if (matchEvents && req.method === 'GET') {
    const month = parseInt(matchEvents[1], 10);
    const day = parseInt(matchEvents[2], 10);

    if (!isValidDate(month, day)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Invalid calendar date: month ${month}, day ${day}` }));
      return;
    }

    const forceRefresh = url.searchParams.get('refresh') === 'true';

    try {
      const data = await getDayEvents(month, day, forceRefresh);
      const curatedStore = await getCuratedStore();
      const dateKey = `${padZero(month)}-${padZero(day)}`;
      const curatedSelection = curatedStore[dateKey] || null;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...data,
        curatedSelection
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/generate-copy/:month/:day
  const matchCopy = pathname.match(/^\/api\/generate-copy\/(\d+)\/(\d+)$/);
  if (matchCopy && req.method === 'POST') {
    const month = parseInt(matchCopy[1], 10);
    const day = parseInt(matchCopy[2], 10);

    if (!isValidDate(month, day)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Invalid calendar date: month ${month}, day ${day}` }));
      return;
    }

    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');
      const events = Array.isArray(payload.events) ? payload.events : [];
      const lang = payload.lang === 'es' ? 'es' : 'en';
      const copies = generateSocialCopy(month, day, events, lang);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(copies));
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/render/:month/:day
  const matchRender = pathname.match(/^\/api\/render\/(\d+)\/(\d+)$/);
  if (matchRender && req.method === 'GET') {
    const month = parseInt(matchRender[1], 10);
    const day = parseInt(matchRender[2], 10);

    if (!isValidDate(month, day)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Invalid calendar date: month ${month}, day ${day}` }));
      return;
    }

    try {
      const screenshotPath = await renderMockupScreenshot(month, day);
      const imageBuffer = await fs.readFile(screenshotPath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="ayer-${padZero(month)}-${padZero(day)}.png"`
      });
      res.end(imageBuffer);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/video/:month/:day
  const matchVideo = pathname.match(/^\/api\/video\/(\d+)\/(\d+)$/);
  if (matchVideo && req.method === 'GET') {
    const month = parseInt(matchVideo[1], 10);
    const day = parseInt(matchVideo[2], 10);

    if (!isValidDate(month, day)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Invalid calendar date: month ${month}, day ${day}` }));
      return;
    }

    const mm = padZero(month);
    const dd = padZero(day);
    const videoFile = `${mm}-${dd}.mp4`;
    const txtFile = `${mm}-${dd}.txt`;
    const videoAbsPath = path.join(OUTPUT_DIR, 'videos', videoFile);
    const txtAbsPath = path.join(OUTPUT_DIR, 'videos', txtFile);

    try {
      const stat = await fs.stat(videoAbsPath);
      let caption = '';
      try {
        caption = await fs.readFile(txtAbsPath, 'utf8');
      } catch {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        exists: true,
        month,
        day,
        videoUrl: `/output/videos/${videoFile}`,
        downloadUrl: `/output/videos/${videoFile}`,
        downloadFilename: `OnThisAyer-${mm}-${dd}.mp4`,
        captionUrl: `/output/videos/${txtFile}`,
        caption,
        sizeBytes: stat.size,
      }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        exists: false,
        month,
        day,
        videoUrl: null,
      }));
    }
    return;
  }

  // POST /api/curated/:month/:day
  const matchCurated = pathname.match(/^\/api\/curated\/(\d+)\/(\d+)$/);
  if (matchCurated && req.method === 'POST') {
    const month = parseInt(matchCurated[1], 10);
    const day = parseInt(matchCurated[2], 10);

    if (!isValidDate(month, day)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Invalid calendar date: month ${month}, day ${day}` }));
      return;
    }

    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');
      const selectedEventIds = Array.isArray(payload.selectedEventIds) ? payload.selectedEventIds : [];
      const customNotes = typeof payload.customNotes === 'string' ? payload.customNotes : '';

      // Verify that selected IDs actually exist in the candidate events for this day
      const dayData = await getDayEvents(month, day);
      const validEventIdSet = new Set((dayData.events || []).map(e => e.id));
      const validIds = selectedEventIds.filter(id => typeof id === 'string' && validEventIdSet.has(id));

      if (selectedEventIds.length > 0 && validIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'None of the selected event IDs exist for this date' }));
        return;
      }

      const saved = await saveCuratedDay(month, day, validIds, customNotes);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, saved }));
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

async function serveStaticFile(req, res, rawPathname) {
  let pathname;
  try {
    pathname = decodeURIComponent(rawPathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  let baseDir;
  let rel;

  if (pathname.startsWith('/website/') || pathname === '/website') {
    baseDir = WEBSITE_DIR;
    rel = pathname.replace(/^\/website\/?/, '') || 'index.html';
  } else if (pathname.startsWith('/output/')) {
    baseDir = OUTPUT_DIR;
    rel = pathname.replace(/^\/output\/?/, '');
  } else {
    baseDir = ADMIN_UI_DIR;
    rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  }

  const safePath = path.resolve(baseDir, rel);
  if (!safePath.startsWith(baseDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(safePath);
    let finalPath = safePath;
    if (stat.isDirectory()) {
      finalPath = path.join(safePath, 'index.html');
    }

    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range requests for video streaming / seeking
    if (ext === '.mp4' || ext === '.webm') {
      const totalSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize || start > end) {
          res.writeHead(416, {
            'Content-Range': `bytes */${totalSize}`,
            'Content-Type': contentType,
          });
          res.end();
          return;
        }

        const chunksize = end - start + 1;
        const fileStream = fsSync.createReadStream(finalPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        });
        fileStream.pipe(res);
        return;
      }

      res.writeHead(200, {
        'Content-Length': totalSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
      });
      const fileStream = fsSync.createReadStream(finalPath);
      fileStream.pipe(res);
      return;
    }

    const content = await fs.readFile(finalPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

export const server = http.createServer(async (req, res) => {
  const hostHeader = req.headers.host || `${HOST}:${PORT}`;
  let url;
  try {
    url = new URL(req.url, `http://${hostHeader}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // Block path traversal attempts
  if (req.url.includes('..') || url.pathname.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    await handleApiRequest(req, res, url);
  } else {
    await serveStaticFile(req, res, url.pathname);
  }
});

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 OnThisAyer — Ayer App Hub`);
    console.log(`🛠️ Panel de Curación Admin:  http://${HOST}:${PORT}`);
    console.log(`🌐 Web Pública (GitHub Pages): http://${HOST}:${PORT}/website/`);
    console.log(`======================================================\n`);
  });
}

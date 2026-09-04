import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { padZero, getDayEvents, getCuratedStore } from './extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_UI_DIR = path.resolve(__dirname, '../admin-ui');
const OUTPUT_DIR = path.resolve(__dirname, '../../output');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

async function launchSmartBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    try {
      return await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      try {
        return await chromium.launch({ channel: 'msedge', headless: true });
      } catch {
        throw err;
      }
    }
  }
}

async function ensureServerRunning(port = 3000) {
  try {
    const res = await fetch(`http://localhost:${port}/api/stats`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return { port, close: () => {} };
  } catch {}

  const tempPort = 3599;
  const tempServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    const matchEvents = url.pathname.match(/^\/api\/events\/(\d+)\/(\d+)$/);
    if (matchEvents) {
      const m = parseInt(matchEvents[1], 10);
      const d = parseInt(matchEvents[2], 10);
      const data = await getDayEvents(m, d);
      const curatedStore = await getCuratedStore();
      const dateKey = `${padZero(m)}-${padZero(d)}`;
      const curatedSelection = curatedStore[dateKey] || null;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...data, curatedSelection }));
      return;
    }

    let relativePath = url.pathname === '/' ? '/index.html' : url.pathname;
    let filePath = path.join(ADMIN_UI_DIR, relativePath);

    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'text/plain';
      const content = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(resolve => tempServer.listen(tempPort, resolve));
  return {
    port: tempPort,
    close: () => tempServer.close()
  };
}

export async function renderMockupScreenshot(month, day) {
  const mm = padZero(month);
  const dd = padZero(day);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${mm}-${dd}.png`);

  const serverHandle = await ensureServerRunning();
  const browser = await launchSmartBrowser();

  try {
    const context = await browser.newContext({
      viewport: { width: 440, height: 956 },
      deviceScaleFactor: 2.5 // Retina resolution: 1100 x 2390 px
    });

    const page = await context.newPage();
    const targetUrl = `http://localhost:${serverHandle.port}/mockup.html?month=${month}&day=${day}`;
    
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__MOCKUP_READY__ === true, { timeout: 15000 });

    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
    });

    await page.waitForTimeout(350);

    const screenElement = await page.$('.iphone-screen');
    if (screenElement) {
      await screenElement.screenshot({
        path: outputPath,
        type: 'png'
      });
    } else {
      await page.screenshot({
        path: outputPath,
        type: 'png'
      });
    }

    return outputPath;
  } finally {
    await browser.close();
    serverHandle.close();
  }
}

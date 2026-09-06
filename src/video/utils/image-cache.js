import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
export const IMAGE_CACHE_DIR = path.join(ROOT_DIR, 'output/temp/images');

export const WIKIMEDIA_USER_AGENT = 'TalDiaComoHoyBot/1.0 (https://chapiware.com/ayer; contact@chapiware.com)';

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  return rawUrl.replace(/&amp;/g, '&').trim();
}

function getMimeType(filePath, buffer) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';

  // Check magic bytes if ambiguous
  if (buffer && buffer.length > 4) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'image/webp';
  }
  return 'image/jpeg';
}

function isValidImageBuffer(buf) {
  if (!buf || buf.length < 500) return false;
  // Check if it's HTML error page (e.g. 429 Too Many Requests)
  const preview = buf.subarray(0, 100).toString('utf8').toLowerCase();
  if (preview.includes('<!doctype html') || preview.includes('<html') || preview.includes('too many requests')) {
    return false;
  }
  return true;
}

async function fetchWithRetry(url, maxRetries = 2) {
  const cleanUrl = sanitizeUrl(url);
  if (!cleanUrl || !cleanUrl.startsWith('http')) return null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(cleanUrl, {
        headers: {
          'User-Agent': WIKIMEDIA_USER_AGENT,
          'Accept': 'image/avif,image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        // Rate limited: wait before retry
        const retrySec = parseInt(res.headers.get('retry-after') || '2', 10);
        const waitMs = Math.min(retrySec * 1000, 3000);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        return null;
      }

      if (!res.ok) {
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('image/') && !contentType.includes('octet-stream')) {
        return null;
      }

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (!isValidImageBuffer(buffer)) {
        return null;
      }

      return buffer;
    } catch {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  return null;
}

/**
 * Downloads or loads an image from local cache and returns a base64 Data URI.
 * Guarantees zero network calls inside Remotion Chromium tabs.
 */
export async function resolveImageAsDataUri(primaryUrl, fallbackUrl = null) {
  await fs.mkdir(IMAGE_CACHE_DIR, { recursive: true });

  const cleanPrimary = sanitizeUrl(primaryUrl);
  const cleanFallback = sanitizeUrl(fallbackUrl);

  if (!cleanPrimary && !cleanFallback) return null;

  // Derive cache key from primary URL or fallback
  const cacheKey = cleanPrimary || cleanFallback;
  const hash = crypto.createHash('sha256').update(cacheKey).digest('hex').substring(0, 16);
  
  // Try to determine extension
  let ext = '.jpg';
  const urlForExt = (cleanPrimary || cleanFallback).split('?')[0].toLowerCase();
  if (urlForExt.endsWith('.png')) ext = '.png';
  else if (urlForExt.endsWith('.webp')) ext = '.webp';
  else if (urlForExt.endsWith('.gif')) ext = '.gif';

  const cacheFilePath = path.join(IMAGE_CACHE_DIR, `${hash}${ext}`);

  // 1. Check disk cache
  if (fsSync.existsSync(cacheFilePath)) {
    try {
      const existingBuf = await fs.readFile(cacheFilePath);
      if (isValidImageBuffer(existingBuf)) {
        const mime = getMimeType(cacheFilePath, existingBuf);
        return `data:${mime};base64,${existingBuf.toString('base64')}`;
      }
    } catch {
      // If reading cache failed, re-fetch
    }
  }

  // 2. Fetch primary URL
  let buffer = null;
  if (cleanPrimary) {
    buffer = await fetchWithRetry(cleanPrimary, 1);
  }

  // 3. Fallback to thumbnailUrl if primary failed
  if (!buffer && cleanFallback && cleanFallback !== cleanPrimary) {
    buffer = await fetchWithRetry(cleanFallback, 1);
  }

  if (!buffer) {
    return null;
  }

  // 4. Save to cache
  try {
    await fs.writeFile(cacheFilePath, buffer);
  } catch {
    // Non-fatal write failure
  }

  const mime = getMimeType(cacheFilePath, buffer);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Prepares and downloads all images for an array of scenes concurrently.
 * Replaces remote URLs with local base64 data URIs and discards any invalid ones.
 */
export async function preloadAndResolveSceneImages(rawImages) {
  if (!rawImages || rawImages.length === 0) return [];

  const resolved = await Promise.all(
    rawImages.map(async (img) => {
      if (!img) return null;
      const dataUri = await resolveImageAsDataUri(img.url, img.thumbnailUrl);
      if (!dataUri) return null;
      return {
        ...img,
        url: dataUri,
      };
    })
  );

  return resolved.filter(Boolean);
}

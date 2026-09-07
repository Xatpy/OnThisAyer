import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { padZero, isValidDate, fetchWikipediaDay, saveDayEvents } from '../core/extractor.js';
import {
  MONTH_NAMES_EN,
  getOrdinalSuffix,
  pickTopEvents,
  renderVideoJob,
  cleanEnglishSentence,
  OUTPUT_DIR as DEFAULT_OUTPUT_DIR,
} from './video.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const EVENTS_DIR = path.join(ROOT_DIR, 'data/events');

function getDynamicDates(daysCount = 7, startDate = null, endDate = null) {
  const dates = [];
  const start = startDate ? new Date(startDate) : new Date();

  if (endDate) {
    const end = new Date(endDate);
    const curr = new Date(start);
    while (curr <= end) {
      dates.push({
        month: curr.getMonth() + 1,
        day: curr.getDate(),
      });
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push({
      month: d.getMonth() + 1,
      day: d.getDate(),
    });
  }
  return dates;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    days: 7,
    month: null,
    start: null,
    until: null,
    day: null,
    split: false,
    maxEvents: 3,
    voice: 'en-US-ChristopherNeural',
    outDir: DEFAULT_OUTPUT_DIR,
    skipExisting: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val > 0) params.days = val;
    } else if (arg.startsWith('--month=')) {
      params.month = arg.split('=')[1];
    } else if (arg.startsWith('--start=')) {
      params.start = arg.split('=')[1];
    } else if (arg.startsWith('--until=') || arg.startsWith('--end=')) {
      const val = arg.split('=')[1];
      params.until = val === 'end-of-year' || val === 'year' ? '12-31' : val;
    } else if (arg.startsWith('--day=')) {
      params.day = arg.split('=')[1];
    } else if (arg === '--split') {
      params.split = true;
    } else if (arg.startsWith('--max=')) {
      params.maxEvents = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--voice=')) {
      params.voice = arg.split('=')[1];
    } else if (arg.startsWith('--out-dir=')) {
      params.outDir = path.resolve(ROOT_DIR, arg.split('=')[1]);
    } else if (arg === '--skip-existing') {
      params.skipExisting = true;
    } else if (arg === '--dry-run') {
      params.dryRun = true;
    }
  }

  return params;
}

async function ensureEventData(mm, dd) {
  const filePath = path.join(EVENTS_DIR, `${mm}-${dd}.json`);
  if (!fsSync.existsSync(filePath)) {
    console.log(`📥 Downloading missing Wikipedia events for ${mm}-${dd}...`);
    const m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    const data = await fetchWikipediaDay(m, d);
    await saveDayEvents(m, d, data);
  }
}

async function main() {
  const options = parseArgs();

  console.log(`🎬 OnThisAyer Batch Video Engine — TikTok & YouTube Shorts`);
  console.log(`⚡ High-Performance Multi-Video Pipeline (Shared Remotion Bundle)`);
  console.log(`📂 Output Directory for MP4s: ${options.outDir}`);
  console.log(`----------------------------------------------------------------`);

  await fs.mkdir(options.outDir, { recursive: true });

  // 1. Determine list of target calendar dates
  let targetDates = [];

  if (options.day) {
    const parts = options.day.split('-');
    if (parts.length === 2 && isValidDate(parts[0], parts[1])) {
      targetDates = [{ month: parseInt(parts[0], 10), day: parseInt(parts[1], 10) }];
    } else {
      throw new Error(`Invalid --day format "${options.day}". Use MM-DD (e.g. 09-07).`);
    }
  } else if (options.month) {
    const m = parseInt(options.month, 10);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      const year = new Date().getFullYear();
      const daysInMonth = new Date(year, m, 0).getDate();
      targetDates = [];
      for (let d = 1; d <= daysInMonth; d++) {
        targetDates.push({ month: m, day: d });
      }
    } else {
      throw new Error(`Invalid --month format "${options.month}". Use 1-12 or 01-12.`);
    }
  } else {
    let startDateObj = null;
    if (options.start) {
      const parts = options.start.split('-');
      if (parts.length === 2 && isValidDate(parts[0], parts[1])) {
        const now = new Date();
        const m = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        startDateObj = new Date(now.getFullYear(), m - 1, d);
      }
    }

    let endDateObj = null;
    if (options.until) {
      const parts = options.until.split('-');
      if (parts.length === 2 && isValidDate(parts[0], parts[1])) {
        const now = new Date();
        const m = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        endDateObj = new Date(now.getFullYear(), m - 1, d);
      }
    }

    targetDates = getDynamicDates(options.days, startDateObj, endDateObj);
  }

  const dateSpanText = targetDates.length === 1
    ? `${padZero(targetDates[0].month)}-${padZero(targetDates[0].day)}`
    : `${padZero(targetDates[0].month)}-${padZero(targetDates[0].day)} to ${padZero(targetDates[targetDates.length - 1].month)}-${padZero(targetDates[targetDates.length - 1].day)}`;

  console.log(`📅 Date Range: ${dateSpanText} (${targetDates.length} consecutive calendar days)`);
  console.log(`📑 Mode: ${options.split ? 'Individual Event Spotlights (--split)' : 'Combined Daily Top Highlights'}`);

  // 2. Build Job Queue
  const jobs = [];

  for (const { month, day } of targetDates) {
    const mm = padZero(month);
    const dd = padZero(day);
    const dateFormatted = `${mm}-${dd}`;
    const monthName = MONTH_NAMES_EN[month - 1];
    const dateLabel = `${monthName} ${day}${getOrdinalSuffix(day)}`;

    try {
      await ensureEventData(mm, dd);
      const topEvents = await pickTopEvents(mm, dd, options.maxEvents);

      if (options.split) {
        // One standalone video per event
        topEvents.forEach((ev) => {
          const outPath = path.join(options.outDir, `${dateFormatted}-${ev.year}.mp4`);
          if (options.skipExisting && fsSync.existsSync(outPath)) {
            return;
          }
          jobs.push({
            dateFormatted,
            dateLabel,
            events: [ev],
            outputVideoPath: outPath,
            label: `${dateFormatted} • Year ${ev.year}: ${cleanEnglishSentence(ev.text).substring(0, 45)}...`,
          });
        });
      }

      // One combined daily video with top events
      const outPath = path.join(options.outDir, `${dateFormatted}.mp4`);
      if (options.skipExisting && fsSync.existsSync(outPath)) {
        try {
          if (fsSync.statSync(outPath).size > 1000000) continue;
        } catch {}
      }
      jobs.push({
        dateFormatted,
        dateLabel,
        events: topEvents,
        outputVideoPath: outPath,
        label: `${dateFormatted} (${topEvents.length} events)`,
      });
    } catch (err) {
      console.warn(`⚠️ Skipping ${dateFormatted}: ${err.message}`);
    }
  }

  if (jobs.length === 0) {
    console.log(`\n✅ All requested videos already exist or no jobs were scheduled.`);
    return;
  }

  console.log(`\n📋 Queue prepared: ${jobs.length} video(s) ready to render:`);
  if (jobs.length <= 15) {
    jobs.forEach((job, idx) => {
      console.log(`   [${idx + 1}/${jobs.length}] ${job.label}`);
    });
  } else {
    // Truncate list preview for large batches (e.g. 116 days)
    jobs.slice(0, 5).forEach((job, idx) => {
      console.log(`   [${idx + 1}/${jobs.length}] ${job.label}`);
    });
    console.log(`   ... (${jobs.length - 10} additional videos in queue) ...`);
    jobs.slice(-5).forEach((job, idx) => {
      console.log(`   [${jobs.length - 5 + idx + 1}/${jobs.length}] ${job.label}`);
    });
  }

  if (options.dryRun) {
    console.log(`\n🏁 [Dry-Run] Queue verified successfully (${jobs.length} videos). No media was rendered.`);
    return;
  }

  // Step 1: Pre-bundle Remotion once in memory for the whole batch
  console.log(`\n📦 Compiling Remotion bundle once (shared across all jobs)...`);
  const bundleStart = Date.now();
  const entryPoint = path.join(__dirname, '../video/remotion/index.ts');
  const sharedBundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });
  console.log(`✅ Remotion bundled in ${((Date.now() - bundleStart) / 1000).toFixed(1)}s! Starting queue...\n`);

  // Step 2: Render each video sequentially
  const batchStart = Date.now();
  let completedCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const jobStart = Date.now();
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎬 [${i + 1}/${jobs.length}] Rendering: ${job.label}`);

    try {
      const result = await renderVideoJob({
        dateFormatted: job.dateFormatted,
        dateLabel: job.dateLabel,
        events: job.events,
        voice: options.voice,
        outputVideoPath: job.outputVideoPath,
        bundleLocation: sharedBundleLocation,
        onProgress: ({ progress }) => {
          const pct = Math.floor(progress * 100);
          if (pct % 25 === 0) {
            process.stdout.write(`\r   ⏳ Progress: ${pct}%...`);
          }
        },
      });

      const jobDuration = ((Date.now() - jobStart) / 1000).toFixed(1);
      completedCount++;
      console.log(`\n   ✅ Generated in ${jobDuration}s: ${result.outputVideoPath}`);
    } catch (err) {
      console.error(`\n   ❌ Failed to render ${job.label}:`, err.message);
    }
  }

  const totalTime = ((Date.now() - batchStart) / 1000).toFixed(1);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 BATCH RENDER COMPLETE!`);
  console.log(`📊 Successfully generated: ${completedCount}/${jobs.length} video(s)`);
  console.log(`⏱️ Total render time: ${totalTime}s (avg ${(totalTime / Math.max(1, completedCount)).toFixed(1)}s per video)`);
  console.log(`📍 Output Directory for MP4s: ${options.outDir}`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error in batch engine:', err);
  process.exit(1);
});

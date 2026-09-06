import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { padZero } from '../core/extractor.js';
import { generateSpeech } from '../video/tts/generator.js';
import { preloadAndResolveSceneImages } from '../video/utils/image-cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const EVENTS_DIR = path.join(DATA_DIR, 'events');
const CURATED_FILE = path.join(DATA_DIR, 'curated.json');
export const OUTPUT_DIR = path.join(ROOT_DIR, 'output/videos');

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function cleanEnglishSentence(text) {
  if (!text) return '';
  let clean = text.replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  clean = clean.replace(/\s*\([^)]*\)/g, '').trim();
  // Remove technical prefixes like "STS-41-D: "
  clean = clean.replace(/^[\w\-]+:\s*/, '');
  // Prune trailing punctuation
  clean = clean.replace(/[,;:\.\s]+$/, '').trim();
  
  // Cut at first period if multi-sentence
  const firstSentence = clean.split(/\.\s+/)[0].trim();
  return firstSentence;
}

export async function loadDayEvents(mm, dd) {
  const filePath = path.join(EVENTS_DIR, `${mm}-${dd}.json`);
  if (!fsSync.existsSync(filePath)) {
    throw new Error(`No event data found for ${mm}-${dd}. Run first: npm run fetch -- --day=${mm}-${dd}`);
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function pickTopEvents(mm, dd, maxEvents = 3) {
  const dayData = await loadDayEvents(mm, dd);
  const events = dayData.events || [];

  if (events.length === 0) {
    throw new Error(`No events found for date ${mm}-${dd}`);
  }

  const selectedEvents = [];
  const selectedYears = new Set();

  // 1. Check curated.json
  if (fsSync.existsSync(CURATED_FILE)) {
    try {
      const curated = JSON.parse(await fs.readFile(CURATED_FILE, 'utf8'));
      const dayCurated = curated[`${mm}-${dd}`];
      if (dayCurated?.selectedEventIds?.length > 0) {
        for (const id of dayCurated.selectedEventIds) {
          const found = events.find(e => e.id === id);
          if (found && !selectedYears.has(found.year)) {
            selectedEvents.push(found);
            selectedYears.add(found.year);
          }
          if (selectedEvents.length >= maxEvents) break;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Fill with highest marketing score events with images
  if (selectedEvents.length < maxEvents) {
    const withImages = events.filter(e => {
      const hasImg = (e.images && e.images.length > 0) || e.image;
      return hasImg && !selectedYears.has(e.year);
    });
    withImages.sort((a, b) => (b.marketingScore || 0) - (a.marketingScore || 0));

    for (const e of withImages) {
      selectedEvents.push(e);
      selectedYears.add(e.year);
      if (selectedEvents.length >= maxEvents) break;
    }
  }

  // Fallback if still under maxEvents
  if (selectedEvents.length === 0) {
    selectedEvents.push(events[0]);
  }

  return selectedEvents;
}

/**
 * Core function to render a single or multi-event video.
 * Can be called with a shared pre-compiled bundleLocation for high-speed batching.
 */
export async function renderVideoJob({
  dateFormatted,
  dateLabel,
  events,
  voice = 'en-US-ChristopherNeural',
  outputVideoPath,
  bundleLocation = null,
  onProgress = null,
}) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // 1. Build narration text
  const scriptSentences = [];
  scriptSentences.push(`On this day, ${dateLabel}:`);

  events.forEach((ev, idx) => {
    const cleanText = cleanEnglishSentence(ev.text);
    if (idx === 0) {
      scriptSentences.push(`In ${ev.year}: ${cleanText}.`);
    } else if (idx === events.length - 1 && events.length > 1) {
      scriptSentences.push(`And in ${ev.year}: ${cleanText}.`);
    } else {
      scriptSentences.push(`In ${ev.year}: ${cleanText}.`);
    }
  });

  const fullNarrationText = scriptSentences.join(' ');

  // 2. Generate Audio & Captions with Edge-TTS
  const filePrefix = path.basename(outputVideoPath, '.mp4');
  const audioFilePath = path.join(OUTPUT_DIR, `${filePrefix}-audio.mp3`);
  const jsonFilePath = path.join(OUTPUT_DIR, `${filePrefix}-captions.json`);

  const ttsResult = await generateSpeech({
    text: fullNarrationText,
    voice,
    outAudioPath: audioFilePath,
    outJsonPath: jsonFilePath,
    rate: '+5%'
  });

  // 3. Align each historical event with the spoken year timestamp
  const scenes = [];
  const words = ttsResult.words;

  for (const ev of events) {
    const yearStr = String(ev.year);
    const wordIdx = words.findIndex((w) => w.text.includes(yearStr));
    
    const rawImages = ev.images && ev.images.length > 0
      ? ev.images.map(img => ({
          url: img.url,
          thumbnailUrl: img.thumbnailUrl || img.url,
          title: img.title || '',
          description: img.description || ''
        }))
      : ev.image
      ? [{
          url: ev.image.url,
          thumbnailUrl: ev.image.thumbnailUrl || ev.image.url,
          title: ev.image.title || '',
          description: ev.image.description || ''
        }]
      : [];

    const resolvedImages = await preloadAndResolveSceneImages(rawImages);

    scenes.push({
      id: ev.id,
      year: ev.year,
      text: cleanEnglishSentence(ev.text),
      images: resolvedImages,
      spokenWordIdx: wordIdx,
      startMs: 0,
      endMs: 0,
    });
  }

  for (let i = 0; i < scenes.length; i++) {
    if (i === 0) {
      scenes[i].startMs = 0;
    } else {
      const wIdx = scenes[i].spokenWordIdx;
      scenes[i].startMs = wIdx !== -1 && words[wIdx] ? Math.max(0, words[wIdx].startMs - 350) : (ttsResult.durationMs / scenes.length) * i;
    }
  }

  for (let i = 0; i < scenes.length; i++) {
    if (i < scenes.length - 1) {
      scenes[i].endMs = scenes[i + 1].startMs;
    } else {
      scenes[i].endMs = ttsResult.durationMs;
    }
  }

  // 4. Read audio as base64 data URI
  const audioBuffer = await fs.readFile(audioFilePath);
  const audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

  // 5. Build Remotion Props
  const inputProps = {
    dateFormatted,
    dateLabel,
    headline: 'On This Day',
    durationInSeconds: ttsResult.durationSeconds,
    audioSrc: audioBase64,
    scenes,
    captions: words,
  };

  // 6. Bundle if not provided
  let activeBundle = bundleLocation;
  if (!activeBundle) {
    const entryPoint = path.join(__dirname, '../video/remotion/index.ts');
    activeBundle = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    });
  }

  // 7. Select composition and render
  const composition = await selectComposition({
    serveUrl: activeBundle,
    id: 'TikTokShort',
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl: activeBundle,
    codec: 'h264',
    outputLocation: outputVideoPath,
    inputProps,
    onProgress,
  });

  // 8. Generate companion viral TikTok text file
  const txtPath = outputVideoPath.replace(/\.mp4$/i, '.txt');
  const currentYear = new Date().getFullYear();
  const topYear = events[0]?.year || 'history';
  const tiktokHook = `Wait till you see what happened on this day in ${topYear}… 🤯👇`;
  const tiktokItems = events.slice(0, 3).map(ev => {
    const yearsAgo = currentYear - ev.year;
    return `⚡ ${ev.year} (${yearsAgo} yrs ago): ${cleanEnglishSentence(ev.text)}`;
  }).join('\n');
  const tiktokCaption = `${tiktokHook}\n\n${tiktokItems}\n\n💬 Honest question: Where were YOU on this exact day 5 or 10 years ago? Check your camera roll 👀\n\n📲 Relive your own throwback photos every day with Ayer: www.chapiware.com/ayer (100% private, on iOS & Android)\n\n#OnThisDay #HistoryTok #DidYouKnow #Throwback #FeelsLikeYesterday #AyerApp #HistoryBuff #VintageVibes #TodayInHistory #Viral #FYP`;

  const companionContent = `🎬 OnThisAyer TikTok & Shorts Viral Metadata
📅 Date: ${dateLabel} (${dateFormatted})
📍 Video: ${path.basename(outputVideoPath)}
============================================================

📌 TIKTOK & SHORTS CAPTION (READY TO COPY & PASTE):
------------------------------------------------------------
${tiktokCaption}
------------------------------------------------------------

💡 TIKTOK PUBLISHING TIPS:
- Background Sound: Add a trending ambient or lo-fi sound from TikTok's library at 8-12% volume.
- Cover / Thumbnail: Pick the frame showing the most dramatic photo with the year banner.
- Pinned Comment: Post "Which of these events surprised you the most? 👇" and pin it to boost comments.
- Bio Link: Ensure profile has www.chapiware.com/ayer
============================================================\n`;

  await fs.writeFile(txtPath, companionContent, 'utf8');

  return {
    outputVideoPath,
    txtPath,
    tiktokCaption,
    durationSeconds: ttsResult.durationSeconds,
    scenesCount: scenes.length,
    wordsCount: words.length,
    composition,
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    day: null,
    voice: 'en-US-ChristopherNeural',
    out: null,
    maxEvents: 3,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--day=')) params.day = arg.split('=')[1];
    else if (arg.startsWith('--voice=')) params.voice = arg.split('=')[1];
    else if (arg.startsWith('--out=')) params.out = arg.split('=')[1];
    else if (arg.startsWith('--max=')) params.maxEvents = parseInt(arg.split('=')[1], 10);
    else if (arg === '--dry-run') params.dryRun = true;
  }

  return params;
}

async function main() {
  const options = parseArgs();

  let m = new Date().getMonth() + 1;
  let d = new Date().getDate();

  if (options.day) {
    const parts = options.day.split('-');
    if (parts.length === 2) {
      m = parseInt(parts[0], 10);
      d = parseInt(parts[1], 10);
    }
  }

  const mm = padZero(m);
  const dd = padZero(d);
  const dateFormatted = `${mm}-${dd}`;
  const monthName = MONTH_NAMES_EN[m - 1];
  const dateLabel = `${monthName} ${d}${getOrdinalSuffix(d)}`;

  console.log(`🎬 OnThisAyer Video Studio — TikTok & YouTube Shorts (English Edition)`);
  console.log(`📅 Target Date: ${dateFormatted} (${dateLabel})`);

  console.log(`🔍 Selecting top ${options.maxEvents} viral historical events for ${dateFormatted}...`);
  const topEvents = await pickTopEvents(mm, dd, options.maxEvents);
  console.log(`✨ Selected ${topEvents.length} distinct historical events:`);
  topEvents.forEach((ev, idx) => {
    const imgCount = ev.images?.length || (ev.image ? 1 : 0);
    console.log(`   ${idx + 1}. [Year ${ev.year}] (${imgCount} photos) ${cleanEnglishSentence(ev.text).substring(0, 70)}...`);
  });

  const outputVideoPath = options.out || path.join(OUTPUT_DIR, `${dateFormatted}.mp4`);
  
  let lastPercent = -1;
  const result = await renderVideoJob({
    dateFormatted,
    dateLabel,
    events: topEvents,
    voice: options.voice,
    outputVideoPath,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100);
      if (percent !== lastPercent && percent % 10 === 0) {
        lastPercent = percent;
        process.stdout.write(`\r⏳ Progress: ${percent}% completed...`);
      }
    }
  });

  console.log(`\n\n🎉 VIDEO SUCCESSFULLY GENERATED!`);
  console.log(`📍 Video: ${result.outputVideoPath}`);
  console.log(`📄 TikTok Caption File: ${result.txtPath}`);
  console.log(`⏱️ Duration: ~${(result.composition.durationInFrames / 30).toFixed(1)}s (${result.scenesCount} scenes, ${result.wordsCount} words)`);
  console.log(`📐 Format: 1080 × 1920 (9:16 Vertical for TikTok, Shorts & Reels)`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 TikTok Ready-to-Post Caption (Copied to ${path.basename(result.txtPath)}):\n`);
  console.log(result.tiktokCaption);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// Check if running directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('\n❌ Error during video generation:', err);
    process.exit(1);
  });
}

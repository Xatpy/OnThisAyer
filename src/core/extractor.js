import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const EVENTS_DIR = path.join(DATA_DIR, 'events');
const CURATED_FILE = path.join(DATA_DIR, 'curated.json');

const USER_AGENT = 'TalDiaComoHoyBot/1.0 (https://chapiware.com/ayer; contact@chapiware.com)';
const MAX_CANDIDATES_PER_DAY = 10;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isValidDate(month, day) {
  if (month === null || month === undefined || day === null || day === undefined) return false;
  if (typeof month === 'string' && !/^\d+$/.test(month.trim())) return false;
  if (typeof day === 'string' && !/^\d+$/.test(day.trim())) return false;

  const m = Number(month);
  const d = Number(day);

  if (!Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > DAYS_IN_MONTH[m - 1]) return false;
  return true;
}

export function padZero(num) {
  return String(num).padStart(2, '0');
}

export function createDeterministicEventId(mm, dd, year, text = '') {
  const normalizedText = String(text).trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(`${mm}-${dd}-${year}-${normalizedText}`).digest('hex').substring(0, 8);
  return `${mm}-${dd}-${year}-${hash}`;
}

let curatedWriteQueue = Promise.resolve();

async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

export function getImageCanonicalKey(urlOrTitle) {
  if (!urlOrTitle) return '';
  try {
    let clean = decodeURIComponent(urlOrTitle).toLowerCase();
    clean = clean.split('?')[0];
    clean = clean.replace(/^file:/i, '');
    const parts = clean.split('/');
    let filename = parts[parts.length - 1];
    filename = filename.replace(/^\d+px-/, '');
    return filename.trim();
  } catch {
    return urlOrTitle.toLowerCase().trim();
  }
}

const HIGH_IMPACT_KEYWORDS = [
  'iphone', 'apple', 'steve jobs', 'steve wozniak', 'macintosh', 'ipod', 'ipad',
  'microsoft', 'windows 95', 'windows', 'bill gates', 'google', 'youtube', 'facebook', 'instagram', 'twitter',
  'playstation', 'nintendo', 'game boy', 'super mario', 'pokemon', 'sega', 'atari', 'xbox', 'gta', 'grand theft auto',
  'apollo 11', 'moon landing', 'mars rover', 'curiosity', 'hubble', 'voyager', 'concorde', 'first flight',
  'star wars', 'jurassic park', 'harry potter', 'lord of the rings', 'titanic', 'avatar', 'matrix',
  'marvel', 'avengers', 'batman', 'superman', 'disney', 'pixar', 'lion king', 'toy story',
  'game of thrones', 'breaking bad', 'friends', 'the simpsons', 'stranger things', 'academy award', 'oscar', 'cannes',
  'michael jackson', 'the beatles', 'queen', 'freddie mercury', 'elvis', 'nirvana', 'kurt cobain',
  'madonna', 'david bowie', 'rolling stones', 'pink floyd', 'led zeppelin', 'woodstock', 'live aid', 'mtv',
  'taylor swift', 'eminem', 'daft punk', 'rosalia', 'grammy', 'thriller',
  'world cup', 'mundial', 'fifa', 'olympic', 'juegos olimpicos', 'gold medal',
  'michael jordan', 'nba', 'chicago bulls', 'kobe bryant', 'lebron', 'super bowl',
  'messi', 'cristiano ronaldo', 'maradona', 'pele', 'real madrid', 'barcelona',
  'rafael nadal', 'roger federer', 'fernando alonso', 'formula 1', 'f1', 'tour de france',
  'berlin wall', 'fall of the berlin wall', 'eiffel tower', 'statue of liberty'
];

const MEGA_HISTORICAL_KEYWORDS = [
  'september 11 attacks', 'world trade center', 'twin towers',
  'pearl harbor', 'd-day', 'normandy landings', 'operation overlord', 'hiroshima', 'nagasaki', 'atomic bomb',
  'holocaust', 'auschwitz', 'fall of the berlin wall',
  'assassination of john f. kennedy', 'john f. kennedy', 'jfk', 'we choose to go to the moon',
  'assassination of martin luther king', 'assassination of abraham lincoln', 'assassination of archduke',
  'chernobyl disaster', 'chernobyl', 'sinking of the titanic', 'challenger disaster',
  'apollo 11', 'moon landing', 'first man on the moon', 'first man in space', 'yuri gagarin', 'sputnik'
];

const HIGH_IMPACT_HISTORICAL_KEYWORDS = [
  // Terrorism & conflicts
  '9/11 attacks', 'al-qaeda', 'al qaeda', 'terrorist attack', 'terrorism', 'pentagon attack',
  // World Wars & major conflicts
  'world war', 'nuclear bomb', 'genocide', 'vietnam war', 'cold war',
  'cuban missile crisis', 'korean war', 'falklands war', 'gulf war',
  'invasion of iraq', 'invasion of poland',
  // Historic assassinations & leaders
  'assassination of', 'assassinated', 'martin luther king', 'steve biko',
  'abraham lincoln', 'mahatma gandhi', 'nelson mandela', 'apartheid',
  // Major disasters
  'fukushima', 'hindenburg', 'columbia disaster',
  'titanic sank', 'bhopal disaster', 'deepwater horizon', 'hurricane katrina',
  // Pandemics
  'covid-19', 'coronavirus pandemic', 'spanish flu',
  // Civil rights & political transformation
  'civil rights act', 'suffrage', 'emancipation', 'abolition of slavery', 'rosa parks',
  // Political upheavals
  'fall of the soviet union', 'dissolution of the soviet',
  'cuban revolution', 'french revolution', 'russian revolution',
  'tiananmen square', 'arab spring',
  // Foundations
  'declaration of independence', 'un charter', 'universal declaration of human rights',
  // Scientific breakthroughs
  'penicillin', 'theory of relativity', 'albert einstein',
  'double helix', 'human genome', 'first heart transplant',
  // Culture & Tech Game Changers
  'steam', 'release of steam', 'valve'
];

const LOW_IMPACT_NOISE = [
  'treaty of', 'decree', 'synod', 'bishop', 'diocese', 'parliament passes', 'act of parliament',
  'referendum on', 'tax on', 'tariffs', 'clashes between', 'district', 'municipality', 'commune',
  'railway line opens', 'canal opens between', 'archbishop', 'cardinal', 'coronation of king',
  'sovereign', 'consecrated', 'annexed by', 'charter of', 'treaty signed', 'prefecture',
  'riots erupt in', 'ethnic violence in', 'local council', 'provincial assembly', 'papal bull',
  'census', 'electoral college', 'appointed governor',
  // Routine space & satellite noise
  'resupply the international space station', 'is launched to resupply', 'cargo spacecraft',
  'communications satellite', 'weather satellite', 'reconnaissance satellite', 'spy satellite',
  'navigation satellite', 'satellite is launched', 'satellites are launched',
  'uncrewed spaceflight', 'suborbital', 'penultimate mission'
];

export function categorizeEvent(text, pages = []) {
  const fullText = (text + ' ' + pages.map(p => ((p.titles?.normalized || p.title || '') + ' ' + (p.description || '') + ' ' + (p.extract || '')).replace(/_/g, ' ')).join(' ')).toLowerCase();
  
  if (/(september 11|world trade center|twin towers|terroris|al-qaeda|al qaeda|president|king|queen|treaty|independence|revolution|war |battle|peace|constitution|parliament|election|empire|monarch|berlin wall|holocaust|auschwitz|pearl harbor|d-day|assassin|soviet|kennedy|jfk)/i.test(fullText)) {
    return { id: 'history', name: 'Historia y Mundo', icon: '🏛️' };
  }
  if (/(space|nasa|astronom|moon|mars|planet|satellite|rocket|telescope|physic|chemist|biolog|medic|invent|patent|comput|software|apple|microsoft|google|internet|web|ai |robot|aviation|flight|plane|ipod|iphone|nintendo|playstation)/i.test(fullText)) {
    return { id: 'science_tech', name: 'Ciencia y Tecnología', icon: '🚀' };
  }
  if (/(film|movie|premiere|cinema|oscar|actor|actress|director|hollywood|series|television|broadcast|disney|theatre|cartoon|anime|box office|star wars|marvel)/i.test(fullText)) {
    return { id: 'cinema_tv', name: 'Cine y TV', icon: '🎬' };
  }
  if (/(music|album|song|singer|band|concert|grammy|guitar|rock|jazz|pop |opera|symphony|composer|festival|woodstock|mtv|beatles|queen|michael jackson)/i.test(fullText)) {
    return { id: 'music_art', name: 'Música y Arte', icon: '🎵' };
  }
  if (/(olympic|world cup|fifa|championship|tournament|football|soccer|basketball|tennis|medal|racing|athlete|nba|formula|grand prix|super bowl|jordan|nadal)/i.test(fullText)) {
    return { id: 'sports', name: 'Deportes', icon: '🏆' };
  }
  if (/(archaeolog|monument|painting|sculpture|novel|book|author|writer|literature|nobel|poetry|museum)/i.test(fullText)) {
    return { id: 'culture', name: 'Cultura y Letras', icon: '📚' };
  }
  return { id: 'general', name: 'Hito Histórico', icon: '✨' };
}

export const SENSITIVE_CONTENT_REGEX = /\b(nude|nudity|naked|shirtless|topless|sensual|erotic|erotica|sexual|sexy|lingerie|underwear|bikini|swimsuit|playboy|penthouse|hustler|porn|pornograph|coitus|intercourse|kissing|genital|breasts|penis|vagina|fetish|bdsm|incest|adultery|rape|assault|child abuse|pedophil|prostitut)\b|u2_songs_of_innocence/i;

export function isSensitiveContent(text, images = []) {
  if (SENSITIVE_CONTENT_REGEX.test(text || '')) return true;
  for (const img of images) {
    const str = [img.url, img.title, img.description, img.canonicalKey].filter(Boolean).join(' ');
    if (SENSITIVE_CONTENT_REGEX.test(str)) return true;
  }
  return false;
}

function scoreImage(url, pageTitle = '', pageDesc = '') {
  if (!url) return 0;
  const lower = (url + ' ' + pageTitle + ' ' + pageDesc).toLowerCase();

  // Strict NSFW / Sensual / Sexual filter to protect social media accounts
  if (SENSITIVE_CONTENT_REGEX.test(lower)) {
    return 0;
  }
  
  if (lower.includes('flag_of_') || lower.includes('coat_of_arms') || lower.includes('insignia') || 
      lower.includes('symbol') || lower.includes('logo_') || lower.includes('seal_of') ||
      lower.includes('emblem') || lower.includes('.svg')) {
    return 0;
  }
  if (lower.includes('map') || lower.includes('locator') || lower.includes('district') || 
      lower.includes('location') || lower.includes('chart') || lower.includes('diagram')) {
    return 1;
  }
  if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.webp') || lower.includes('.png')) {
    return 10;
  }
  return 3;
}

export function calculateMarketingScore(eventText, pages = [], year = 2000, maxImageScore = 0, isFeatured = false) {
  if (maxImageScore < 4) return 0;

  let score = 20;
  const fullText = (eventText + ' ' + pages.map(p => ((p.titles?.normalized || p.title || '') + ' ' + (p.description || '') + ' ' + (p.extract || '')).replace(/_/g, ' ')).join(' ')).toLowerCase();

  if (year >= 1975) score += 30;
  else if (year >= 1950) score += 20;
  else if (year >= 1900) score += 10;
  else score -= 15;

  if (isFeatured) {
    score += 20;
  }

  let matchedMega = false;
  for (const kw of MEGA_HISTORICAL_KEYWORDS) {
    if (fullText.includes(kw)) {
      score += 75;
      matchedMega = true;
      break;
    }
  }

  // Mega historical events of the 20th century (1900-1974) shouldn't be penalized against modern routine events
  if (matchedMega && year >= 1900 && year < 1975) {
    score += (30 - (year >= 1950 ? 20 : 10));
  }

  let matchedHistorical = false;
  if (!matchedMega) {
    for (const kw of HIGH_IMPACT_HISTORICAL_KEYWORDS) {
      if (fullText.includes(kw)) {
        score += 55;
        matchedHistorical = true;
        break;
      }
    }
  }

  let matchedPop = false;
  if (!matchedMega && !matchedHistorical) {
    for (const kw of HIGH_IMPACT_KEYWORDS) {
      if (fullText.includes(kw)) {
        score += 45;
        matchedPop = true;
        break;
      }
    }
  }

  if (matchedMega || matchedHistorical || matchedPop || /(cinema|movie|film|album|song|singer|band|actor|apple|game|nintendo|playstation|olympic|world cup|nba|f1|beatles|queen|quarrymen|world war|terroris|tragedy|disaster|revolution|assassin)/i.test(fullText)) {
    score += 20;
  }

  // Routine space shuttle flight noise (STS missions without disaster)
  if (/\bspace shuttle\b.*\bsts-\d+\b/i.test(fullText) && !/\b(disaster|fatal|exploded|destroyed|challenger|columbia)\b/i.test(fullText)) {
    score -= 40;
  }

  for (const noise of LOW_IMPACT_NOISE) {
    if (fullText.includes(noise)) {
      score -= 40;
      break;
    }
  }

  if (maxImageScore >= 10) score += 15;

  return Math.max(0, score);
}

async function fetchPageMediaList(title) {
  if (!title) return [];
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return [];
    const data = await res.json();
    const photos = [];
    
    for (const item of (data.items || [])) {
      if (item.type !== 'image' || item.section_id > 2) continue;
      const titleLower = item.title?.toLowerCase() || '';
      if (!titleLower.endsWith('.jpg') && !titleLower.endsWith('.jpeg') && !titleLower.endsWith('.png') && !titleLower.endsWith('.webp')) continue;
      if (titleLower.includes('icon') || titleLower.includes('flag') || titleLower.includes('logo') || titleLower.includes('map') || titleLower.includes('diagram') || titleLower.includes('coat_of_arms')) continue;
      
      const bestSrc = item.srcset?.[item.srcset.length - 1]?.src || item.srcset?.[0]?.src;
      if (bestSrc) {
        const fullUrl = bestSrc.startsWith('//') ? `https:${bestSrc}` : bestSrc;
        photos.push({
          url: fullUrl,
          thumbnailUrl: fullUrl,
          rawTitle: item.title,
          title: item.caption?.text || item.title?.replace('File:', '').replace(/\.[^/.]+$/, '') || title,
          score: 8
        });
      }
      if (photos.length >= 5) break;
    }
    return photos;
  } catch {
    return [];
  }
}

export async function fetchWikipediaDay(month, day) {
  const mm = padZero(month);
  const dd = padZero(day);
  const urlEvents = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
  const urlSelected = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`;

  const headers = { 'User-Agent': USER_AGENT };

  const [resEvents, resSelected] = await Promise.all([
    fetch(urlEvents, { headers }).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
    fetch(urlSelected, { headers }).then(r => r.ok ? r.json() : { selected: [] }).catch(() => ({ selected: [] }))
  ]);

  const allRawEvents = [
    ...(resSelected.selected || []).map(e => ({ ...e, isFeatured: true })),
    ...(resEvents.events || []).map(e => ({ ...e, isFeatured: false }))
  ];

  const eventsByYear = new Map();

  for (const item of allRawEvents) {
    if (!item.year || !item.text) continue;
    if (SENSITIVE_CONTENT_REGEX.test(item.text)) continue;
    
    const pages = item.pages || [];
    const collectedImages = [];
    const seenImageKeys = new Set();
    let maxImgScore = 0;
    let mainPage = null;

    for (const page of pages) {
      if (!mainPage) mainPage = page;
      const thumb = page.thumbnail?.source;
      const orig = page.originalimage?.source;
      const candidate = orig || thumb;

      if (candidate) {
        const canonicalKey = getImageCanonicalKey(candidate) || getImageCanonicalKey(page.title);
        if (!seenImageKeys.has(canonicalKey)) {
          const score = scoreImage(candidate, page.title, page.description);
          if (score >= 4) {
            seenImageKeys.add(canonicalKey);
            if (score > maxImgScore) maxImgScore = score;
            collectedImages.push({
              url: orig || thumb,
              thumbnailUrl: thumb || orig,
              canonicalKey,
              width: page.originalimage?.width || page.thumbnail?.width || 800,
              height: page.originalimage?.height || page.thumbnail?.height || 600,
              title: page.titles?.normalized || page.title,
              description: page.description || '',
              extract: page.extract || '',
              wikiUrl: page.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
              score
            });
          }
        }
      }
      if (collectedImages.length >= 3) break;
    }

    if (collectedImages.length === 0 || maxImgScore < 4) continue;

    const category = categorizeEvent(item.text, pages);
    const marketingScore = calculateMarketingScore(item.text, pages, item.year, maxImgScore, !!item.isFeatured);

    if (marketingScore < 20) continue;

    const eventObj = {
      id: createDeterministicEventId(mm, dd, item.year, item.text),
      year: item.year,
      text: item.text,
      isFeatured: !!item.isFeatured,
      hasImage: true,
      imagesCount: collectedImages.length,
      imageScore: maxImgScore,
      marketingScore,
      image: collectedImages[0],
      images: collectedImages,
      category,
      mainPageTitle: mainPage?.titles?.normalized || mainPage?.title || null,
      mainPageUrl: mainPage?.content_urls?.desktop?.page || null,
      relatedPagesCount: pages.length
    };

    const existing = eventsByYear.get(item.year);
    if (!existing || eventObj.marketingScore > existing.marketingScore) {
      eventsByYear.set(item.year, eventObj);
    }
  }

  const sortedUniqueYearEvents = Array.from(eventsByYear.values()).sort((a, b) => {
    if (b.marketingScore !== a.marketingScore) {
      return b.marketingScore - a.marketingScore;
    }
    return b.year - a.year;
  });

  const top10Events = sortedUniqueYearEvents.slice(0, MAX_CANDIDATES_PER_DAY);

  for (const ev of top10Events) {
    if (ev.images.length < 3 && ev.mainPageTitle) {
      const extraPhotos = await fetchPageMediaList(ev.mainPageTitle);
      const seenKeys = new Set(ev.images.map(img => img.canonicalKey || getImageCanonicalKey(img.url)));

      for (const extra of extraPhotos) {
        if (ev.images.length >= 3) break;
        const extraKey = getImageCanonicalKey(extra.rawTitle) || getImageCanonicalKey(extra.url);
        
        if (extraKey && !seenKeys.has(extraKey)) {
          seenKeys.add(extraKey);
          ev.images.push({
            url: extra.url,
            thumbnailUrl: extra.thumbnailUrl,
            canonicalKey: extraKey,
            width: 800,
            height: 600,
            title: extra.title || ev.mainPageTitle,
            description: '',
            extract: '',
            wikiUrl: ev.mainPageUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(ev.mainPageTitle)}`,
            score: extra.score
          });
        }
      }
      ev.imagesCount = ev.images.length;
    }
  }

  return {
    date: {
      month: parseInt(month, 10),
      day: parseInt(day, 10),
      formatted: `${mm}-${dd}`
    },
    totalEvents: top10Events.length,
    eventsWithImages: top10Events.length,
    events: top10Events
  };
}

export async function saveDayEvents(month, day, data) {
  const mm = padZero(month);
  const dd = padZero(day);
  await fs.mkdir(EVENTS_DIR, { recursive: true });
  const filePath = path.join(EVENTS_DIR, `${mm}-${dd}.json`);
  await writeJsonAtomic(filePath, data);
  return filePath;
}

export async function getDayEvents(month, day, forceRefresh = false) {
  if (!isValidDate(month, day)) {
    throw new Error(`Invalid date: month ${month}, day ${day}`);
  }

  const mm = padZero(month);
  const dd = padZero(day);
  const filePath = path.join(EVENTS_DIR, `${mm}-${dd}.json`);

  if (!forceRefresh) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
        // Ensure all events in cache have deterministic IDs
        let updated = false;
        for (const ev of parsed.events) {
          const expectedId = createDeterministicEventId(mm, dd, ev.year, ev.text);
          if (ev.id !== expectedId) {
            ev.id = expectedId;
            updated = true;
          }
        }
        if (updated) {
          await writeJsonAtomic(filePath, parsed);
        }
        return parsed;
      }
    } catch {
      // Not cached
    }
  }

  const data = await fetchWikipediaDay(month, day);
  if (data.events && data.events.length > 0) {
    await saveDayEvents(month, day, data);
  }
  return data;
}

export async function getCuratedStore() {
  try {
    const content = await fs.readFile(CURATED_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function saveCuratedDay(month, day, selectedEventIds = [], customNotes = '') {
  if (!isValidDate(month, day)) {
    return Promise.reject(new Error(`Invalid date: month ${month}, day ${day}`));
  }

  const task = curatedWriteQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const store = await getCuratedStore();
    const dateKey = `${padZero(month)}-${padZero(day)}`;
    store[dateKey] = {
      date: dateKey,
      updatedAt: new Date().toISOString(),
      selectedEventIds: Array.isArray(selectedEventIds) ? selectedEventIds.slice(0, 3) : [],
      customNotes: customNotes || ''
    };
    await writeJsonAtomic(CURATED_FILE, store);
    return store[dateKey];
  });

  curatedWriteQueue = task.catch(() => {});
  return task;
}

export function selectBest3MarketingEvents(events = []) {
  if (!events || events.length === 0) return [];
  const sorted = [...events].sort((a, b) => b.marketingScore - a.marketingScore);

  const selected = [];
  const usedDecades = new Set();

  for (const item of sorted) {
    if (selected.length >= 3) break;
    const decade = Math.floor(item.year / 10) * 10;

    if (!usedDecades.has(decade) || selected.length >= sorted.length - 1) {
      selected.push(item.id);
      usedDecades.add(decade);
    }
  }

  if (selected.length < 3) {
    for (const item of sorted) {
      if (selected.length >= 3) break;
      if (!selected.includes(item.id)) selected.push(item.id);
    }
  }

  return selected;
}

export async function migrateCachedData() {
  const eventFiles = await fs.readdir(EVENTS_DIR).catch(() => []);
  const oldToNewMap = new Map();

  for (const file of eventFiles) {
    if (!file.endsWith('.json')) continue;
    const [mm, dd] = file.replace('.json', '').split('-');
    const filePath = path.join(EVENTS_DIR, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data.events)) {
        let changed = false;
        for (const ev of data.events) {
          const expectedId = createDeterministicEventId(mm, dd, ev.year, ev.text);
          if (ev.id !== expectedId) {
            oldToNewMap.set(ev.id, expectedId);
            // Map by year too in case old ID year matched
            oldToNewMap.set(`${mm}-${dd}-${ev.year}`, expectedId);
            ev.id = expectedId;
            changed = true;
          }
        }
        if (changed) {
          await writeJsonAtomic(filePath, data);
        }
      }
    } catch {}
  }

  // Migrate curated.json
  try {
    const curStore = await getCuratedStore();
    let curChanged = false;
    for (const [dateKey, entry] of Object.entries(curStore)) {
      if (Array.isArray(entry.selectedEventIds)) {
        const [mm, dd] = dateKey.split('-');
        const filePath = path.join(EVENTS_DIR, `${mm}-${dd}.json`);
        let dayEvents = [];
        try {
          const c = await fs.readFile(filePath, 'utf-8');
          dayEvents = JSON.parse(c).events || [];
        } catch {}

        const newIds = entry.selectedEventIds.map(oldId => {
          if (oldToNewMap.has(oldId)) return oldToNewMap.get(oldId);
          // Try matching by year
          const parts = oldId.split('-');
          const year = parts[2];
          const matched = dayEvents.find(e => String(e.year) === year);
          if (matched) return matched.id;
          return oldId;
        });

        if (JSON.stringify(newIds) !== JSON.stringify(entry.selectedEventIds)) {
          entry.selectedEventIds = newIds;
          curChanged = true;
        }
      }
    }
    if (curChanged) {
      await writeJsonAtomic(CURATED_FILE, curStore);
    }
  } catch {}
}

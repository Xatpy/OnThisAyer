import { padZero } from './extractor.js';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const DANGLING_WORDS = new Set([
  'and', 'or', 'by', 'with', 'in', 'at', 'of', 'for', 'to', 'from', 'on', 'the', 'a', 'an',
  'after', 'before', 'as', 'that', 'which', 'during', 'into', 'over', 'under', 'between',
  'about', 'through', 'against', 'including', 'until', 'without', 'upon', 'within', 'whose',
  'its', 'their', 'his', 'her', 'this', 'these', 'those', 'such', 'first', 'second', 'weekly', 'daily'
]);

export function stripTrailingWords(str) {
  if (!str) return '';
  let res = str.trim();
  let changed = true;
  while (changed && res.length > 0) {
    changed = false;
    const strippedPunct = res.replace(/[,;:\-—–\(\)\[\]\.\s]+$/, '').trim();
    if (strippedPunct !== res) {
      res = strippedPunct;
      changed = true;
    }
    // Check compound phrases
    const compoundMatch = res.match(/\s+\b(?:the first of|a series of|the start of|a group of)\b$/i);
    if (compoundMatch) {
      res = res.substring(0, compoundMatch.index).trim();
      changed = true;
    }
    const lastWordMatch = res.match(/\s+([a-zA-Z]+)$/);
    if (lastWordMatch && DANGLING_WORDS.has(lastWordMatch[1].toLowerCase())) {
      res = res.substring(0, lastWordMatch.index).trim();
      changed = true;
    }
  }
  return res;
}

function cleanEventSentence(text, maxChars = 85) {
  if (!text) return '';
  let clean = stripHtml(text);
  clean = clean.replace(/\s*\([^)]*\)/g, '').trim();
  if (clean.endsWith('.')) clean = clean.slice(0, -1);
  
  if (clean.length <= maxChars) {
    return stripTrailingWords(clean);
  }

  // 1. Remove subordinate clauses
  const prunedSubordinate = clean.replace(/,?\s*\b(?:killing|leaving|causing|resulting in|which resulted in|which killed|injuring|by setting|by breaking)\b.*/i, '').trim();
  if (prunedSubordinate.length <= maxChars && prunedSubordinate.length >= 20) {
    return stripTrailingWords(prunedSubordinate);
  }

  // 2. Remove secondary attribution clauses
  const prunedAttribution = clean.replace(/,?\s*\b(?:by|with|under the direction of)\s+[A-Z][a-z]+.*/i, '').trim();
  if (prunedAttribution.length <= maxChars && prunedAttribution.length >= 20) {
    return stripTrailingWords(prunedAttribution);
  }

  // 3. Remove appositives
  const prunedAppositive = clean.replace(/,\s*(?:the|an?|one of the|a former)\s+[^,]+,\s*/i, ' ').trim();
  if (prunedAppositive.length <= maxChars && prunedAppositive.length >= 20) {
    return stripTrailingWords(prunedAppositive);
  }

  // 4. Remove heavy purpose / policy clauses (e.g. for the legalisation of...)
  const prunedPurpose = clean.replace(/,?\s*\bfor (?:the )?(?:legalisation|purpose|creation|celebration|establishment|defense|support)\b.*/i, '').trim();
  if (prunedPurpose.length <= maxChars && prunedPurpose.length >= 20) {
    return stripTrailingWords(prunedPurpose);
  }

  // 5. Cut at primary punctuation
  const parts = clean.split(/[;—:]|\.\s+(?=[A-Z])/);
  if (parts.length > 1 && parts[0].length >= 25 && parts[0].length <= maxChars) {
    return stripTrailingWords(parts[0].trim());
  }

  // 6. Cut at comma
  const commaParts = clean.split(',');
  if (commaParts.length > 1 && commaParts[0].length >= 25 && commaParts[0].length <= maxChars) {
    return stripTrailingWords(commaParts[0].trim());
  }

  // Fallback: word boundary cut
  const words = clean.split(' ');
  let result = '';
  for (const w of words) {
    if ((result + ' ' + w).trim().length <= maxChars) {
      result = (result + ' ' + w).trim();
    } else {
      break;
    }
  }
  return stripTrailingWords(result || clean.substring(0, maxChars));
}

export function generateSocialCopy(month, day, selectedEvents = [], lang = 'en') {
  const currentYear = new Date().getFullYear();
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const monthNameEn = MONTH_NAMES_EN[m - 1] || 'Date';
  const monthNameEs = MONTH_NAMES_ES[m - 1] || 'Fecha';

  if (!selectedEvents || selectedEvents.length === 0) {
    return {
      twitter: '',
      instagram: '',
      threads: ''
    };
  }

  const eventSummaries = selectedEvents.map(e => {
    const yearsAgo = currentYear - e.year;
    return {
      year: e.year,
      yearsAgo,
      icon: e.category?.icon || '✨',
      rawText: stripHtml(e.text)
    };
  });

  if (lang === 'es') {
    return generateSpanishCopy(d, monthNameEs, eventSummaries);
  } else {
    return generateEnglishCopy(d, monthNameEn, eventSummaries);
  }
}

function generateEnglishCopy(day, monthName, events) {
  const header = `On this day (${monthName} ${day}) 👇\n\n`;

  const availableSpace = 280 - header.length - (events.length * 6);
  const perEventMax = Math.floor(availableSpace / Math.max(1, events.length));

  const twitterLines = events.map(ev => {
    const completeHeadline = cleanEventSentence(ev.rawText, perEventMax);
    return `${ev.icon} ${ev.year}: ${completeHeadline}`;
  }).join('\n\n');

  let twitter = `${header}${twitterLines}`;

  if (twitter.length > 280) {
    const tighterLines = events.map(ev => {
      const shorter = cleanEventSentence(ev.rawText, perEventMax - 10);
      return `${ev.icon} ${ev.year}: ${shorter}`;
    }).join('\n\n');
    twitter = `${header}${tighterLines}`;
  }

  const hashtags = [
    '#OnThisDay',
    '#Throwback',
    '#PhotoMemories',
    '#Nostalgia',
    '#AyerApp',
    '#History',
    '#FeelsLikeYesterday',
    '#ThenAndNow'
  ].join(' ');

  const instaLines = events.map(ev => {
    const fullTextClean = ev.rawText.replace(/\s*\([^)]*\)/g, '').trim();
    return `🔹 ${ev.year} (${ev.yearsAgo} years ago)\n${ev.icon} ${fullTextClean}`;
  }).join('\n\n');

  const instagram = `Feels like yesterday... ✨📸

Here is what happened on ${monthName} ${day} across the years:

${instaLines}

---
💬 What were YOU doing on this exact day 5 or 10 years ago?

Rediscover your past right on your device with Ayer. 100% private, no cloud, no signups 🔒

👉 Free download link in bio.

${hashtags}`;

  const threads = `On this day (${monthName} ${day}) throughout the years:\n\n${events.map(ev => `${ev.icon} ${ev.year}: ${cleanEventSentence(ev.rawText, 100)}`).join('\n\n')}\n\nWhat photos do you have from this day? Check Ayer App 📲`;

  return {
    twitter,
    instagram,
    threads,
    twitterLength: twitter.length
  };
}

function generateSpanishCopy(day, monthName, events) {
  const header = `Tal día como hoy (${day} de ${monthName}) 👇\n\n`;

  const availableSpace = 280 - header.length - (events.length * 6);
  const perEventMax = Math.floor(availableSpace / Math.max(1, events.length));

  const twitterLines = events.map(ev => {
    const completeHeadline = cleanEventSentence(ev.rawText, perEventMax);
    return `${ev.icon} ${ev.year}: ${completeHeadline}`;
  }).join('\n\n');

  let twitter = `${header}${twitterLines}`;

  if (twitter.length > 280) {
    const tighterLines = events.map(ev => {
      const shorter = cleanEventSentence(ev.rawText, perEventMax - 10);
      return `${ev.icon} ${ev.year}: ${shorter}`;
    }).join('\n\n');
    twitter = `${header}${tighterLines}`;
  }

  const hashtags = [
    '#TalDiaComoHoy',
    '#OnThisDay',
    '#Efemerides',
    '#Recuerdos',
    '#Nostalgia',
    '#AyerApp',
    '#Historia',
    '#FeelsLikeYesterday',
    '#Throwback'
  ].join(' ');

  const instaLines = events.map(ev => {
    const fullTextClean = ev.rawText.replace(/\s*\([^)]*\)/g, '').trim();
    return `🔹 ${ev.year} (hace ${ev.yearsAgo} años)\n${ev.icon} ${fullTextClean}`;
  }).join('\n\n');

  const instagram = `Un día como hoy pero en años pasados... ✨📸

Desliza para ver lo que estaba pasando un ${day} de ${monthName} en la historia:

${instaLines}

---
💬 ¿Y tú qué estabas haciendo exactamente este mismo día hace 5, 10 o 15 años?

Abre tu galería en Ayer App y revive tus propias fotos de hoy a lo largo de los años. 100% privado y sin nube 🔒

👉 Enlace de descarga gratis en la bio.

${hashtags}`;

  const threads = `Tal día como hoy (${day} de ${monthName}) a lo largo de los años:\n\n${events.map(ev => `${ev.icon} ${ev.year}: ${cleanEventSentence(ev.rawText, 100)}`).join('\n\n')}\n\n¿Qué fotos tienes tú de este mismo día? Míralo en Ayer App 📲`;

  return {
    twitter,
    instagram,
    threads,
    twitterLength: twitter.length
  };
}

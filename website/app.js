// OnThisAyer - Public Engine

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Today reference
const now = new Date();
const TODAY_MONTH = now.getMonth() + 1;
const TODAY_DAY = now.getDate();
const TODAY_YEAR = now.getFullYear();

// App State
const state = {
  currentMonth: TODAY_MONTH,
  currentDay: TODAY_DAY,
  events: []
};

// DOM Elements
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const datePickerTrigger = document.getElementById('datePickerTrigger');
const activeDateDisplay = document.getElementById('activeDateDisplay');
const heroDateBadge = document.getElementById('heroDateBadge');
const heroHeading = document.getElementById('heroHeading');
const storiesList = document.getElementById('storiesList');
const storiesCountBadge = document.getElementById('storiesCountBadge');
const ayerMockupFrame = document.getElementById('ayerMockupFrame');

const shareTwitterBtn = document.getElementById('shareTwitterBtn');
const shareInstagramBtn = document.getElementById('shareInstagramBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');

const calendarModal = document.getElementById('calendarModal');
const closeCalModalBtn = document.getElementById('closeCalModalBtn');
const monthsGrid = document.getElementById('monthsGrid');
const currentYearSpan = document.getElementById('currentYear');

const instagramModal = document.getElementById('instagramModal');
const closeInstaModalBtn = document.getElementById('closeInstaModalBtn');
const instaCaptionText = document.getElementById('instaCaptionText');
const copyInstaCaptionModalBtn = document.getElementById('copyInstaCaptionModalBtn');

function isFutureDate(month, day) {
  if (month > TODAY_MONTH) return true;
  if (month === TODAY_MONTH && day > TODAY_DAY) return true;
  return false;
}

function isToday(month, day) {
  return month === TODAY_MONTH && day === TODAY_DAY;
}

function init() {
  currentYearSpan.textContent = TODAY_YEAR;
  
  parseUrlDate();
  setupEventListeners();
  renderCalendarModalGrid();
  loadDate(state.currentMonth, state.currentDay);
}

function parseUrlDate() {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get('date');
  if (dateParam && dateParam.includes('-')) {
    const [m, d] = dateParam.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      if (isFutureDate(m, d)) {
        // Fallback to today if future date requested in URL
        state.currentMonth = TODAY_MONTH;
        state.currentDay = TODAY_DAY;
      } else {
        state.currentMonth = m;
        state.currentDay = d;
      }
    }
  }
}

function updateUrlDate() {
  const mm = padZero(state.currentMonth);
  const dd = padZero(state.currentDay);
  const newUrl = `${window.location.pathname}?date=${mm}-${dd}`;
  window.history.replaceState({ month: state.currentMonth, day: state.currentDay }, '', newUrl);
}

function updateNavButtons() {
  if (isToday(state.currentMonth, state.currentDay)) {
    nextDayBtn.disabled = true;
    nextDayBtn.classList.add('disabled');
    nextDayBtn.title = "Future dates are locked until they arrive!";
  } else {
    nextDayBtn.disabled = false;
    nextDayBtn.classList.remove('disabled');
    nextDayBtn.title = "Next Day";
  }
}

function setupEventListeners() {
  prevDayBtn.addEventListener('click', () => changeDay(-1));
  nextDayBtn.addEventListener('click', () => {
    if (!nextDayBtn.disabled) changeDay(1);
  });

  datePickerTrigger.addEventListener('click', () => {
    calendarModal.classList.remove('hidden');
  });

  closeCalModalBtn.addEventListener('click', () => {
    calendarModal.classList.add('hidden');
  });

  calendarModal.addEventListener('click', (e) => {
    if (e.target === calendarModal) calendarModal.classList.add('hidden');
  });

  // Twitter Share
  shareTwitterBtn.addEventListener('click', () => {
    const mName = MONTH_NAMES_EN[state.currentMonth - 1];
    const tweetText = `What happened OnThisAyer (${mName} ${state.currentDay}) in history? Check out these memories with @AyerApp 👇`;
    const tweetUrl = window.location.href;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(tweetUrl)}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  });

  // Instagram Caption Copy & Modal
  shareInstagramBtn.addEventListener('click', () => {
    const caption = buildInstagramCaption(state.currentMonth, state.currentDay, state.events);
    instaCaptionText.value = caption;
    navigator.clipboard.writeText(caption);

    const originalText = shareInstagramBtn.innerHTML;
    shareInstagramBtn.innerHTML = '<span>✅</span> Copied Caption!';
    setTimeout(() => { shareInstagramBtn.innerHTML = originalText; }, 2200);

    instagramModal.classList.remove('hidden');
  });

  closeInstaModalBtn.addEventListener('click', () => {
    instagramModal.classList.add('hidden');
  });

  copyInstaCaptionModalBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(instaCaptionText.value);
    const originalText = copyInstaCaptionModalBtn.innerHTML;
    copyInstaCaptionModalBtn.innerHTML = '✅ Copied to Clipboard!';
    setTimeout(() => { copyInstaCaptionModalBtn.innerHTML = originalText; }, 1800);
  });

  instagramModal.addEventListener('click', (e) => {
    if (e.target === instagramModal) instagramModal.classList.add('hidden');
  });

  // Copy Link
  copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    const originalText = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<span>✅</span> Copied!';
    setTimeout(() => { copyLinkBtn.innerHTML = originalText; }, 1800);
  });

  // Keyboard navigation (respects future date limit)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      calendarModal.classList.add('hidden');
      instagramModal.classList.add('hidden');
    }
    if (e.key === 'ArrowLeft') changeDay(-1);
    if (e.key === 'ArrowRight') {
      if (!isToday(state.currentMonth, state.currentDay)) {
        changeDay(1);
      }
    }
  });
}

function buildInstagramCaption(month, day, events = []) {
  const currentYear = new Date().getFullYear();
  const monthName = MONTH_NAMES_EN[month - 1] || 'Date';

  const items = events.map(e => {
    const yearsAgo = currentYear - e.year;
    const clean = (e.text || '').replace(/\s*\([^)]*\)/g, '').trim();
    const icon = e.category?.icon || '✨';
    return `🔹 ${e.year} (${yearsAgo} years ago)\n${icon} ${clean}`;
  }).join('\n\n');

  return `Feels like yesterday... ✨📸\n\nHere is what happened OnThisAyer (${monthName} ${day}) across history:\n\n${items}\n\n---\n💬 What were YOU doing on this exact day 5 or 10 years ago?\n\nRediscover your past photo memories with Ayer App. 100% private, on-device, no cloud 🔒\n\n👉 Free download on iOS & Android: https://www.chapiware.com/ayer/\n\n#OnThisDay #OnThisAyer #Throwback #PhotoMemories #Nostalgia #AyerApp #History #FeelsLikeYesterday #ThenAndNow`;
}

function changeDay(delta) {
  let m = state.currentMonth;
  let d = state.currentDay + delta;
  const maxDays = MONTH_DAYS[m - 1];

  if (d > maxDays) {
    m++;
    if (m > 12) m = 1;
    d = 1;
  } else if (d < 1) {
    m--;
    if (m < 1) m = 12;
    d = MONTH_DAYS[m - 1];
  }

  // Block navigation into future dates
  if (isFutureDate(m, d)) {
    return;
  }

  state.currentMonth = m;
  state.currentDay = d;
  loadDate(m, d);
}

function renderCalendarModalGrid() {
  monthsGrid.innerHTML = MONTH_NAMES_EN.map((mName, mIdx) => {
    const monthNum = mIdx + 1;
    const daysInMonth = MONTH_DAYS[mIdx];

    const dayChips = Array.from({ length: daysInMonth }, (_, i) => i + 1)
      .map(d => {
        const locked = isFutureDate(monthNum, d);
        const active = (monthNum === state.currentMonth && d === state.currentDay);
        return `
          <button 
            class="day-chip ${locked ? 'locked' : ''} ${active ? 'active' : ''}" 
            data-month="${monthNum}" 
            data-day="${d}"
            ${locked ? 'disabled title="Locked until this date arrives!"' : `title="${mName} ${d}"`}
          >
            ${d}
          </button>
        `;
      }).join('');

    return `
      <div class="month-card ${monthNum > TODAY_MONTH ? 'month-locked' : ''}">
        <h4>${mName} ${monthNum > TODAY_MONTH ? '🔒' : ''}</h4>
        <div class="days-chips">${dayChips}</div>
      </div>
    `;
  }).join('');

  monthsGrid.querySelectorAll('.day-chip:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMonth = parseInt(btn.dataset.month, 10);
      state.currentDay = parseInt(btn.dataset.day, 10);
      calendarModal.classList.add('hidden');
      loadDate(state.currentMonth, state.currentDay);
    });
  });
}

async function loadDate(month, day) {
  // If a future date is requested, enforce lock screen
  if (isFutureDate(month, day)) {
    renderLockedScreen(month, day);
    return;
  }

  updateUrlDate();
  updateNavButtons();
  
  const mName = MONTH_NAMES_EN[month - 1];
  const todayFlag = isToday(month, day);

  document.title = `OnThisAyer — What Happened on ${mName} ${day}? | Photo Memories by Ayer App`;

  activeDateDisplay.textContent = todayFlag ? `Today (${mName} ${day})` : `${mName} ${day}`;
  heroDateBadge.textContent = `${mName} ${day} in History`;
  heroHeading.textContent = `What happened OnThisAyer?`;

  // Update Mockup iframe
  ayerMockupFrame.src = `mockup.html?month=${month}&day=${day}`;

  storiesList.innerHTML = `
    <div class="loading-spinner-box">
      <div class="spinner"></div>
      <p>Exploring ${mName} ${day} through history...</p>
    </div>
  `;

  try {
    const events = await fetchDayEvents(month, day);
    state.events = events;
    renderStories(events, mName, day);
  } catch (err) {
    storiesList.innerHTML = `
      <div class="story-card">
        <p style="color: #ef4444;">⚠️ Error loading events for this date: ${err.message}</p>
      </div>
    `;
  }
}

function renderLockedScreen(month, day) {
  const mName = MONTH_NAMES_EN[month - 1];
  activeDateDisplay.textContent = `${mName} ${day} 🔒`;
  heroDateBadge.textContent = `Future Date Locked`;
  heroHeading.textContent = `${mName} ${day} hasn't arrived yet!`;
  
  storiesList.innerHTML = `
    <div class="story-card locked-card">
      <div style="font-size: 2.2rem; margin-bottom: 8px;">🔒</div>
      <h3>This date is locked</h3>
      <p style="color: var(--text-secondary); margin: 8px 0 16px;">
        OnThisAyer only unlocks memories as each day arrives. Come back on <strong>${mName} ${day}</strong> to discover what happened!
      </p>
      <button class="share-btn twitter-btn" style="max-width: 220px;" onclick="window.location.search=''">
        ✨ Return to Today
      </button>
    </div>
  `;
}

async function fetchDayEvents(month, day) {
  const mm = padZero(month);
  const dd = padZero(day);

  // 1. Try local server API if running
  try {
    const res = await fetch(`/api/events/${month}/${day}`);
    if (res.ok) {
      const json = await res.json();
      if (json.events && json.events.length > 0) {
        if (json.curatedSelection?.selectedEventIds?.length) {
          const curated = json.curatedSelection.selectedEventIds
            .map(id => json.events.find(e => e.id === id))
            .filter(Boolean);
          if (curated.length > 0) return curated;
        }
        return json.events.slice(0, 3);
      }
    }
  } catch {}

  // 2. Try static pre-curated data on GitHub Pages
  try {
    const staticRes = await fetch(`data/events/${mm}-${dd}.json`);
    if (staticRes.ok) {
      const json = await staticRes.json();
      if (json.events && json.events.length > 0) {
        try {
          const curRes = await fetch('data/curated.json');
          if (curRes.ok) {
            const curStore = await curRes.json();
            const curSelection = curStore[`${mm}-${dd}`];
            if (curSelection?.selectedEventIds?.length) {
              const curated = curSelection.selectedEventIds
                .map(id => json.events.find(e => e.id === id))
                .filter(Boolean);
              if (curated.length > 0) return curated;
            }
          }
        } catch {}
        return json.events.slice(0, 3);
      }
    }
  } catch {}

  // 3. Fallback: Standalone live Wikipedia REST API
  const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
  const res = await fetch(url);
  const json = await res.json();

  const candidates = [];
  for (const item of (json.events || [])) {
    if (!item.year || !item.text) continue;
    const pages = item.pages || [];
    const images = [];
    let mainTitle = pages[0]?.titles?.normalized || pages[0]?.title || null;
    let wikiUrl = pages[0]?.content_urls?.desktop?.page || null;

    for (const p of pages) {
      const src = p.originalimage?.source || p.thumbnail?.source;
      if (src && !src.includes('.svg') && !src.includes('flag') && !src.includes('map')) {
        images.push({
          url: src,
          title: p.title
        });
      }
      if (images.length >= 3) break;
    }

    if (images.length > 0 && item.year >= 1900) {
      candidates.push({
        year: item.year,
        text: item.text,
        images,
        mainPageTitle: mainTitle,
        mainPageUrl: wikiUrl
      });
    }
  }

  candidates.sort((a, b) => b.year - a.year);
  return candidates.slice(0, 3);
}

function renderStories(events, monthName, day) {
  const currentYear = new Date().getFullYear();
  storiesCountBadge.textContent = `${events.length} Key Memories`;

  if (events.length === 0) {
    storiesList.innerHTML = `
      <div class="story-card">
        <p>No historical photo memories recorded for this date yet.</p>
      </div>
    `;
    return;
  }

  storiesList.innerHTML = events.map(e => {
    const yearsAgo = currentYear - e.year;
    const imagesList = e.images || (e.image ? [e.image] : []);

    return `
      <article class="story-card">
        <div class="story-head">
          <div class="story-year">
            ${e.year}
            <span class="story-ago">(${yearsAgo} years ago)</span>
          </div>
          <span class="story-tag">${monthName} ${day}</span>
        </div>

        <p class="story-body">${escapeHtml(e.text)}</p>

        ${imagesList.length > 0 ? `
          <div class="story-photos-row">
            ${imagesList.slice(0, 3).map((img, idx) => `
              <div class="story-photo-thumb">
                <img src="${img.url || img.thumbnailUrl}" alt="${e.year} photo ${idx + 1}" loading="lazy" onerror="this.parentElement.style.display='none'">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
}

function padZero(n) {
  return String(n).padStart(2, '0');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', init);

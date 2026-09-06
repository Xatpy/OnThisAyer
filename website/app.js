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
  events: [],
  currentVideo: null
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

const heroVideoBtn = document.getElementById('heroVideoBtn');
const viewVideoBtn = document.getElementById('viewVideoBtn');
const videoModal = document.getElementById('videoModal');
const closeVideoModalBtn = document.getElementById('closeVideoModalBtn');
const onlineVideoPlayer = document.getElementById('onlineVideoPlayer');
const onlineVideoSource = document.getElementById('onlineVideoSource');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const copyVideoCaptionBtn = document.getElementById('copyVideoCaptionBtn');
const videoModalTitle = document.getElementById('videoModalTitle');

const shareTwitterBtn = document.getElementById('shareTwitterBtn');
const twitterModal = document.getElementById('twitterModal');
const closeTwitterModalBtn = document.getElementById('closeTwitterModalBtn');
const twitterThreadText = document.getElementById('twitterThreadText');
const copyTwitterModalBtn = document.getElementById('copyTwitterModalBtn');
const postFirstTweetBtn = document.getElementById('postFirstTweetBtn');
const threadFullTabBtn = document.getElementById('threadFullTabBtn');
const threadCardsTabBtn = document.getElementById('threadCardsTabBtn');
const threadFullView = document.getElementById('threadFullView');
const threadCardsView = document.getElementById('threadCardsView');

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

const shareTikTokBtn = document.getElementById('shareTikTokBtn');
const tiktokModal = document.getElementById('tiktokModal');
const closeTikTokModalBtn = document.getElementById('closeTikTokModalBtn');
const tiktokCaptionText = document.getElementById('tiktokCaptionText');
const copyTikTokCaptionModalBtn = document.getElementById('copyTikTokCaptionModalBtn');

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

  // Twitter / X Thread Share & Modal
  shareTwitterBtn.addEventListener('click', () => {
    const threadData = buildTwitterThread(state.currentMonth, state.currentDay, state.events);
    state.currentTwitterThread = threadData;

    if (twitterThreadText) twitterThreadText.value = threadData.fullText;
    renderTweetCards(threadData.tweets);

    navigator.clipboard.writeText(threadData.fullText);

    const originalText = shareTwitterBtn.innerHTML;
    shareTwitterBtn.innerHTML = '<span>✅</span> Copied Thread!';
    setTimeout(() => { shareTwitterBtn.innerHTML = originalText; }, 2200);

    if (twitterModal) twitterModal.classList.remove('hidden');
  });

  if (closeTwitterModalBtn) {
    closeTwitterModalBtn.addEventListener('click', () => {
      twitterModal.classList.add('hidden');
    });
  }

  if (copyTwitterModalBtn) {
    copyTwitterModalBtn.addEventListener('click', async () => {
      const fullText = state.currentTwitterThread?.fullText || (twitterThreadText ? twitterThreadText.value : '');
      await copyToClipboard(fullText, twitterThreadText);
      const originalText = copyTwitterModalBtn.innerHTML;
      copyTwitterModalBtn.innerHTML = '✅ Copied Full Thread!';
      setTimeout(() => { copyTwitterModalBtn.innerHTML = originalText; }, 1800);
    });
  }

  if (postFirstTweetBtn) {
    postFirstTweetBtn.addEventListener('click', () => {
      const firstTweet = state.currentTwitterThread?.tweets[0] || '';
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(firstTweet)}`;
      window.open(shareUrl, '_blank', 'width=550,height=420');
    });
  }

  if (threadFullTabBtn && threadCardsTabBtn) {
    threadFullTabBtn.addEventListener('click', () => {
      threadFullTabBtn.classList.add('active');
      threadCardsTabBtn.classList.remove('active');
      threadFullView.classList.remove('hidden');
      threadCardsView.classList.add('hidden');
    });

    threadCardsTabBtn.addEventListener('click', () => {
      threadCardsTabBtn.classList.add('active');
      threadFullTabBtn.classList.remove('active');
      threadCardsView.classList.remove('hidden');
      threadFullView.classList.add('hidden');
    });
  }

  if (twitterModal) {
    twitterModal.addEventListener('click', (e) => {
      if (e.target === twitterModal) twitterModal.classList.add('hidden');
    });
  }

  // Instagram Caption Copy & Modal
  shareInstagramBtn.addEventListener('click', async () => {
    const caption = buildInstagramCaption(state.currentMonth, state.currentDay, state.events);
    instaCaptionText.value = caption;
    await copyToClipboard(caption, instaCaptionText);

    const originalText = shareInstagramBtn.innerHTML;
    shareInstagramBtn.innerHTML = '<span>✅</span> Copied Caption!';
    setTimeout(() => { shareInstagramBtn.innerHTML = originalText; }, 2200);

    instagramModal.classList.remove('hidden');
    setTimeout(() => {
      instaCaptionText.focus();
      instaCaptionText.select();
      instaCaptionText.setSelectionRange(0, 999999);
    }, 100);
  });

  closeInstaModalBtn.addEventListener('click', () => {
    instagramModal.classList.add('hidden');
  });

  copyInstaCaptionModalBtn.addEventListener('click', async () => {
    await copyToClipboard(instaCaptionText.value, instaCaptionText);
    const originalText = copyInstaCaptionModalBtn.innerHTML;
    copyInstaCaptionModalBtn.innerHTML = '✅ Copied to Clipboard!';
    setTimeout(() => { copyInstaCaptionModalBtn.innerHTML = originalText; }, 1800);
  });

  instagramModal.addEventListener('click', (e) => {
    if (e.target === instagramModal) instagramModal.classList.add('hidden');
  });

  // TikTok Caption Copy & Modal
  if (shareTikTokBtn) {
    shareTikTokBtn.addEventListener('click', async () => {
      const rawCaption = state.currentVideo?.caption || buildTikTokCaption(state.currentMonth, state.currentDay, state.events);
      const caption = sanitizeCleanCaption(rawCaption);
      if (tiktokCaptionText) tiktokCaptionText.value = caption;
      await copyToClipboard(caption, tiktokCaptionText);

      const originalText = shareTikTokBtn.innerHTML;
      shareTikTokBtn.innerHTML = '<span>✅</span> Copied TikTok!';
      setTimeout(() => { shareTikTokBtn.innerHTML = originalText; }, 2200);

      if (tiktokModal) {
        tiktokModal.classList.remove('hidden');
        setTimeout(() => {
          if (tiktokCaptionText) {
            tiktokCaptionText.focus();
            tiktokCaptionText.select();
            tiktokCaptionText.setSelectionRange(0, 999999);
          }
        }, 100);
      }
    });
  }

  if (closeTikTokModalBtn) {
    closeTikTokModalBtn.addEventListener('click', () => {
      tiktokModal.classList.add('hidden');
    });
  }

  if (copyTikTokCaptionModalBtn) {
    copyTikTokCaptionModalBtn.addEventListener('click', async () => {
      const clean = sanitizeCleanCaption(tiktokCaptionText.value);
      await copyToClipboard(clean, tiktokCaptionText);
      const originalText = copyTikTokCaptionModalBtn.innerHTML;
      copyTikTokCaptionModalBtn.innerHTML = '✅ Copied to Clipboard!';
      setTimeout(() => { copyTikTokCaptionModalBtn.innerHTML = originalText; }, 1800);
    });
  }

  if (tiktokModal) {
    tiktokModal.addEventListener('click', (e) => {
      if (e.target === tiktokModal) tiktokModal.classList.add('hidden');
    });
  }

  // Copy Link
  copyLinkBtn.addEventListener('click', async () => {
    await copyToClipboard(window.location.href);
    const originalText = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<span>✅</span> Copied!';
    setTimeout(() => { copyLinkBtn.innerHTML = originalText; }, 1800);
  });

  // Video Modal Listeners
  if (heroVideoBtn) {
    heroVideoBtn.addEventListener('click', openVideoModal);
  }
  if (viewVideoBtn) {
    viewVideoBtn.addEventListener('click', openVideoModal);
  }
  if (closeVideoModalBtn) {
    closeVideoModalBtn.addEventListener('click', closeVideoModal);
  }
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
  }
  if (copyVideoCaptionBtn) {
    copyVideoCaptionBtn.addEventListener('click', async () => {
      const rawCaption = state.currentVideo?.caption || buildTikTokCaption(state.currentMonth, state.currentDay, state.events);
      const clean = sanitizeCleanCaption(rawCaption);
      await copyToClipboard(clean);
      const originalText = copyVideoCaptionBtn.innerHTML;
      copyVideoCaptionBtn.innerHTML = '<span>✅</span> Copied TikTok Text!';
      setTimeout(() => { copyVideoCaptionBtn.innerHTML = originalText; }, 1800);
    });
  }

  // Keyboard navigation (respects future date limit)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      calendarModal.classList.add('hidden');
      instagramModal.classList.add('hidden');
      if (twitterModal) twitterModal.classList.add('hidden');
      if (tiktokModal) tiktokModal.classList.add('hidden');
      if (videoModal) closeVideoModal();
    }
    if (e.key === 'ArrowLeft') changeDay(-1);
    if (e.key === 'ArrowRight') {
      if (!isToday(state.currentMonth, state.currentDay)) {
        changeDay(1);
      }
    }
  });
}

function buildTwitterThread(month, day, events = []) {
  const currentYear = new Date().getFullYear();
  const monthName = MONTH_NAMES_EN[month - 1] || 'Today';
  const totalTweets = events.length + 2;
  const tweets = [];

  // Tweet 1: Hook
  tweets.push(`🧵 1/${totalTweets} | What happened OnThisAyer (${monthName} ${day})?\n\nFrom iconic milestones to unforgettable pop culture moments, here is what happened on this exact day across history 👇`);

  // Tweets 2..N: Curated events with story details
  events.forEach((e, idx) => {
    const tweetNum = idx + 2;
    const yearsAgo = currentYear - e.year;
    const clean = (e.text || '').replace(/<[^>]*>?/gm, '').replace(/\s*\([^)]*\)/g, '').trim();
    const icon = e.category?.icon || '✨';
    tweets.push(`${tweetNum}/${totalTweets} | 🔹 ${e.year} (${yearsAgo} years ago)\n\n${icon} ${clean}`);
  });

  // Final Tweet: Engagement Question + Ayer CTA
  tweets.push(`${totalTweets}/${totalTweets} | 💬 What were YOU doing on this exact day 5 or 10 years ago?\n\nRediscover your personal photo memories with Ayer App.\n🔒 100% private, on-device, no cloud.\n\n👉 Free download on iOS & Android: https://www.chapiware.com/ayer/\n\n#OnThisDay #OnThisAyer #Throwback #AyerApp #History #Nostalgia`);

  return {
    tweets,
    fullText: tweets.join('\n\n---\n\n')
  };
}

function renderTweetCards(tweets = []) {
  if (!threadCardsView) return;
  threadCardsView.innerHTML = tweets.map((tweet, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === tweets.length - 1;
    let label = `Tweet ${idx + 1}/${tweets.length}`;
    if (isFirst) label += ' (Hook)';
    if (isLast) label += ' (Ayer CTA)';

    return `
      <div class="tweet-card">
        <div class="tweet-card-header">
          <span class="tweet-badge">${label}</span>
          <button class="tweet-copy-btn" data-tweet-index="${idx}">📋 Copy Tweet</button>
        </div>
        <div class="tweet-body">${tweet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
    `;
  }).join('');

  threadCardsView.querySelectorAll('.tweet-copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.tweetIndex, 10);
      const textToCopy = tweets[idx] || '';
      await copyToClipboard(textToCopy);
      const orig = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1600);
    });
  });
}

/**
 * Universal clipboard copy helper with rock-solid mobile (iOS Safari & Android) fallback
 */
async function copyToClipboard(text, targetTextarea = null) {
  if (!text) return false;

  let copied = false;

  // 1. Modern navigator.clipboard API (works in desktop and secure mobile contexts)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (err) {
      // Fall through to fallback
    }
  }

  if (copied) return true;

  // 2. Fallback using textarea element + document.execCommand('copy')
  let textarea = targetTextarea;
  let isTemp = false;

  if (!textarea) {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.fontSize = '16px'; // Prevent iOS Safari from zooming in
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    isTemp = true;
  } else if (textarea.value !== text) {
    textarea.value = text;
  }

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 999999); // Critical for iOS Safari
    copied = document.execCommand('copy');
  } catch (err) {
    console.warn('execCommand copy failed:', err);
  } finally {
    if (isTemp && textarea.parentNode) {
      document.body.removeChild(textarea);
    }
  }

  return copied;
}

/**
 * Strips any internal metadata or tips if reading legacy text files
 */
function sanitizeCleanCaption(text) {
  if (!text) return '';
  let clean = text;
  if (clean.includes('CAPTION (READY TO COPY & PASTE):')) {
    const parts = clean.split(/CAPTION \(READY TO COPY & PASTE\):/i);
    if (parts[1]) {
      clean = parts[1].split(/------------------------------------------------------------/)[1] || parts[1];
      if (clean.includes('TIKTOK PUBLISHING TIPS:')) {
        clean = clean.split(/TIKTOK PUBLISHING TIPS:/i)[0];
      }
    }
  }
  return clean.replace(/^[=\-\s]+/, '').replace(/[=\-\s]+$/, '').trim();
}

function buildInstagramCaption(month, day, events = []) {
  const currentYear = new Date().getFullYear();
  const monthName = MONTH_NAMES_EN[month - 1] || 'Date';

  const items = events.slice(0, 3).map(e => {
    const yearsAgo = currentYear - e.year;
    const clean = (e.text || '').replace(/<[^>]*>?/gm, '').replace(/\s*\([^)]*\)/g, '').trim();
    return `⚡ ${e.year} (${yearsAgo} years ago):\n${clean}`;
  }).join('\n\n');

  return `Feels like yesterday... ✨📸\n\nWhat happened on ${monthName} ${day} in history:\n\n${items}\n\n💬 Where were YOU on this exact day 5 or 10 years ago? Check your camera roll 👀\n\n📲 Relive your own throwback photos every day with Ayer (Link in bio  🤖)\n\n#OnThisDay #OnThisAyer #Throwback #PhotoMemories #Nostalgia #AyerApp #History #FeelsLikeYesterday #ThenAndNow`;
}

function buildTikTokCaption(month, day, events = []) {
  const currentYear = new Date().getFullYear();
  const sorted = [...events].sort((a, b) => (b.marketingScore || 0) - (a.marketingScore || 0));
  const topYear = sorted[0]?.year || events[0]?.year || 'history';

  const hook = `Wait till you see what happened on this day in ${topYear}… 🤯👇`;

  const items = events.slice(0, 3).map(e => {
    const yearsAgo = currentYear - e.year;
    const clean = (e.text || '').replace(/<[^>]*>?/gm, '').replace(/\s*\([^)]*\)/g, '').replace(/[,;:\.\s]+$/, '').trim();
    const firstSentence = clean.split(/\.\s+/)[0];
    return `⚡ ${e.year} (${yearsAgo} yrs ago): ${firstSentence}`;
  }).join('\n');

  return `${hook}\n\n${items}\n\n💬 Honest question: Where were YOU on this exact day 5 or 10 years ago? Check your camera roll 👀\n\n📲 Relive your throwback photos with Ayer: www.chapiware.com/ayer (100% private, on iOS & Android)\n\n#OnThisDay #HistoryTok #DidYouKnow #Throwback #FeelsLikeYesterday #AyerApp #HistoryBuff #VintageVibes #TodayInHistory #Viral #FYP`;
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

  // Check if video is available for this date
  checkDayVideo(month, day);

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
  state.currentVideo = null;
  if (heroVideoBtn) heroVideoBtn.classList.add('hidden');
  if (viewVideoBtn) viewVideoBtn.classList.add('hidden');

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

async function checkDayVideo(month, day) {
  state.currentVideo = null;
  if (heroVideoBtn) heroVideoBtn.classList.add('hidden');
  if (viewVideoBtn) viewVideoBtn.classList.add('hidden');

  const mm = padZero(month);
  const dd = padZero(day);

  // 1. Try local server API
  try {
    const res = await fetch(`/api/video/${month}/${day}`);
    if (res.ok) {
      const data = await res.json();
      if (data.exists && data.videoUrl) {
        state.currentVideo = data;
        if (heroVideoBtn) heroVideoBtn.classList.remove('hidden');
        if (viewVideoBtn) viewVideoBtn.classList.remove('hidden');
        return;
      }
    }
  } catch {}

  // 2. Fallback check for static hosting on GitHub Pages (relative videos/MM-DD.mp4)
  try {
    const staticRelUrl = `videos/${mm}-${dd}.mp4`;
    const res = await fetch(staticRelUrl, { method: 'HEAD' });
    if (res.ok) {
      let caption = '';
      try {
        const capRes = await fetch(`videos/${mm}-${dd}.txt`);
        if (capRes.ok) caption = await capRes.text();
      } catch {}

      state.currentVideo = {
        exists: true,
        month,
        day,
        videoUrl: staticRelUrl,
        downloadUrl: staticRelUrl,
        downloadFilename: `OnThisAyer-${mm}-${dd}.mp4`,
        caption,
      };
      if (heroVideoBtn) heroVideoBtn.classList.remove('hidden');
      if (viewVideoBtn) viewVideoBtn.classList.remove('hidden');
      return;
    }
  } catch {}

  // 3. Fallback check for local /output/videos/
  try {
    const staticUrl = `/output/videos/${mm}-${dd}.mp4`;
    const res = await fetch(staticUrl, { method: 'HEAD' });
    if (res.ok) {
      state.currentVideo = {
        exists: true,
        month,
        day,
        videoUrl: staticUrl,
        downloadUrl: staticUrl,
        downloadFilename: `OnThisAyer-${mm}-${dd}.mp4`,
      };
      if (heroVideoBtn) heroVideoBtn.classList.remove('hidden');
      if (viewVideoBtn) viewVideoBtn.classList.remove('hidden');
      return;
    }
  } catch {}
}

function openVideoModal() {
  if (!state.currentVideo || !videoModal) return;
  const mName = MONTH_NAMES_EN[state.currentMonth - 1];
  const day = state.currentDay;
  const mm = padZero(state.currentMonth);
  const dd = padZero(day);

  if (videoModalTitle) {
    videoModalTitle.textContent = `🎬 OnThisAyer Video • ${mName} ${day}`;
  }

  if (onlineVideoSource && onlineVideoPlayer) {
    onlineVideoSource.src = state.currentVideo.videoUrl;
    onlineVideoPlayer.load();
    onlineVideoPlayer.play().catch(() => {});
  }

  if (downloadVideoBtn) {
    downloadVideoBtn.href = state.currentVideo.downloadUrl || state.currentVideo.videoUrl;
    downloadVideoBtn.download = state.currentVideo.downloadFilename || `OnThisAyer-${mm}-${dd}.mp4`;
  }

  videoModal.classList.remove('hidden');
}

function closeVideoModal() {
  if (onlineVideoPlayer) {
    onlineVideoPlayer.pause();
  }
  if (videoModal) {
    videoModal.classList.add('hidden');
  }
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

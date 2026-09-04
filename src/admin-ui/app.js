// Tal Día Como Hoy - Frontend Client App

const MONTHS = [
  { id: 1, name: 'Enero', days: 31 },
  { id: 2, name: 'Febrero', days: 29 },
  { id: 3, name: 'Marzo', days: 31 },
  { id: 4, name: 'Abril', days: 30 },
  { id: 5, name: 'Mayo', days: 31 },
  { id: 6, name: 'Junio', days: 30 },
  { id: 7, name: 'Julio', days: 31 },
  { id: 8, name: 'Agosto', days: 31 },
  { id: 9, name: 'Septiembre', days: 30 },
  { id: 10, name: 'Octubre', days: 31 },
  { id: 11, name: 'Noviembre', days: 30 },
  { id: 12, name: 'Diciembre', days: 31 }
];

// App State
const state = {
  currentMonth: new Date().getMonth() + 1,
  currentDay: new Date().getDate(),
  events: [],
  selectedEventIds: [],
  activeCategory: 'all',
  onlyPhotos: true,
  sortBy: 'marketing',
  searchQuery: '',
  copyLang: 'en',
  curatedStore: {},
  stats: { totalDaysCached: 0, totalCuratedDays: 0 }
};

// DOM Elements
const monthSelect = document.getElementById('monthSelect');
const daySelect = document.getElementById('daySelect');
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const todayBtn = document.getElementById('todayBtn');
const refreshBtn = document.getElementById('refreshBtn');

const statText = document.getElementById('statText');
const curatedCountBadge = document.getElementById('curatedCountBadge');
const curatedSlots = document.getElementById('curatedSlots');
const saveCuratedBtn = document.getElementById('saveCuratedBtn');
const autoPickBtn = document.getElementById('autoPickBtn');

// Social Copy Elements
const twitterCopyArea = document.getElementById('twitterCopyArea');
const instagramCopyArea = document.getElementById('instagramCopyArea');
const twitterCharCount = document.getElementById('twitterCharCount');
const copyTwitterBtn = document.getElementById('copyTwitterBtn');
const copyInstagramBtn = document.getElementById('copyInstagramBtn');

const searchInput = document.getElementById('searchInput');
const categoryFilters = document.getElementById('categoryFilters');
const onlyPhotosToggle = document.getElementById('onlyPhotosToggle');
const sortSelect = document.getElementById('sortSelect');

const eventsGrid = document.getElementById('eventsGrid');
const eventsFoundCount = document.getElementById('eventsFoundCount');

// Modal Elements
const imageModal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalSourceLink = document.getElementById('modalSourceLink');
const modalCloseBtn = document.getElementById('modalCloseBtn');

// Mockup Preview Modal Elements
const previewMockupBtn = document.getElementById('previewMockupBtn');
const mockupModal = document.getElementById('mockupModal');
const mockupModalCloseBtn = document.getElementById('mockupModalCloseBtn');
const mockupIframe = document.getElementById('mockupIframe');
const downloadMockupBtn = document.getElementById('downloadMockupBtn');
const openNewTabBtn = document.getElementById('openNewTabBtn');

function init() {
  populateDateDropdowns();
  setupEventListeners();
  fetchStats();
  loadDate(state.currentMonth, state.currentDay);
}

function populateDateDropdowns() {
  monthSelect.innerHTML = MONTHS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  monthSelect.value = state.currentMonth;
  updateDayDropdown();
}

function updateDayDropdown() {
  const mObj = MONTHS.find(m => m.id === state.currentMonth);
  const maxDays = mObj ? mObj.days : 31;
  
  daySelect.innerHTML = Array.from({ length: maxDays }, (_, i) => i + 1)
    .map(d => `<option value="${d}">${d}</option>`)
    .join('');
  
  if (state.currentDay > maxDays) {
    state.currentDay = maxDays;
  }
  daySelect.value = state.currentDay;
}

function setupEventListeners() {
  monthSelect.addEventListener('change', (e) => {
    state.currentMonth = parseInt(e.target.value, 10);
    updateDayDropdown();
    loadDate(state.currentMonth, state.currentDay);
  });

  daySelect.addEventListener('change', (e) => {
    state.currentDay = parseInt(e.target.value, 10);
    loadDate(state.currentMonth, state.currentDay);
  });

  prevDayBtn.addEventListener('click', () => changeDay(-1));
  nextDayBtn.addEventListener('click', () => changeDay(1));
  
  todayBtn.addEventListener('click', () => {
    const now = new Date();
    state.currentMonth = now.getMonth() + 1;
    state.currentDay = now.getDate();
    monthSelect.value = state.currentMonth;
    updateDayDropdown();
    loadDate(state.currentMonth, state.currentDay);
  });

  refreshBtn.addEventListener('click', () => {
    loadDate(state.currentMonth, state.currentDay, true);
  });

  // Search & Filters
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderEvents();
  });

  categoryFilters.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    document.querySelectorAll('#categoryFilters .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeCategory = pill.dataset.cat;
    renderEvents();
  });

  onlyPhotosToggle.addEventListener('change', (e) => {
    state.onlyPhotos = e.target.checked;
    renderEvents();
  });

  sortSelect.innerHTML = `
    <option value="marketing">🔥 Mayor impacto viral (Marketing)</option>
    <option value="recent">📅 Más recientes primero</option>
    <option value="oldest">🕰️ Más antiguos primero</option>
  `;
  sortSelect.value = state.sortBy;

  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderEvents();
  });

  // Curated Actions
  autoPickBtn.addEventListener('click', autoSelectTop3);
  saveCuratedBtn.addEventListener('click', saveCuratedSelection);

  // Social Copy Actions
  document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.copyLang = btn.dataset.lang;
      updateSocialCopies();
    });
  });

  twitterCopyArea.addEventListener('input', updateTwitterCounter);

  copyTwitterBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(twitterCopyArea.value);
    const originalText = copyTwitterBtn.textContent;
    copyTwitterBtn.textContent = '✅ ¡Copiado!';
    setTimeout(() => { copyTwitterBtn.textContent = originalText; }, 1500);
  });

  copyInstagramBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(instagramCopyArea.value);
    const originalText = copyInstagramBtn.textContent;
    copyInstagramBtn.textContent = '✅ ¡Copiado!';
    setTimeout(() => { copyInstagramBtn.textContent = originalText; }, 1500);
  });

  // Modal
  modalCloseBtn.addEventListener('click', () => imageModal.classList.add('hidden'));
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) imageModal.classList.add('hidden');
  });

  // Mockup Modal Actions
  if (previewMockupBtn) {
    previewMockupBtn.addEventListener('click', openMockupModal);
  }
  if (mockupModalCloseBtn) {
    mockupModalCloseBtn.addEventListener('click', () => mockupModal.classList.add('hidden'));
  }
  if (mockupModal) {
    mockupModal.addEventListener('click', (e) => {
      if (e.target === mockupModal) mockupModal.classList.add('hidden');
    });
  }
  if (openNewTabBtn) {
    openNewTabBtn.addEventListener('click', () => {
      window.open(`/mockup.html?month=${state.currentMonth}&day=${state.currentDay}`, '_blank');
    });
  }

  // Keyboard Navigation: ArrowLeft / ArrowRight to change days (when not typing in inputs)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      imageModal.classList.add('hidden');
      if (mockupModal) mockupModal.classList.add('hidden');
      return;
    }
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (!isTyping) {
      if (e.key === 'ArrowLeft') changeDay(-1);
      if (e.key === 'ArrowRight') changeDay(1);
    }
  });
}

function openMockupModal() {
  const url = `/mockup.html?month=${state.currentMonth}&day=${state.currentDay}`;
  mockupIframe.src = url;
  downloadMockupBtn.href = `/api/render/${state.currentMonth}/${state.currentDay}`;
  downloadMockupBtn.setAttribute('download', `ayer-${state.currentMonth}-${state.currentDay}.png`);
  mockupModal.classList.remove('hidden');
}

function changeDay(delta) {
  let m = state.currentMonth;
  let d = state.currentDay + delta;

  const currentMonthDays = MONTHS[m - 1].days;

  if (d > currentMonthDays) {
    m++;
    if (m > 12) m = 1;
    d = 1;
  } else if (d < 1) {
    m--;
    if (m < 1) m = 12;
    d = MONTHS[m - 1].days;
  }

  state.currentMonth = m;
  state.currentDay = d;
  monthSelect.value = m;
  updateDayDropdown();
  loadDate(m, d);
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      state.stats = await res.json();
      statText.textContent = `${state.stats.totalDaysCached} / 366 días en caché (${state.stats.totalCuratedDays} curados)`;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadDate(month, day, forceRefresh = false) {
  eventsGrid.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analizando los 10 mejores años con fotos HD para el ${day} de ${MONTHS[month-1].name}...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/events/${month}/${day}${forceRefresh ? '?refresh=true' : ''}`);
    if (!res.ok) throw new Error('Error al consultar datos');
    const data = await res.json();

    state.events = data.events || [];
    
    if (data.curatedSelection && data.curatedSelection.selectedEventIds?.length) {
      state.selectedEventIds = data.curatedSelection.selectedEventIds;
    } else {
      autoSelectTop3Silently();
    }

    renderCuratedSlots();
    renderEvents();
    updateSocialCopies();
    fetchStats();
  } catch (err) {
    eventsGrid.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Error al cargar acontecimientos: ${err.message}</p>
        <button class="action-btn secondary" style="margin-top: 12px;" onclick="loadDate(${month}, ${day}, true)">Re-extraer fecha</button>
      </div>
    `;
  }
}

function renderCuratedSlots() {
  curatedCountBadge.textContent = `${state.selectedEventIds.length} / 3 años seleccionados`;
  curatedSlots.innerHTML = '';

  for (let i = 0; i < 3; i++) {
    const eventId = state.selectedEventIds[i];
    const event = state.events.find(e => e.id === eventId);

    const slotEl = document.createElement('div');
    slotEl.className = `curated-slot ${event ? 'filled' : 'empty'}`;

    if (event) {
      const currentYear = new Date().getFullYear();
      const yearsAgo = currentYear - event.year;
      const imagesList = (event.images && event.images.length > 0) ? event.images : (event.image ? [event.image] : []);
      const count = Math.min(3, Math.max(1, imagesList.length));

      slotEl.innerHTML = `
        <span class="slot-number-badge">#${i + 1} (${event.year})</span>
        <button class="slot-remove-btn" title="Quitar de la selección" data-id="${event.id}">&times;</button>
        
        <div class="slot-photos-container">
          <div class="photos-row-grid count-${count}">
            ${imagesList.map((img, imgIdx) => `
              <div class="photo-thumb-item" data-fullimg="${img.url}" data-title="${escapeHtml(img.title || event.mainPageTitle || '')}" data-desc="${escapeHtml(img.description || event.text)}" data-wiki="${img.wikiUrl || ''}">
                <img src="${img.thumbnailUrl || img.url}" alt="${event.year} - Foto ${imgIdx + 1}" loading="lazy" onerror="this.parentElement.style.display='none'">
              </div>
            `).join('')}
          </div>
        </div>

        <div class="slot-content">
          <div class="slot-year-tag">
            <span>${event.year} • Hace ${yearsAgo} años</span>
            <span class="slot-photos-badge">${imagesList.length} ${imagesList.length === 1 ? 'foto' : 'fotos'}</span>
          </div>
          <p class="slot-text">${escapeHtml(event.text)}</p>
        </div>
      `;

      slotEl.querySelector('.slot-remove-btn').addEventListener('click', () => {
        toggleSelectEvent(event.id);
      });

      slotEl.querySelectorAll('.photo-thumb-item').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          openLightbox(thumb.dataset.fullimg, thumb.dataset.title, thumb.dataset.desc, thumb.dataset.wiki);
        });
      });
    } else {
      slotEl.innerHTML = `
        <span class="slot-number-badge" style="opacity: 0.5;">#${i + 1}</span>
        <div style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.4;">📸</div>
        <p style="font-size: 0.85rem; font-weight: 600;">Ranura de Año #${i + 1} Vacía</p>
        <span style="font-size: 0.75rem;">Haz clic en "+ Elegir para Ayer" en cualquiera de los 10 años</span>
      `;
    }

    curatedSlots.appendChild(slotEl);
  }
}

async function updateSocialCopies() {
  const selectedEvents = state.selectedEventIds.map(id => state.events.find(e => e.id === id)).filter(Boolean);
  
  if (selectedEvents.length === 0) {
    twitterCopyArea.value = 'Select at least 1 year from the list to generate Twitter copy.';
    instagramCopyArea.value = 'Select at least 1 year from the list to generate Instagram copy.';
    updateTwitterCounter();
    return;
  }

  try {
    const res = await fetch(`/api/generate-copy/${state.currentMonth}/${state.currentDay}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: selectedEvents, lang: state.copyLang })
    });

    if (res.ok) {
      const copies = await res.json();
      twitterCopyArea.value = copies.twitter;
      instagramCopyArea.value = copies.instagram;
      updateTwitterCounter();
    }
  } catch (err) {
    console.error('Error generating copy:', err);
  }
}

function updateTwitterCounter() {
  const len = twitterCopyArea.value.length;
  twitterCharCount.textContent = `${len} / 280`;

  if (len > 280) {
    twitterCharCount.className = 'char-count-badge danger';
  } else if (len > 250) {
    twitterCharCount.className = 'char-count-badge warning';
  } else {
    twitterCharCount.className = 'char-count-badge';
  }
}

function renderEvents() {
  let filtered = [...state.events];

  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(e => e.category?.id === state.activeCategory);
  }

  if (state.onlyPhotos) {
    filtered = filtered.filter(e => e.hasImage && e.imageScore >= 4);
  }

  if (state.searchQuery) {
    filtered = filtered.filter(e => 
      String(e.year).includes(state.searchQuery) ||
      e.text?.toLowerCase().includes(state.searchQuery) ||
      e.category?.name?.toLowerCase().includes(state.searchQuery) ||
      e.mainPageTitle?.toLowerCase().includes(state.searchQuery)
    );
  }

  if (state.sortBy === 'recent') {
    filtered.sort((a, b) => b.year - a.year);
  } else if (state.sortBy === 'oldest') {
    filtered.sort((a, b) => a.year - b.year);
  } else if (state.sortBy === 'marketing') {
    filtered.sort((a, b) => (b.marketingScore || 0) - (a.marketingScore || 0) || b.year - a.year);
  }

  eventsFoundCount.textContent = `Top ${filtered.length} Años Más Destacados (${filtered.length} años únicos con fotos HD)`;

  if (filtered.length === 0) {
    eventsGrid.innerHTML = `
      <div class="empty-state">
        <p>No se encontraron eventos con fotos para estos filtros.</p>
        <button class="action-btn secondary" style="margin-top: 10px;" onclick="resetFilters()">Restablecer filtros</button>
      </div>
    `;
    return;
  }

  eventsGrid.innerHTML = filtered.map(event => {
    const isSelected = state.selectedEventIds.includes(event.id);
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - event.year;
    const imagesList = (event.images && event.images.length > 0) ? event.images : (event.image ? [event.image] : []);
    const cat = event.category || { icon: '✨', name: 'Hito' };
    const score = event.marketingScore || 0;
    const count = Math.min(3, Math.max(1, imagesList.length));

    let viralLabel = '🔥 ' + score;
    if (score >= 80) viralLabel = '🚀 Viral ' + score;
    else if (score >= 50) viralLabel = '🔥 Alto impacto ' + score;

    return `
      <div class="event-card ${isSelected ? 'is-curated' : ''}" data-id="${event.id}">
        ${imagesList.length > 0 ? `
          <div class="card-media">
            <div class="photos-row-grid count-${count}">
              ${imagesList.map((img, imgIdx) => `
                <div class="photo-thumb-item" data-fullimg="${img.url}" data-title="${escapeHtml(img.title || event.mainPageTitle || '')}" data-desc="${escapeHtml(img.description || event.text)}" data-wiki="${img.wikiUrl || ''}">
                  <img src="${img.thumbnailUrl || img.url}" alt="${event.year} foto ${imgIdx + 1}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
              `).join('')}
            </div>
            <span class="media-badge-year">${event.year} <span class="media-badge-ago">(${yearsAgo}a)</span></span>
            <span class="media-badge-cat">${cat.icon} ${cat.name} • ${imagesList.length} ${imagesList.length === 1 ? 'foto' : 'fotos'}</span>
            <span class="media-viral-score">${viralLabel}</span>
          </div>
        ` : ''}

        <div class="card-body">
          ${event.mainPageTitle ? `<div class="card-title">${escapeHtml(event.mainPageTitle)}</div>` : ''}
          <p class="card-text">${escapeHtml(event.text)}</p>

          <div class="card-footer">
            ${event.mainPageUrl ? `
              <a href="${event.mainPageUrl}" target="_blank" class="card-wiki-link">Wikipedia ↗</a>
            ` : '<span></span>'}

            <button class="select-for-ayer-btn ${isSelected ? 'active' : ''}" data-action="toggle-select" data-id="${event.id}">
              ${isSelected ? '✓ Seleccionado' : '+ Elegir para Ayer'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.photo-thumb-item').forEach(mediaEl => {
    mediaEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(
        mediaEl.dataset.fullimg,
        mediaEl.dataset.title,
        mediaEl.dataset.desc,
        mediaEl.dataset.wiki
      );
    });
  });

  document.querySelectorAll('[data-action="toggle-select"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSelectEvent(btn.dataset.id);
    });
  });
}

function toggleSelectEvent(eventId) {
  const index = state.selectedEventIds.indexOf(eventId);
  if (index > -1) {
    state.selectedEventIds.splice(index, 1);
  } else {
    if (state.selectedEventIds.length >= 3) {
      alert('Ya has seleccionado el máximo de 3 años para este día. Quita uno antes de añadir otro.');
      return;
    }
    state.selectedEventIds.push(eventId);
  }
  renderCuratedSlots();
  renderEvents();
  updateSocialCopies();
}

function autoSelectTop3Silently() {
  const candidates = state.events.filter(e => e.hasImage && (e.marketingScore >= 30 || e.imageScore >= 5));
  if (candidates.length === 0) {
    state.selectedEventIds = [];
    return;
  }

  const selected = [];
  const usedDecades = new Set();

  for (const item of candidates) {
    if (selected.length >= 3) break;
    const decade = Math.floor(item.year / 10) * 10;

    if (!usedDecades.has(decade) || selected.length >= candidates.length - 1) {
      selected.push(item.id);
      usedDecades.add(decade);
    }
  }

  if (selected.length < 3) {
    for (const item of candidates) {
      if (selected.length >= 3) break;
      if (!selected.includes(item.id)) selected.push(item.id);
    }
  }

  state.selectedEventIds = selected;
}

function autoSelectTop3() {
  autoSelectTop3Silently();
  renderCuratedSlots();
  renderEvents();
  updateSocialCopies();
}

async function saveCuratedSelection() {
  saveCuratedBtn.disabled = true;
  saveCuratedBtn.innerHTML = '<span>⏳</span> Guardando...';

  try {
    const res = await fetch(`/api/curated/${state.currentMonth}/${state.currentDay}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedEventIds: state.selectedEventIds })
    });

    if (!res.ok) throw new Error('Error al guardar');
    
    saveCuratedBtn.innerHTML = '<span>✅</span> ¡Guardado!';
    setTimeout(() => {
      saveCuratedBtn.disabled = false;
      saveCuratedBtn.innerHTML = '<span>💾</span> Guardar Selección';
    }, 1800);

    fetchStats();
  } catch (err) {
    alert('Error al guardar selección: ' + err.message);
    saveCuratedBtn.disabled = false;
    saveCuratedBtn.innerHTML = '<span>💾</span> Guardar Selección';
  }
}

function openLightbox(imgUrl, title, desc, wikiUrl) {
  modalImg.src = imgUrl;
  modalTitle.textContent = title;
  modalDesc.textContent = desc;
  if (wikiUrl) {
    modalSourceLink.href = wikiUrl;
    modalSourceLink.style.display = 'inline-block';
  } else {
    modalSourceLink.style.display = 'none';
  }
  imageModal.classList.remove('hidden');
}

window.resetFilters = function() {
  state.activeCategory = 'all';
  state.searchQuery = '';
  searchInput.value = '';
  document.querySelectorAll('#categoryFilters .pill').forEach((p, idx) => {
    p.classList.toggle('active', idx === 0);
  });
  renderEvents();
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', init);

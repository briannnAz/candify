/**
 * app.js — Core application logic for Candify
 *
 * Handles: DOM helpers, global state, intro animation, data loading,
 * source attribution, utility functions, view transitions, and initialization.
 */

// ===== DOM HELPERS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ===== GLOBAL STATE =====
let DATA = null;          // Loaded election data (from embedded or fetched JSON)
let curState = null;      // Currently selected state name
let curRaceSlide = 0;     // Active slide index in race carousel
let curSlide = 0;         // Active slide index in detail carousel
let touchX = 0;           // Touch start X for detail carousel swipe
let raceTouchX = 0;       // Touch start X for race carousel swipe
let activeFilter = 'all'; // Current filter tab (all/competitive/senate/house/governor)

// ===== INTRO ANIMATION =====
/** Plays the two-slide intro splash on first load, then removes it from the DOM. */
function runIntro() {
  const overlay = $('#intro-overlay');
  const blue = $('#intro-blue');
  if (!overlay) return;

  // Wipe blue slide in from left after 2s
  setTimeout(() => {
    blue.style.transition = 'clip-path 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    blue.style.filter = 'blur(0px)';
    blue.style.clipPath = 'inset(0 0 0 0)';
  }, 2000);

  // Fade out and remove overlay after 4.5s
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.8s ease-out';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 900);
  }, 4500);
}

// ===== SOURCE ATTRIBUTION URLS =====
const SOURCE_URLS = {
  'Cook Political Report': 'https://www.cookpolitical.com',
  'Ballotpedia': 'https://ballotpedia.org',
  '270toWin': 'https://www.270towin.com',
  'NPR': 'https://www.npr.org/sections/elections',
  'CBS News': 'https://www.cbsnews.com/news/',
  'AJC': 'https://www.ajc.com',
  'Texas Tribune': 'https://www.texastribune.org',
  'Bridge Michigan': 'https://www.bridgemi.com',
  'Time': 'https://time.com',
  'Boston Globe': 'https://www.bostonglobe.com',
  'Iowa Capital Dispatch': 'https://iowacapitaldispatch.com',
  'OnTheIssues.org': 'https://www.ontheissues.org',
  'Cardinal Pine': 'https://cardinalpine.com',
  'Anchorage Daily News': 'https://www.adn.com',
  'NHPR': 'https://www.nhpr.org',
  'The Gazette': 'https://www.thegazette.com',
  'Guides.Vote': 'https://guides.vote',
  'Fox News': 'https://www.foxnews.com',
  'CNBC': 'https://www.cnbc.com',
  'PBS': 'https://www.pbs.org',
  'Associated Press': 'https://apnews.com',
  'WABE Atlanta': 'https://www.wabe.org',
  'The Current GA': 'https://thecurrentga.org'
};

// ===== UTILITY FUNCTIONS =====

/** Returns full party name from abbreviation. */
function partyLabel(p) {
  return p === 'dem' ? 'Democrat' : p === 'rep' ? 'Republican' : 'Independent';
}

/** Extracts initials from a full name (e.g. "Jon Ossoff" → "JO"). */
function initials(name) {
  return name.split(' ').map(w => w[0]).join('');
}

/** Returns true if the state has at least one competitive race. */
function hasCompetitive(stateData) {
  return stateData.races.some(r => r.competitive);
}

/** Formats the race type label, including district for House races. */
function raceTypeLabel(race) {
  if (race.type === 'House' && race.district) return race.district + ' (House)';
  return race.type;
}

/** Determines the majority party leaning for a state based on race ratings. */
function stateMajorityParty(stateData) {
  let demCount = 0, repCount = 0;
  for (const race of stateData.races) {
    const r = race.rating || '';
    if (r.includes('D')) demCount++;
    else if (r.includes('R')) repCount++;
  }
  if (demCount > repCount) return 'dem';
  if (repCount > demCount) return 'rep';
  return 'toss';
}

// ===== DATA LOADING =====
/**
 * Loads election data from EMBEDDED_DATA (used in built artifact) or fetches data.json.
 * On success, hides loading spinner, renders source links, and renders the home view.
 */
async function loadData() {
  try {
    if (typeof EMBEDDED_DATA !== 'undefined') {
      DATA = EMBEDDED_DATA;
    } else {
      const resp = await fetch('data.json');
      if (!resp.ok) throw new Error('Failed to load data');
      DATA = await resp.json();
    }

    $('#home-loading').style.display = 'none';
    $('#home-foot').style.display = '';

    if (DATA.meta?.lastUpdated) {
      $('#updated-badge').textContent = 'Data last updated: ' + DATA.meta.lastUpdated;
    }

    // Render source attribution links
    if (DATA.meta?.sources) {
      $('#source-banner').style.display = '';
      const logosEl = $('#source-logos');
      logosEl.innerHTML = DATA.meta.sources.map(src => {
        const url = SOURCE_URLS[src];
        return url
          ? `<a class="source-logo" href="${url}" target="_blank" rel="noopener noreferrer">${src}</a>`
          : `<span class="source-logo">${src}</span>`;
      }).join('');
    }

    renderHome();
  } catch (e) {
    $('#home-loading').innerHTML = `
      <p style="color:var(--rep)">Could not load election data.</p>
      <p style="margin-top:8px;font-size:13px">Make sure data.json is in the same directory.</p>
    `;
  }
}

// ===== VIEW TRANSITIONS =====
/**
 * Transitions between the three SPA views with CSS animations.
 * Manages focus for keyboard accessibility after transition completes.
 * @param {string} viewId - Target view element ID (v-home, v-state, v-detail)
 */
function go(viewId) {
  const active = $('.v.is-active');
  const next = $('#' + viewId);
  if (active === next) return;

  // Animate out current view
  if (active) {
    active.classList.add('is-leaving');
    active.classList.remove('is-active');
    active.addEventListener('animationend', () => {
      active.classList.remove('is-leaving');
    }, { once: true });
  }

  // Animate in next view after brief delay
  setTimeout(() => {
    next.classList.add('is-active', 'is-entering');
    next.addEventListener('animationend', () => {
      next.classList.remove('is-entering');
      // Move focus for keyboard navigation
      const target = next.querySelector('.back, h1, h2, [tabindex="0"]');
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }, { once: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, active ? 200 : 0);
}

// ===== INITIALIZATION =====
/** Wires all event listeners and kicks off the app. Called after all scripts load. */
function init() {
  // Back navigation
  $('#state-back').addEventListener('click', () => go('v-home'));
  $('#detail-back').addEventListener('click', () => go('v-state'));

  // Filter tabs (event delegation on container)
  $('#filter-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    activeFilter = tab.dataset.filter;
    $$('.filter-tab').forEach(t => {
      t.classList.toggle('on', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });
    renderHome();
  });

  // Live search
  $('#state-search').addEventListener('input', () => renderHome());

  // Keyboard navigation (arrows for carousels, Escape to go back)
  document.addEventListener('keydown', e => {
    if ($('#v-detail').classList.contains('is-active')) {
      if (e.key === 'ArrowLeft') slide(-1);
      if (e.key === 'ArrowRight') slide(1);
      if (e.key === 'Escape') go('v-state');
    } else if ($('#v-state').classList.contains('is-active')) {
      if (e.key === 'ArrowLeft') slideRace(-1);
      if (e.key === 'ArrowRight') slideRace(1);
      if (e.key === 'Escape') go('v-home');
    }
  });

  runIntro();
  loadData();
}

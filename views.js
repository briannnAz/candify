/**
 * views.js — View rendering for Candify
 *
 * Three views: Home (state grid), State (race carousel), Detail (candidate deep-dive).
 * Also includes result display helpers for election outcomes.
 */

// ===== RESULT DISPLAY HELPERS =====

/**
 * Returns HTML for a result badge pill (e.g. "Troy Jackson wins" or "Uncalled").
 * Used on both competitive and compact race cards.
 */
function resultBadgeHTML(race) {
  const r = race.result;
  if (!r) return '';
  if (r.status === 'called') {
    return `<span class="result-badge called-${r.winnerParty}">${r.winner} wins</span>`;
  }
  if (r.status === 'uncalled') {
    return `<span class="result-badge uncalled">Uncalled</span>`;
  }
  return '';
}

/**
 * Returns HTML for a result note — either a flip badge ("Flip: R to D")
 * or a plain italic note (margin info, etc).
 */
function resultNoteHTML(race) {
  const r = race.result;
  if (!r?.note) return '';
  if (r.note.includes('Flip')) {
    const flipCls = r.winnerParty === 'rep' ? 'rep' : '';
    return `<span class="result-flip ${flipCls}">${r.note.split('.')[0]}</span>`;
  }
  return `<span class="result-note">${r.note}</span>`;
}

/**
 * Returns the "✓ Name wins" winner display HTML with a colored check circle.
 * @param {object} result - The race.result object
 */
function winnerDisplayHTML(result) {
  if (!result || result.status !== 'called') return '';
  return `<div class="result-winner"><span class="result-check ${result.winnerParty}">&#10003;</span> ${result.winner} wins</div>`;
}

// ===== RESULTS BANNER (Home View) =====

/** Renders the overall election results banner showing Senate/House/Governor control. */
function renderResultsBanner() {
  const el = $('#results-banner');
  if (!el || !DATA?.meta?.overallResults) {
    if (el) el.style.display = 'none';
    return;
  }
  const o = DATA.meta.overallResults;
  el.style.display = '';
  el.innerHTML = `
    <div class="results-banner-title">2026 Midterm Results</div>
    <div class="results-banner-stats">
      <div class="results-stat">
        <span class="stat-label">Senate</span>
        <span class="stat-val dem">${o.senate.dem}D</span>
        <span class="stat-val rep">${o.senate.rep}R</span>
      </div>
      <div class="results-stat">
        <span class="stat-label">House</span>
        <span class="stat-val dem">${o.house.dem}D</span>
        <span class="stat-val rep">${o.house.rep}R</span>
      </div>
      <div class="results-stat">
        <span class="stat-label">Governors</span>
        <span class="stat-val dem">${o.governors.dem}D</span>
        <span class="stat-val rep">${o.governors.rep}R</span>
      </div>
    </div>
  `;
}

// ===== HOME VIEW =====

/**
 * Renders the home screen: results banner, search/filter, and the state card grid.
 * Each state card shows abbreviation, name, race count, and called-race count.
 * Cards are color-coded by the state's majority party leaning.
 */
function renderHome() {
  if (!DATA?.states) return;
  renderResultsBanner();

  const grid = $('#state-grid');
  const entries = Object.entries(DATA.states).sort((a, b) => a[0].localeCompare(b[0]));
  const search = ($('#state-search')?.value || '').toLowerCase();

  // Apply active filter
  const filtered = entries.filter(([name, d]) => {
    if (search && !name.toLowerCase().includes(search) && !d.abbr?.toLowerCase().includes(search)) return false;
    if (activeFilter === 'competitive') return hasCompetitive(d);
    if (activeFilter === 'senate') return d.races.some(r => r.type === 'Senate');
    if (activeFilter === 'house') return d.races.some(r => r.type === 'House');
    if (activeFilter === 'governor') return d.races.some(r => r.type === 'Governor');
    return true;
  });

  // Render state cards
  grid.innerHTML = filtered.map(([name, d]) => {
    const calledCount = d.races.filter(r => r.result?.status === 'called').length;
    const partyClass = 'party-' + stateMajorityParty(d);
    return `
      <div class="state-card ${partyClass}" data-state="${name}" role="listitem button" tabindex="0"
           aria-label="${name}. ${d.races.length} races${calledCount ? ', ' + calledCount + ' called' : ''}">
        <div class="state-abbr">${d.abbr || ''}</div>
        <div class="state-name">${name}</div>
        <div class="state-meta">
          <span class="state-badge races">${d.races.length} race${d.races.length !== 1 ? 's' : ''}</span>
          ${calledCount ? `<span class="state-badge competitive">${calledCount} called</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Wire click and keyboard handlers on each state card
  grid.querySelectorAll('.state-card').forEach(el => {
    const handler = () => {
      curState = el.dataset.state;
      renderState();
      go('v-state');
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

// ===== STATE VIEW =====

/**
 * Renders the state races view with a swipeable carousel.
 * Competitive races get full cards with candidate details and result highlighting.
 * Non-competitive races get a compact summary card.
 */
function renderState() {
  if (!DATA?.states?.[curState]) return;
  const d = DATA.states[curState];
  curRaceSlide = 0;

  // State header
  $('#state-header').innerHTML = `
    <h1>${curState}</h1>
    <p>${d.races.length} race${d.races.length !== 1 ? 's' : ''} in 2026${hasCompetitive(d) ? ' — competitive races shown in detail' : ''}</p>
  `;

  const track = $('#rc-track');

  // Build one slide per race
  track.innerHTML = d.races.map((race, raceIdx) => {
    const res = race.result;
    let slideContent = '';

    if (race.competitive) {
      // Full candidate cards with stances preview
      const isWinner = (c) => res?.status === 'called' && res.winner === c.name;
      const isLoser = (c) => res?.status === 'called' && res.winner !== c.name;

      slideContent = `
        <div class="race-card-wrap">
          <div class="race-card-head">
            <div class="race-card-title">${raceTypeLabel(race)}</div>
            ${resultBadgeHTML(race)}
            <span class="race-card-tag">${race.rating}</span>
          </div>
          ${winnerDisplayHTML(res)}
          ${resultNoteHTML(race)}
          <div class="cand-stack">
            ${race.candidates.map((c, ci) => `
              <div class="cc ${isWinner(c) ? 'is-winner' : ''} ${isLoser(c) ? 'is-loser' : ''}"
                   data-p="${c.party}" data-ri="${raceIdx}" data-ci="${ci}" role="button" tabindex="0"
                   aria-label="View details for ${c.name}, ${partyLabel(c.party)}${c.poll ? ', polling at ' + c.poll : ''}">
                <div class="cc-top">
                  <div class="cc-avatar" aria-hidden="true">${initials(c.name)}</div>
                  <div class="cc-info">
                    <div class="cc-name">${c.name}</div>
                    <div class="cc-party">${partyLabel(c.party)}</div>
                  </div>
                </div>
                <div class="cc-role">${c.role}</div>
                ${c.partyCore ? `<div class="cc-core">${c.partyCore}</div>` : ''}
                ${c.stances ? `
                  <div class="cc-stances" aria-label="Key stances (preview)">
                    ${c.stances.slice(0, 3).map(s => {
                      const short = s.includes(':') ? s.split(':')[0] : s.substring(0, 60);
                      return `<div class="cc-stance">${short}</div>`;
                    }).join('')}
                    ${c.stances.length > 3 ? `<div class="cc-stance cc-stance-more">+ ${c.stances.length - 3} more stances</div>` : ''}
                  </div>
                ` : ''}
                <div class="cc-bottom">
                  ${c.poll ? `<div class="cc-poll"><span class="num">${c.poll}</span> polling</div>` : `<div class="cc-poll" style="color:var(--fg-tertiary)">No recent polls</div>`}
                  <div class="cc-cta" aria-hidden="true">Full details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Compact card for non-competitive races
      slideContent = `
        <div class="compact-race">
          <div class="compact-head">
            <span class="compact-label">${raceTypeLabel(race)}</span>
            ${resultBadgeHTML(race)}
            <span class="compact-rating">${race.rating}</span>
          </div>
          ${winnerDisplayHTML(res)}
          ${resultNoteHTML(race)}
          <div class="compact-candidates">
            ${race.candidates.map(c => `
              <div class="compact-cand">
                <span class="compact-dot ${c.party}"></span>
                <span class="compact-cand-name">${c.name}</span>
                <span class="compact-cand-role">${c.role}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `<div class="rc-slide" role="group" aria-roledescription="slide" aria-label="${raceTypeLabel(race)} — ${race.rating}">${slideContent}</div>`;
  }).join('');

  // Navigation dots
  const dotsEl = $('#rc-dots');
  dotsEl.innerHTML = d.races.map((race, i) =>
    `<button class="rc-dot ${i === 0 ? 'on' : ''}" data-i="${i}" role="tab" aria-label="Race ${i + 1}: ${raceTypeLabel(race)}" aria-selected="${i === 0}"></button>`
  ).join('');

  // Hide nav controls if only one race
  $('#rc-nav').style.display = d.races.length > 1 ? '' : 'none';

  syncRace();

  // Wire navigation controls
  dotsEl.querySelectorAll('.rc-dot').forEach(dot => {
    dot.addEventListener('click', () => { curRaceSlide = +dot.dataset.i; syncRace(); });
  });
  $('#rc-prev').onclick = () => slideRace(-1);
  $('#rc-next').onclick = () => slideRace(1);

  // Touch swipe support
  const wrap = $('#rc-wrap');
  wrap.addEventListener('touchstart', e => { raceTouchX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const dx = raceTouchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) slideRace(dx > 0 ? 1 : -1);
  }, { passive: true });

  // Wire candidate card clicks (competitive cards only)
  track.querySelectorAll('.cc').forEach(el => {
    const handler = () => {
      const ri = parseInt(el.dataset.ri);
      const ci = parseInt(el.dataset.ci);
      const race = d.races[ri];
      if (race?.candidates[ci]?.stances) {
        openDetail(race, ci);
      }
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

// ===== DETAIL VIEW =====

/**
 * Opens the candidate detail view with a multi-slide carousel covering:
 * Overview, Party Rationale, Stances, Key Issue, vs. Opponent, Potential Negatives.
 * Also shows election result status (winner/loser/uncalled) in the hero section.
 *
 * @param {object} race - The race object from data
 * @param {number} ci - Index of the candidate to show
 */
function openDetail(race, ci) {
  const c = race.candidates[ci];
  if (!c?.stances && !c?.partyCore) return;

  const opponent = race.candidates.find((_, i) => i !== ci);
  curSlide = 0;

  const raceLabel = raceTypeLabel(race);
  const partyName = partyLabel(c.party);

  // Build slide data — only include slides where the candidate has content
  const slides = [
    { label: 'Overview', html: `
      <h3>Who is ${c.name}?</h3>
      <p class="big-text">${c.role}</p>
      <p style="margin-top:14px">Running for <strong>${raceLabel}</strong> in <strong>${curState}</strong></p>
      <p style="margin-top:6px">Race rating: <strong>${race.rating}</strong></p>
    `},
    ...(c.partyCore ? [{ label: 'Why ' + partyName, html: `
      <h3>Why They Run as a ${partyName}</h3>
      <p class="big-text">${c.partyCore}</p>
    `}] : []),
    ...(c.stances?.length ? [{ label: 'All Stances', html: `
      <h3>Where They Stand</h3>
      <ul>${c.stances.map(s => `<li>${s}</li>`).join('')}</ul>
    `}] : []),
    ...(c.keyIssue ? [{ label: 'Defining Issue', html: `
      <h3>The Issue That Matters Most</h3>
      <p class="big-text">${c.keyIssue}</p>
    `}] : []),
    ...(c.diff ? [{ label: 'vs. Opponent', html: `
      <h3>How They Differ${opponent ? ' from ' + opponent.name : ''}</h3>
      <p class="big-text">${c.diff}</p>
    `}] : []),
    ...(c.negatives ? [{ label: 'Watch Out For', html: `
      <h3>Potential Negatives</h3>
      <div class="neg-box ${c.party}">${c.negatives}</div>
    `}] : [])
  ];

  // Number each slide for the step indicator
  slides.forEach((s, i) => s.step = i + 1);

  // Determine election result for this candidate
  const res = race.result;
  const didWin = res?.status === 'called' && res.winner === c.name;
  const didLose = res?.status === 'called' && res.winner !== c.name;

  const root = $('#detail-root');
  root.innerHTML = `
    <div class="det-hero">
      <div class="det-avatar ${c.party}">${initials(c.name)}</div>
      <div class="det-name">${c.name}</div>
      <div class="det-sub">${raceLabel} — ${curState}</div>
      <div class="det-badge ${c.party}">${partyLabel(c.party)}</div>
      ${didWin ? `<div class="result-winner" style="margin-top:8px"><span class="result-check ${c.party}">&#10003;</span> Winner</div>` : ''}
      ${didLose ? `<div class="result-note" style="margin-top:8px">Lost to ${res.winner}</div>` : ''}
      ${res?.status === 'uncalled' ? `<span class="result-badge uncalled" style="margin-top:8px">Race Uncalled</span>` : ''}
      ${res?.note && didWin ? `<div style="margin-top:4px">${resultNoteHTML(race)}</div>` : ''}
    </div>

    <div class="car-wrap" id="car-wrap" role="region" aria-roledescription="carousel" aria-label="Candidate information">
      <div class="car-track" id="car-track">
        ${slides.map(s => `
          <div class="car-slide" role="group" aria-roledescription="slide" aria-label="${s.label}">
            <div class="slide-card" data-p="${c.party}">
              <div class="slide-eyebrow"><span class="step" aria-hidden="true">${s.step}</span>${s.label}</div>
              ${s.html}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="car-nav" role="navigation" aria-label="Slide navigation">
      <div class="car-dots" id="car-dots" role="tablist" aria-label="Detail slides">
        ${slides.map((s, i) => `<button class="car-dot ${i === 0 ? 'on' : ''}" data-i="${i}" role="tab" aria-label="Slide ${i + 1}: ${s.label}" aria-selected="${i === 0}"></button>`).join('')}
      </div>
      <div class="car-arrows">
        <button class="car-arr" id="car-prev" disabled aria-label="Previous slide"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button class="car-arr" id="car-next" aria-label="Next slide"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
      </div>
    </div>

    <div class="foot">
      Data from multiple nonpartisan outlets.<br>
      Educational purposes — always verify before voting.
    </div>
  `;

  // Wire detail carousel controls
  $('#car-prev').addEventListener('click', () => slide(-1));
  $('#car-next').addEventListener('click', () => slide(1));
  $$('#car-dots .car-dot').forEach(d => {
    d.addEventListener('click', () => { curSlide = +d.dataset.i; syncCar(); });
  });

  // Touch swipe support
  const wrap = $('#car-wrap');
  wrap.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) slide(dx > 0 ? 1 : -1);
  }, { passive: true });

  syncCar();
  go('v-detail');
}

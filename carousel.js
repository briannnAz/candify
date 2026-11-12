/**
 * carousel.js — Dual carousel systems for Candify
 *
 * Race carousel: swipe between races on the state view (rc-track).
 * Detail carousel: swipe between info slides on the candidate detail view (car-track).
 */

// ===== RACE CAROUSEL (State View) =====

/** Moves the race carousel by one slide in the given direction (-1 or +1). */
function slideRace(dir) {
  if (!DATA?.states?.[curState]) return;
  const total = DATA.states[curState].races.length;
  curRaceSlide = Math.max(0, Math.min(total - 1, curRaceSlide + dir));
  syncRace();
}

/** Syncs race carousel position, counter text, dots, and arrow states. */
function syncRace() {
  const track = $('#rc-track');
  if (!track) return;
  track.style.transform = `translateX(-${curRaceSlide * 100}%)`;

  const d = DATA.states[curState];
  $('#rc-counter').textContent = d.races.length > 1
    ? `${curRaceSlide + 1} / ${d.races.length} races`
    : '1 race';

  $$('#rc-dots .rc-dot').forEach((dot, i) => {
    dot.classList.toggle('on', i === curRaceSlide);
    dot.setAttribute('aria-selected', i === curRaceSlide ? 'true' : 'false');
  });

  const prev = $('#rc-prev'), next = $('#rc-next');
  if (prev) prev.disabled = curRaceSlide === 0;
  if (next) next.disabled = curRaceSlide >= d.races.length - 1;
}

// ===== DETAIL CAROUSEL (Candidate Detail View) =====

/** Moves the detail carousel by one slide in the given direction (-1 or +1). */
function slide(dir) {
  const track = $('#car-track');
  if (!track) return;
  const total = track.children.length;
  curSlide = Math.max(0, Math.min(total - 1, curSlide + dir));
  syncCar();
}

/** Syncs detail carousel position, dots, and arrow states. */
function syncCar() {
  const track = $('#car-track');
  if (!track) return;
  track.style.transform = `translateX(-${curSlide * 100}%)`;

  $$('#car-dots .car-dot').forEach((d, i) => {
    d.classList.toggle('on', i === curSlide);
    d.setAttribute('aria-selected', i === curSlide ? 'true' : 'false');
  });

  const prev = $('#car-prev'), next = $('#car-next');
  if (prev) prev.disabled = curSlide === 0;
  if (next) next.disabled = curSlide >= track.children.length - 1;
}

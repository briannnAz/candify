# Candify

Unbiased 2026 USA midterm election candidate comparison tool. Browse races by state, filter by type, and compare candidates side-by-side with stances, party rationale, polling data, and potential negatives — all sourced from nonpartisan outlets.

Now includes **live election results** with winner/loser highlighting, flip indicators, and an overall results banner showing Senate, House, and Governor control.

## Files

| File | Purpose |
|------|---------|
| `candify.html` | HTML shell — page structure, intro splash, three views (home, state, detail) |
| `styles.css` | All CSS — design tokens, dark/light theming, components, results UI, responsive breakpoints |
| `app.js` | Core logic — state management, DOM helpers, data loading, view transitions, keyboard nav, init |
| `views.js` | View rendering — home grid with results banner, state race cards with winner/loser display, candidate detail |
| `carousel.js` | Carousel systems — race carousel (swipe between races) and detail carousel (swipe between info slides) |
| `data.json` | Election data — 46 states, 109+ candidates, 58 races with results and projections |
| `build.sh` | Build script — combines all source files into a single deployable HTML file |
| `docs/` | Screenshots and screen documentation (see `docs/SCREENS.md`) |

## Build

```bash
bash build.sh > candify-built.html
```

This inlines CSS, JS, and data.json into one self-contained HTML file. Open `candify-built.html` in any browser — no server required.

## Development

For local development, edit the individual source files and rebuild. The HTML shell (`candify.html`) references the separate files via `<link>` and `<script>` tags, but browsers require a local server for the `fetch('data.json')` call:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000/candify.html`.

## Architecture

**Three-view SPA** with CSS-animated transitions (no framework):

1. **Home** — Results banner (Senate/House/Governor control), state grid with search and filter tabs (All, Competitive, Senate, House, Governor). States are color-coded by majority party.
2. **State** — Swipeable race carousel. Competitive races show full candidate cards with result badges, winner/loser highlighting, and flip indicators. Non-competitive races appear as compact summaries.
3. **Detail** — Candidate deep-dive with swipeable slides: Overview, Why They Run as [Party], All Stances, Defining Issue, vs. Opponent, Potential Negatives. Shows win/loss status in the hero section.

**Theming**: CSS custom properties with full dark mode support via `prefers-color-scheme` and `data-theme` attribute. Party colors: Democrat blue (#1A6AFF), Republican red (#E5243B), Independent purple (#7B5CFF).

**Accessibility**: WCAG 2.1 AA — skip-nav link, ARIA landmarks and roles, focus-visible outlines, keyboard navigation (arrow keys for carousels, Escape to go back), reduced-motion support.

**Typography**: Inter (400–900) for UI, JetBrains Mono (400–600) for labels and badges, loaded from Google Fonts.

## Screenshots

See `docs/SCREENS.md` for detailed annotations of every component.

### Home View (Light)
Results banner with Senate/House/Governor control, state grid with search and filter tabs.

![Home — Light](docs/01-home-light.png)

### Home View (Dark)
Full dark mode with adjusted colors and contrast.

![Home — Dark](docs/02-home-dark.png)

### Home — Desktop Layout
State grid expands to 4+ columns on wider screens.

![Home — Desktop](docs/10-home-desktop-light.png)

### Home — Filter Active
Senate filter applied, showing only states with Senate races.

![Home — Filter](docs/09-home-filter-light.png)

### State Races (Light)
Race carousel with result badges, winner display, flip indicators, and candidate cards with winner/loser highlighting.

![State — Light](docs/03-state-light.png)

### State Races (Dark)
Same view in dark mode.

![State — Dark](docs/04-state-dark.png)

### State Races — Second Slide
Swiping to the next race in the carousel.

![State — Race 2](docs/05-state-race2-light.png)

### Candidate Detail — Overview (Light)
Deep-dive hero with win/loss status, plus the overview info slide.

![Detail — Light](docs/06-detail-light.png)

### Candidate Detail (Dark)
Detail view in dark mode.

![Detail — Dark](docs/07-detail-dark.png)

### Candidate Detail — Stances
The "Where They Stand" slide showing all policy positions.

![Detail — Stances](docs/08-detail-stances-light.png)

## Updating Data

Edit `data.json` directly. Each state has an `abbr`, and an array of `races`. Each race has:

- `type` — Senate, House, or Governor
- `district` — for House races (e.g. "NJ-7")
- `rating` — Toss-Up, Lean D/R, Likely D/R, Safe D/R
- `competitive` — boolean, determines full vs. compact display
- `result` — election outcome object (optional):
  - `status` — "called", "uncalled", or "runoff"
  - `winner` — name of the winning candidate
  - `winnerParty` — "dem", "rep", or "ind"
  - `margin` — winning margin (optional)
  - `note` — additional context like "Flip: R to D" (optional)
- `candidates[]` — each with:
  - `name`, `party` (dem/rep/ind), `role`, `poll`
  - `stances[]` — array of position statements
  - `partyCore` — why they run as their party
  - `keyIssue` — their defining issue
  - `diff` — how they differ from their opponent
  - `negatives` — potential concerns

The `meta` object also holds:
- `overallResults` — aggregate Senate/House/Governor seat counts
- `lastUpdated` — date string shown in the footer
- `sources` — array of source names for the attribution banner

After editing, rebuild with `bash build.sh > candify-built.html`.

## Sources

Data compiled from 23+ nonpartisan outlets including Cook Political Report, Ballotpedia, 270toWin, Associated Press, NPR, PBS, CBS News, and others. Source links are displayed in the app's footer. Always verify with official sources before voting.

# Result V2 — Design Spec
**Date:** 2026-04-17

## Overview

A redesigned game result page gated behind `?v2=1` in the URL. The new layout replaces accordions and a line chart with a compact stats header, flat filter rows, an inline percentile bar, and a bar chart with std dev shading. The existing `Result.jsx` is untouched.

---

## Feature Flag

- URL param: `?v2=1`
- `App.jsx` reads `useSearchParams` inside a child component (`AppRoutes`) since `BrowserRouter` must wrap any `useSearchParams` call — the hook cannot be called in the same component that renders `BrowserRouter`. `AppRoutes` renders the `Routes` tree and reads the flag.
- `Menu.jsx` reads the same param and conditionally renders the search button/icon

---

## File Structure

### New files
| File | Purpose |
|------|---------|
| `src/components/ResultV2.jsx` | Top-level page component, owns all state |
| `src/components/FiltersV2.jsx` | Flat filter rows (primary + advanced) |
| `src/components/PercentileBar.jsx` | Gradient bar, bubble, connecting line, quip |
| `src/components/BarGraph.jsx` | Chart.js bar chart with std dev shading |
| `src/components/ResultV2.css` | Layout styles and mobile breakpoints |

### Modified files
| File | Change |
|------|--------|
| `src/App.jsx` | Read `?v2=1`, swap `Result` → `ResultV2` for game routes |
| `src/components/Menu.jsx` | Add search button (desktop) + icon (mobile), shown only when `?v2=1` |

### Unchanged
`Result.jsx`, `Filters.jsx`, `Graph.jsx`, `FilterDropdown.jsx`, all reducers, all actions.

---

## Layout (ResultV2.jsx)

Constrained-width column: `max-width: 1100px`, `padding: 0 32px` (desktop), `0 16px` (mobile ≤700px).

### Game header
Flex row: thumbnail (120px) → name + BGG link → stats block (`ml: auto`, `text-align: right`).

Stats block:
- **Primary row**: big `scoreCount` + label, big `mean` + "avg" — `justify-content: flex-end`, `align-items: baseline`
- **Secondary row**: std dev, win %, expected avg, expected win % — flex row desktop, 2-column grid mobile (right column right-aligned)

Mobile: header wraps — thumbnail + name on top row, stats full-width below.

### Filters (FiltersV2)
- Primary filters (Player Count, Finish Place) always visible, horizontally scrollable on mobile
- Advanced filters (Start Place, New Player, Player Color, Play Year, Play Month) on same row desktop, own row mobile
- Right-fade mask on advanced filters inner scroll; mask removed when scrolled to end
- Divider (`<hr>`) below filters section on all breakpoints

### Score row
`Score` label (hidden mobile) + number input (debounced 400ms, placeholder "Score" on mobile) + `PercentileBar` on one line. No save button.

### BarGraph
Wrapped in scroll container (`overflow-x: auto`). Chart `min-width: 700px` on mobile. Dual edge-fade masks (left appears when scrolled away from start, right disappears when at end). Auto-scrolls to avg on load, to score on input. Click on bar sets score via `onScoreClick` callback.

### Footer
`data provided by boardgamegeek.com` centered, small text.

### Loading / error states
- Loading: centered `<CircularProgress>` (same as current)
- `result === null` + `totalScores === 0`: same "no plays yet" alert as current
- `result === null` (filters yield no data): same "No data available" message as current

---

## PercentileBar.jsx

**Props:** `score` (number | ''), `percentile` (number | null)

**Renders:**
- Gradient track: `linear-gradient(to right, #ef5350, #ffc107, #66bb6a)`, height 12px, border-radius 6px, `overflow: hidden`
- Dark cover overlay: `position: absolute`, right-anchored, `width: (100 - pct)%`, transitions on width
- Bubble: `position: absolute`, no background, white text, 1px white bottom border; text = "better than X%" or "worse than X%"
- Connecting line: 1px white vertical line from bubble bottom border to track top
- Indicator: 2px white vertical bar spanning the track height at score position
- Quip: centered below track; "How good are you?" when no score, "You're [quip]" when score set

Bubble position calculated via `useRef` + `useLayoutEffect`. Bubble left position clamped: `Math.min(Math.max(scoreX - bw/2, 0), trackW - bw)`.

Bubble, line, and indicator have `opacity: 0` when no score, `opacity: 1` when score set (CSS transition).

---

## FiltersV2.jsx

Reuses `FilterDropdown` as-is. Same props/data source as `Filters.jsx` (player counts, colors, years, months from Redux `data.game`).

- Primary row: Player Count + Finish Place
- Advanced row: Start Place, New Player, Player Color, Play Year, Play Month
- "Advanced" label hidden on mobile
- Advanced inner div: `overflow-x: auto`, right-fade mask via CSS `mask-image`, `scrolled-end` class removes mask

---

## BarGraph.jsx

**Props:** `result`, `score`, `percentile`, `onScoreClick`

Chart.js `Bar` type (not Line). `responsive: true`, `maintainAspectRatio: false`.

**Per-bar colors:**
```js
const STD_DEV = result.stdDev ?? 12;
bars.forEach((_, i) => {
  const isUser = score && i === score;
  const isAvg = i === Math.round(result.mean);
  if (isUser) color = percentile < 33 ? '#ef5350' : percentile < 66 ? '#ffc107' : '#66bb6a';
  else if (isAvg) color = 'rgba(180,190,240,0.8)';
  else {
    const sd = Math.abs(i - result.mean) / STD_DEV;
    const alpha = sd < 1 ? 0.55 : sd < 2 ? 0.38 : sd < 3 ? 0.22 : 0.1;
    color = `rgba(121,134,203,${alpha})`;
  }
});
```

**Bar labels plugin** (custom inline Chart.js plugin): draws "avg" + mean value above avg bar, and score value above user score bar — each with a short vertical connecting line from text down to bar top. Registered only for BarGraph instances.

**Click handler:** `onClick` option maps canvas X to bin index, calls `onScoreClick(binIndex)`.

**Mobile scroll:** wrapper div `overflow-x: auto`, chart canvas `min-width: 700px`. Scroll synced via `scrollTo` after score changes.

---

## Data Flow

`ResultV2.jsx` owns: `filters`, `result`, `score`, `percentile`.

State logic is identical to `Result.jsx`:
- `useParams` parses URL segments into filter key/value pairs
- `getResultId()` maps filters to Firestore result doc ID
- `findOrLoadResult()` checks `props.data.game.results` cache, dispatches `loadResult` if missing
- `updatePercentile()` iterates `result.scores` to compute percentile from score
- `useEffect` chain: game load → `setFiltersFromUrl` → `findOrLoadResult` → `updatePercentile`

Score input debounced 400ms locally. `score` flows as prop to `PercentileBar` and `BarGraph`. `BarGraph.onScoreClick` sets `score` in `ResultV2`.

No new Redux actions or reducers required.

# Personal Score Tracking Design

## Goal

Allow signed-in users to save their scores for board games, see their scores overlaid on the game's score distribution chart, and view a cross-game dashboard showing trends over time.

## Architecture

### Auth

Firebase Auth with Google provider added to the existing `fire.js` setup. Auth state is managed in a new Redux slice (`authSlice`) alongside the existing `data` reducer. The header shows a "Sign in with Google" button when signed out, and a Google avatar + "Sign out" option when signed in. Auth state persists automatically via Firebase's built-in session handling.

### Data Model

Each saved score is a document in `users/{uid}/scores`:

```
{
  gameId: string,        // e.g. "127060"
  gameName: string,      // e.g. "Bora Bora" (denormalized for dashboard reads)
  gameThumbnail: string, // URL (denormalized for dashboard reads)
  score: number,
  date: Timestamp,
}
```

Firestore security rules restrict each user to read and write only their own `users/{uid}` subtree.

### File Structure

**New files:**
- `src/store/authSlice.js` — Redux slice for auth state (`user`, `authLoading`)
- `src/hooks/useUserScores.js` — Hook to load/save scores for the current game
- `src/components/SaveScoreButton.jsx` — Save button with confirmation state
- `src/components/ScoreHistory.jsx` — Per-game score history list below the chart
- `src/pages/MyScores.jsx` — Cross-game dashboard page
- `src/pages/MyScores.css` — Dashboard styles

**Modified files:**
- `fire.js` — Add Firebase Auth initialization
- `src/store/reducers.js` — Add `authSlice` reducer to the root reducer
- `src/index.jsx` — No change needed (store is already configured here via `reducers`)
- `src/components/Header.jsx` — Add sign-in/sign-out button and My Scores link
- `src/components/ScoreChart.jsx` — Overlay user score dots/line on bar chart
- `src/pages/GamePage.jsx` — Render `SaveScoreButton` and `ScoreHistory`
- `src/App.jsx` — Add `/scores` route; wrap app in auth listener on mount
- `firestore.rules` — Add user-scoped read/write rules

### Unauthenticated Experience

The entire existing app — game search, score distribution chart, percentile calculator, filters — works identically whether the user is signed in or not. Score tracking features are purely additive: they appear only when signed in and are never required for any existing functionality.

Auth state is initialized in the background on app mount via `onAuthStateChanged`. The `authLoading` flag in `authSlice` starts `true` and flips to `false` once Firebase resolves the initial auth state (typically <1 second). During this window, score tracking UI is simply not rendered (same as signed-out state) — the rest of the app is unaffected.

### Game Page Changes

The **Save Score button** is always visible when a score is entered, regardless of auth state:

- **Signed out:** clicking the button triggers the Google sign-in flow. After successful sign-in, the score is saved automatically (no need to click again).
- **Signed in:** clicking saves a document to `users/{uid}/scores` and changes the label to "Saved ✓" for 2 seconds.
- The button is disabled (not hidden) when no score is entered.

When signed in, the game page also shows:

- The **score distribution chart** with a secondary series of dots (one per saved score) at the correct x-axis position, visually distinct from the bar chart (e.g., colored markers). Multiple scores for the same game stack or jitter slightly.
- A **score history list** below the chart showing the user's previous scores for that game: score value, date, and percentile computed at render time from the current global result. Newest first. No edit or delete in v1.

The chart overlay and history list are not shown when signed out.

### My Scores Page (`/scores`)

Accessible via a header link when signed in. Shows a card grid, one card per distinct game the user has logged. Each card contains:

- Game thumbnail and name (linking to the game page)
- A sparkline of the user's scores over time (x = date, y = score)
- Most recent score (percentile not shown on dashboard — requires loading each game's result)
- Total number of logged plays

Cards are sorted by most recently played. Empty state shown if no scores logged yet.

### Error Handling

- Auth errors (Google sign-in failure) shown as a brief inline message near the button.
- Firestore write failure on Save Score shown as "Save failed, try again" replacing the button label.
- My Scores page shows a loading spinner while fetching; error message if the fetch fails.

### Firestore Rules

```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;

  match /scores/{scoreId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

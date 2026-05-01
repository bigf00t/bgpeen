# Game Created Trigger Design

**Goal:** When a new game is added, immediately kick off score processing in the background so data appears within ~30 seconds instead of waiting for the next scheduler run (up to 5 minutes).

**Architecture:** A Firestore `onDocumentCreated` trigger on `games/{gameId}` runs a two-phase update: a fast first pass (5 pages) that commits early results, followed by a full pass (100 pages) that commits the complete dataset. The `GamePage` component subscribes to the game doc via `onSnapshot` while `totalScores === 0`, so it updates automatically the instant either commit lands — no polling delay.

---

## Components

### `functions/gameCreatedHandler.js` (new file)

Handles the trigger. Receives the newly created game doc from the event, then runs two sequential update passes using the existing `updatePlays` and `updateResults` helpers:

- **Phase 1:** Create a fresh batch. `updatePlays.updateGamePlays(game, batch, 5)` → `updateResults.updateResults(game, batch, newPlays)` → `batch.commit()`. Gets the most recent ~500 plays into Firestore quickly (~30 seconds).
- **Phase 2:** Create a second fresh batch. `updatePlays.updateGamePlays(game, batch, 100)` → `updateResults.updateResults(game, batch, newPlays)` → `batch.commit()`. Fetches the full play history (pages 1–100, re-fetching pages 1–5 for consistency) and commits a second time.

If phase 2 times out on an unusually popular game, the scheduler's normal staleness check (`playsLastUpdated < 1 month ago`) will pick it up within 5 minutes.

**Cloud Function config:**
- `memory: '1GiB'`
- `timeoutSeconds: 540` (9-minute max for Firestore background triggers)
- `secrets: ['BGG_API_KEY']`

### `functions/index.js` (modified)

Adds one new export:

```javascript
exports.onGameCreated = onDocumentCreated(
  { document: 'games/{gameId}', memory: '1GiB', timeoutSeconds: 540, secrets: ['BGG_API_KEY'] },
  require('./gameCreatedHandler').handler
);
```

### `src/pages/GamePage.jsx` (modified)

Replaces the 60-second `setInterval` auto-refresh with a Firestore `onSnapshot` listener. The listener is only active when `totalScores === 0`. When a snapshot arrives with `totalScores > 0`, it calls `props.loadGame(id)` to pull the updated game into Redux state, then the effect cleanup unsubscribes automatically.

Requires adding `db` from `'../firebase'` and `{ doc, onSnapshot }` from `'firebase/firestore'` to the imports.

---

## Data Flow

```
User clicks "Add this game?"
  → addGameImmediate (HTTP function)
    → addGame.addGame(term) writes game doc to games/{id}
      → onGameCreated trigger fires
        → Phase 1: fetch 5 pages, updateResults, batch.commit()
          → onSnapshot fires in GamePage → UI shows initial stats
        → Phase 2: fetch 100 pages, updateResults, batch.commit()
          → onSnapshot fires in GamePage → UI shows complete stats
```

---

## Error Handling

- If the trigger errors or times out during phase 2, phase 1 data is already committed — the user sees partial stats. The scheduler picks up the full update within 5 minutes.
- If the trigger errors during phase 1, the user stays on the "crunching numbers" screen. The scheduler picks it up within 5 minutes.
- The `onSnapshot` listener is cleaned up on component unmount (navigate away) and when `totalScores` becomes non-zero.

---

## Testing

- Unit test for `gameCreatedHandler.js`: mock `updatePlays` and `updateResults`, verify both phases are called with the correct `maxPages` values (5 then 100), and that `batch.commit()` is called twice.
- Manual test: add a new game, verify the game page shows initial stats within ~30 seconds and updates again shortly after with the full dataset.

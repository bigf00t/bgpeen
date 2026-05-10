# BGG Score Import — Design Spec

## Goal

Allow a signed-in user to import their scored BoardGameGeek plays into the app as if they had entered each score manually on the game page.

## Architecture

A new Cloud Function `/api/import-bgg-scores` fetches all BGG plays for a given username, filters to scored plays for that user, and writes score documents to Firestore. The frontend provides a UI on the My Scores page to save the user's BGG username and trigger imports.

## Tech Stack

Firebase Cloud Functions (Node.js 22, v2 HTTP), Firebase Admin SDK, Axios, xml-js (already in functions/), React + Firestore SDK (frontend).

---

## Data Model

### `users/{uid}` document

Top-level user document, created or updated with `setDoc + merge`. Gains one field:

```
bggUsername: string  // e.g. "bigf00t"
```

### `users/{uid}/scores/{scoreId}` — imported score documents

Document ID: `bgg_{bggPlayId}` (e.g. `bgg_98765432`). Using the play ID as the document ID makes deduplication instant — writing the same play twice is a no-op.

Fields match the existing score shape, plus two additions:

```
gameId:        string     // BGG objectid from the play
gameName:      string     // Game name from the play
gameThumbnail: string     // From games/{gameId}.thumbnail if game exists in DB, else ''
score:         number     // Parsed from player.score
percentile:    number|null // Computed from matching result, or null if no match
filters:       object|null // See below — only includes fields that were present
date:          Timestamp   // From play date (midnight UTC of the play date string)
source:        'bgg'      // Distinguishes imported from manually saved scores
bggPlayId:     string     // BGG play ID for reference
```

### Filters object on imported scores

Built from BGG play data, only non-null/non-zero values included:

| Field     | Source                                              |
|-----------|-----------------------------------------------------|
| `players` | Count of `<player>` elements in the play            |
| `color`   | `player.color` (the importing user's color)         |
| `new`     | `true` if `player.new === '1'`, omitted otherwise   |
| `start`   | `parseInt(player.startposition)` if present         |
| `finish`  | Computed: rank by score descending among all players (1 = highest score); omitted if fewer than 2 players have scores |

Priority for result ID lookup (same as `getResultIdFromFilters`): players → color → all.

---

## Cloud Function: `importBggScores`

**File:** `functions/importBggScores.js`  
**Registered in:** `functions/index.js` as `exports.importBggScores = onRequest(...)`  
**Route:** `/api/import-bgg-scores` (add rewrite in `firebase.json`)

### Auth

Requires Firebase ID token in `Authorization: Bearer {token}` header. Function verifies with `getAuth().verifyIdToken()` to obtain `uid`. Returns 401 if missing or invalid.

### Request

```
POST /api/import-bgg-scores
Authorization: Bearer {idToken}
Content-Type: application/json

{ "bggUsername": "bigf00t" }
```

### Response

```json
{ "imported": 23, "skipped": 5 }
```

Errors: 401 (auth), 400 (missing username), 404 (BGG username not found), 502 (BGG unreachable).

### Algorithm

1. Verify ID token → `uid`
2. Validate `bggUsername` present in request body
3. Fetch all BGG plays (paginated, 100/page):
   ```
   GET https://api.geekdo.com/xmlapi2/plays?username={bggUsername}&subtype=boardgame&type=thing&page={n}
   ```
   Use existing `util.withRetry` and BGG API key header. Parse XML with `xml-js`. Stop when all pages fetched (derive total from `plays._attributes.total`). If total is 0, return `{ imported: 0, skipped: 0 }`.
4. For each play:
   - Find `<player>` element where `username` matches `bggUsername` (case-insensitive)
   - Skip if no matching player, or player's `score` attribute is empty/missing
   - Parse: `score`, `color`, `new`, `startposition`; count total players; compute `finish` rank
5. Batch-fetch unique `gameId`s from `games/{gameId}` to get thumbnails (one `getAll` call per 30 unique IDs)
6. Batch-fetch unique result documents per game for percentile computation (see below)
7. For each qualifying play:
   - Check if `users/{uid}/scores/bgg_{playId}` exists — skip if so (increment skipped)
   - Compute `resultId` from filters using `getResultIdFromFilters` logic
   - Look up pre-fetched result, compute percentile with `computePercentile` logic
   - Write score document with `setDoc` (not `addDoc` — use explicit ID `bgg_{playId}`)
   - Increment imported count
8. Return `{ imported, skipped }`

### Percentile computation (duplicated from `src/utils/scores.js`)

```javascript
const getResultIdFromFilters = (filters) => {
  if (!filters) return 'all';
  if (filters.players) {
    let rid = `count-${filters.players}`;
    if (filters.start) rid += `-start-${filters.start}`;
    else if (filters.finish) rid += `-finish-${filters.finish}`;
    else if (filters.new) rid += `-new`;
    return rid;
  }
  if (filters.color) return `color-${filters.color}`;
  return 'all';
};

const computePercentile = (score, resultScores) => {
  const total = Object.values(resultScores).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const pct = (Object.entries(resultScores).reduce((acc, [k, c]) => {
    const ki = parseInt(k);
    return acc + (ki < score ? c : 0) + (ki === score ? c * 0.5 : 0);
  }, 0) * 100) / total;
  return Math.min(99, Math.max(1, Math.round(pct)));
};
```

### Finish rank computation

```javascript
const computeFinish = (players, targetUsername) => {
  const scored = players.filter(p => p.score !== '' && p.score != null);
  if (scored.length < 2) return null;
  const sorted = [...scored].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  const rank = sorted.findIndex(p => p.username.toLowerCase() === targetUsername.toLowerCase()) + 1;
  return rank > 0 ? rank : null;
};
```

---

## Frontend

### Files changed

- **`src/pages/MyScores.jsx`** — add BGG import section
- **`src/pages/MyScores.css`** — styles for import section

### BGG import section (top of My Scores page)

**State:**
- `bggUsername` — loaded from `users/{uid}` on mount (empty string if doc doesn't exist)
- `editingUsername` — boolean, whether the input is shown
- `importStatus` — `'idle' | 'importing' | 'done' | 'error'`
- `importResult` — `{ imported, skipped } | null`
- `importError` — string | null

**Display — no username saved:**
```
BGG Username: [______________] [Import]
```

**Display — username saved, not editing:**
```
BGG Username: bigf00t [pencil icon]   [Import]
```
Clicking pencil icon shows input pre-filled with current username. Saves on Enter or blur (writes to `users/{uid}` with `setDoc + merge`). Cancel on Escape.

**Import button behavior:**
- Disabled if no username or `importStatus === 'importing'`
- On click: `user.getIdToken()` → POST `/api/import-bgg-scores` with `{ bggUsername }`
- Shows loading state during request
- On success: "Imported {N} scores, {N} already imported" (inline, below button)
- On error: show error message inline

### Loading BGG username on mount

```javascript
useEffect(() => {
  if (!user) return;
  getDoc(doc(db, 'users', user.uid)).then(snap => {
    if (snap.exists()) setBggUsername(snap.data().bggUsername || '');
  });
}, [user]);
```

### Saving BGG username

```javascript
await setDoc(doc(db, 'users', user.uid), { bggUsername }, { merge: true });
```

---

## firebase.json rewrite

Add before the catch-all `**` rewrite:

```json
{ "source": "/api/import-bgg-scores", "function": "importBggScores" }
```

---

## Error cases

| Condition | Behaviour |
|-----------|-----------|
| BGG username not found | BGG returns `total="0"` plays → return `{ imported: 0, skipped: 0 }` |
| BGG API unreachable | `withRetry` exhausted → 502 response; frontend shows "BGG is unreachable, try again" |
| Play has no matching player | Skip silently |
| Game not in our DB | `gameThumbnail: ''`, `percentile: null` |
| No result match for filters | `percentile: null` |
| ID token expired | 401 → frontend shows "Session expired, please refresh" |

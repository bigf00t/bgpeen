# BGG Score Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in users import their scored BGG plays into the app as saved scores, with BGG username persisted and deduplication on re-import.

**Architecture:** A new Cloud Function `/api/import-bgg-scores` fetches all BGG plays for a username, filters to scored plays for that user, and writes score documents to `users/{uid}/scores` using the BGG play ID as the document ID for deduplication. The My Scores page gains a BGG import section with an editable username display and import button.

**Tech Stack:** Firebase Cloud Functions v2 (Node.js 22), firebase-admin Auth + Firestore, Axios, xml-js, React + firebase/firestore SDK.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `functions/importBggScores.js` | Create | Core import logic: BGG API fetch, XML parse, Firestore writes |
| `functions/importBggHandler.js` | Create | HTTP handler: auth verification, request parsing, response |
| `functions/test/importBggScores.test.js` | Create | Unit + integration tests for core module |
| `functions/test/importBggHandler.test.js` | Create | Unit tests for handler |
| `functions/index.js` | Modify | Register `importBggScores` Cloud Function |
| `firebase.json` | Modify | Add rewrite for `/api/import-bgg-scores` |
| `src/pages/MyScores.jsx` | Modify | Add BGG import section (username edit + import button) |
| `src/pages/MyScores.css` | Modify | Styles for import section |

---

## Task 1: Core import module

**Files:**
- Create: `functions/importBggScores.js`

### Context

BGG plays XML API: `GET https://api.geekdo.com/xmlapi2/plays?username={u}&subtype=boardgame&type=thing&page={n}` — 100 plays per page, `total` attribute on root element tells the full count. Parse with `xml-js` (already in `functions/package.json`) using `compact: true`. A single child element comes back as an object; multiple come back as an array — always normalise to array.

Score documents are written to `users/{uid}/scores/bgg_{playId}`. Dedup: one query for existing `source: 'bgg'` docs, build a Set of IDs, skip any play whose doc ID is already in the set.

Firestore `db.getAll(...refs)` lets you batch-read multiple docs in one RPC — use it for thumbnail lookups. `Promise.all` for result lookups (unique gameId+resultId pairs).

- [ ] **Step 1: Create `functions/importBggScores.js`**

```javascript
const axios = require('axios');
const convert = require('xml-js');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const util = require('./util');

// --- Pure utility functions (also exported for testing) ---

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
  const pct =
    (Object.entries(resultScores).reduce((acc, [k, c]) => {
      const ki = parseInt(k);
      return acc + (ki < score ? c : 0) + (ki === score ? c * 0.5 : 0);
    }, 0) *
      100) /
    total;
  return Math.min(99, Math.max(1, Math.round(pct)));
};

// Rank player by score descending within a play (1 = highest score).
// Returns null if fewer than 2 players have numeric scores.
const computeFinish = (playerAttrs, targetUsername) => {
  const scored = playerAttrs.filter(
    (p) => p.score !== '' && p.score != null && !isNaN(parseFloat(p.score))
  );
  if (scored.length < 2) return null;
  const sorted = [...scored].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  const rank =
    sorted.findIndex(
      (p) => (p.username || '').toLowerCase() === targetUsername.toLowerCase()
    ) + 1;
  return rank > 0 ? rank : null;
};

const buildFilters = (playerAttrs, targetUsername, playerCount) => {
  const target = playerAttrs.find(
    (a) => (a.username || '').toLowerCase() === targetUsername.toLowerCase()
  );
  if (!target) return null;
  const filters = {};
  if (playerCount > 0) filters.players = playerCount;
  if (target.color) filters.color = target.color;
  if (target.new === '1') filters.new = true;
  const start = parseInt(target.startposition);
  if (start > 0) filters.start = start;
  const finish = computeFinish(playerAttrs, targetUsername);
  if (finish) filters.finish = finish;
  return Object.keys(filters).length ? filters : null;
};

// --- BGG API fetch ---

const fetchAllBggPlays = async (bggUsername) => {
  const plays = [];
  let page = 1;
  let total = null;

  while (total === null || plays.length < total) {
    const response = await util.withRetry(() =>
      axios.get('https://api.geekdo.com/xmlapi2/plays', {
        params: { username: bggUsername, subtype: 'boardgame', type: 'thing', page },
        headers: { Authorization: `Bearer ${util.getApiKey()}` },
      })
    );
    const parsed = convert.xml2js(response.data, { compact: true });
    const playsEl = parsed.plays;
    if (!playsEl) break;
    if (total === null) {
      total = parseInt(playsEl._attributes.total) || 0;
      if (total === 0) break;
    }
    const batch = playsEl.play
      ? Array.isArray(playsEl.play)
        ? playsEl.play
        : [playsEl.play]
      : [];
    plays.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return plays;
};

// --- Main export ---

const importBggScores = async (uid, bggUsername) => {
  const db = getFirestore();
  const rawPlays = await fetchAllBggPlays(bggUsername);

  // Collect scored plays for the target user
  const scoredPlays = [];
  for (const play of rawPlays) {
    const playerEl = play.players?.player;
    if (!playerEl) continue;
    const playerAttrs = (Array.isArray(playerEl) ? playerEl : [playerEl]).map(
      (p) => p._attributes || {}
    );
    const target = playerAttrs.find(
      (a) => (a.username || '').toLowerCase() === bggUsername.toLowerCase()
    );
    if (!target || !target.score || target.score === '') continue;
    const score = parseFloat(target.score);
    if (isNaN(score)) continue;

    const item = Array.isArray(play.item) ? play.item[0] : play.item;
    const gameId = item._attributes.objectid;
    const gameName = item._attributes.name;
    const playId = play._attributes.id;
    const dateStr = play._attributes.date;
    const filters = buildFilters(playerAttrs, bggUsername, playerAttrs.length);
    const resultId = getResultIdFromFilters(filters);

    scoredPlays.push({ playId, gameId, gameName, score, dateStr, filters, resultId });
  }

  if (scoredPlays.length === 0) return { imported: 0, skipped: 0 };

  // Batch-fetch thumbnails
  const uniqueGameIds = [...new Set(scoredPlays.map((p) => p.gameId))];
  const thumbnailMap = {};
  for (let i = 0; i < uniqueGameIds.length; i += 100) {
    const chunk = uniqueGameIds.slice(i, i + 100);
    const refs = chunk.map((id) => db.collection('games').doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => {
      thumbnailMap[snap.id] = snap.exists ? snap.data().thumbnail || '' : '';
    });
  }

  // Batch-fetch result docs for percentile computation
  const uniqueResultKeys = [...new Set(scoredPlays.map((p) => `${p.gameId}:${p.resultId}`))];
  const resultMap = {};
  await Promise.all(
    uniqueResultKeys.map(async (key) => {
      const colonIdx = key.indexOf(':');
      const gameId = key.slice(0, colonIdx);
      const resultId = key.slice(colonIdx + 1);
      const snap = await db
        .collection('games')
        .doc(gameId)
        .collection('results')
        .doc(resultId)
        .get();
      resultMap[key] = snap.exists ? snap.data().scores : null;
    })
  );

  // Get existing BGG imports for this user (dedup)
  const existingSnap = await db
    .collection('users')
    .doc(uid)
    .collection('scores')
    .where('source', '==', 'bgg')
    .get();
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));

  // Write new score documents
  let imported = 0;
  let skipped = 0;

  for (const p of scoredPlays) {
    const docId = `bgg_${p.playId}`;
    if (existingIds.has(docId)) {
      skipped++;
      continue;
    }

    const resultScores = resultMap[`${p.gameId}:${p.resultId}`];
    const percentile = resultScores ? computePercentile(p.score, resultScores) : null;
    const [y, m, d] = p.dateStr.split('-').map(Number);
    const date = Timestamp.fromDate(new Date(y, m - 1, d));

    await db
      .collection('users')
      .doc(uid)
      .collection('scores')
      .doc(docId)
      .set({
        gameId: p.gameId,
        gameName: p.gameName,
        gameThumbnail: thumbnailMap[p.gameId] || '',
        score: p.score,
        percentile,
        filters: p.filters,
        date,
        source: 'bgg',
        bggPlayId: p.playId,
      });
    imported++;
  }

  return { imported, skipped };
};

module.exports = {
  getResultIdFromFilters,
  computePercentile,
  computeFinish,
  buildFilters,
  fetchAllBggPlays,
  importBggScores,
};
```

- [ ] **Step 2: Verify the file has no syntax errors**

```powershell
node -e "require('./functions/importBggScores')" 2>&1
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```powershell
git add functions/importBggScores.js
git commit -m "feat: add BGG plays import core logic"
```

---

## Task 2: Tests for core import module

**Files:**
- Create: `functions/test/importBggScores.test.js`

### Context

Run tests from the repo root with `cd functions && npx jest test/importBggScores.test.js --no-coverage`. Mock `axios`, `firebase-admin/firestore`, and `./util` so tests are fast and offline. The xml-js library can run un-mocked since it's a pure parser.

- [ ] **Step 1: Write `functions/test/importBggScores.test.js`**

```javascript
jest.mock('axios');
jest.mock('firebase-admin/firestore');
jest.mock('../util');

const axios = require('axios');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const util = require('../util');
const {
  getResultIdFromFilters,
  computePercentile,
  computeFinish,
  buildFilters,
  fetchAllBggPlays,
  importBggScores,
} = require('../importBggScores');

// Timestamp.fromDate mock
Timestamp.fromDate = jest.fn((d) => ({ _date: d }));

beforeEach(() => {
  jest.clearAllMocks();
  util.withRetry.mockImplementation((fn) => fn());
  util.getApiKey.mockReturnValue('test-key');
});

// --- getResultIdFromFilters ---

describe('getResultIdFromFilters', () => {
  test('returns "all" with no filters', () => {
    expect(getResultIdFromFilters(null)).toBe('all');
    expect(getResultIdFromFilters({})).toBe('all');
  });

  test('returns count result for players filter', () => {
    expect(getResultIdFromFilters({ players: 3 })).toBe('count-3');
  });

  test('appends start sub-filter', () => {
    expect(getResultIdFromFilters({ players: 3, start: 2 })).toBe('count-3-start-2');
  });

  test('appends finish sub-filter (start takes precedence)', () => {
    expect(getResultIdFromFilters({ players: 3, finish: 1 })).toBe('count-3-finish-1');
    expect(getResultIdFromFilters({ players: 3, start: 2, finish: 1 })).toBe('count-3-start-2');
  });

  test('appends new sub-filter', () => {
    expect(getResultIdFromFilters({ players: 3, new: true })).toBe('count-3-new');
  });

  test('returns color result', () => {
    expect(getResultIdFromFilters({ color: 'Blue' })).toBe('color-Blue');
  });

  test('players takes precedence over color', () => {
    expect(getResultIdFromFilters({ players: 3, color: 'Blue' })).toBe('count-3');
  });
});

// --- computePercentile ---

describe('computePercentile', () => {
  test('returns correct percentile', () => {
    const scores = { '40': 2, '50': 6, '60': 2 };
    // score=50: below=(2)*100/10=20; at=(6*0.5)*100/10=30; total=50
    expect(computePercentile(50, scores)).toBe(50);
  });

  test('returns null for empty scores', () => {
    expect(computePercentile(50, {})).toBe(null);
  });

  test('clamps to 1 minimum', () => {
    expect(computePercentile(1, { '50': 100 })).toBe(1);
  });

  test('clamps to 99 maximum', () => {
    expect(computePercentile(100, { '50': 100 })).toBe(99);
  });
});

// --- computeFinish ---

describe('computeFinish', () => {
  test('returns rank 1 for highest scorer', () => {
    const players = [
      { username: 'alice', score: '61' },
      { username: 'bob', score: '47' },
      { username: 'carol', score: '52' },
    ];
    expect(computeFinish(players, 'alice')).toBe(1);
  });

  test('returns rank 2 for middle scorer', () => {
    const players = [
      { username: 'alice', score: '52' },
      { username: 'bob', score: '47' },
      { username: 'carol', score: '61' },
    ];
    expect(computeFinish(players, 'alice')).toBe(2);
  });

  test('returns null for solo play', () => {
    expect(computeFinish([{ username: 'alice', score: '47' }], 'alice')).toBe(null);
  });

  test('returns null when only one player has a score', () => {
    const players = [
      { username: 'alice', score: '47' },
      { username: 'bob', score: '' },
    ];
    expect(computeFinish(players, 'alice')).toBe(null);
  });

  test('is case-insensitive', () => {
    const players = [
      { username: 'Alice', score: '61' },
      { username: 'Bob', score: '47' },
    ];
    expect(computeFinish(players, 'alice')).toBe(1);
  });
});

// --- buildFilters ---

describe('buildFilters', () => {
  test('extracts all available filters', () => {
    const attrs = [
      { username: 'alice', color: 'Blue', new: '0', startposition: '2', score: '47' },
      { username: 'bob', color: 'Red', new: '0', startposition: '1', score: '52' },
    ];
    // alice=47, bob=52 → alice finishes 2nd
    expect(buildFilters(attrs, 'alice', 2)).toEqual({
      players: 2,
      color: 'Blue',
      start: 2,
      finish: 2,
    });
  });

  test('sets new:true when player.new is "1"', () => {
    const attrs = [
      { username: 'alice', color: '', new: '1', startposition: '', score: '40' },
      { username: 'bob', color: '', new: '0', startposition: '', score: '50' },
    ];
    const result = buildFilters(attrs, 'alice', 2);
    expect(result.new).toBe(true);
  });

  test('omits start when startposition is absent', () => {
    const attrs = [
      { username: 'alice', color: 'Blue', new: '0', startposition: '', score: '47' },
      { username: 'bob', color: 'Red', new: '0', startposition: '', score: '52' },
    ];
    const result = buildFilters(attrs, 'alice', 2);
    expect(result.start).toBeUndefined();
  });

  test('returns null when target player not found', () => {
    expect(buildFilters([{ username: 'bob', score: '40' }], 'alice', 1)).toBe(null);
  });
});

// --- fetchAllBggPlays ---

describe('fetchAllBggPlays', () => {
  const makeXml = (total, plays) => `<?xml version="1.0" encoding="utf-8"?>
<plays username="testuser" total="${total}" page="1">
${plays}
</plays>`;

  const playXml = (id, gameName, objectid, players) => `
  <play id="${id}" date="2023-01-15" quantity="1" incomplete="0" nowinstats="1" location="">
    <item name="${gameName}" objectid="${objectid}" objecttype="thing" subtype="boardgame"/>
    <players>${players}</players>
  </play>`;

  const playerXml = (username, score, color = '', start = '', isNew = '0') =>
    `<player username="${username}" score="${score}" color="${color}" startposition="${start}" new="${isNew}" win="0" rating="0"/>`;

  test('returns empty array when total is 0', async () => {
    axios.get.mockResolvedValue({ data: makeXml(0, '') });
    const result = await fetchAllBggPlays('nobody');
    expect(result).toEqual([]);
  });

  test('returns plays from a single page', async () => {
    const xml = makeXml(
      1,
      playXml(
        '98765',
        'Wingspan',
        '266192',
        playerXml('testuser', '47', 'Blue', '2') + playerXml('other', '52', 'Red', '1')
      )
    );
    axios.get.mockResolvedValue({ data: xml });
    const result = await fetchAllBggPlays('testuser');
    expect(result).toHaveLength(1);
    expect(result[0]._attributes.id).toBe('98765');
  });
});

// --- importBggScores integration ---

describe('importBggScores', () => {
  const makeXml = (total, plays) => `<?xml version="1.0" encoding="utf-8"?>
<plays username="testuser" total="${total}" page="1">
${plays}
</plays>`;

  const singlePlayXml = makeXml(
    1,
    `<play id="98765" date="2023-01-15" quantity="1" incomplete="0" nowinstats="1" location="">
    <item name="Wingspan" objectid="266192" objecttype="thing" subtype="boardgame"/>
    <players>
      <player username="testuser" score="47" color="Blue" startposition="2" new="0" win="0" rating="0"/>
      <player username="other" score="52" color="Red" startposition="1" new="0" win="1" rating="0"/>
    </players>
  </play>`
  );

  const makeDb = ({ existingIds = [], thumbnail = '', resultScores = null } = {}) => {
    const mockSet = jest.fn().mockResolvedValue();
    const mockGet = jest.fn().mockResolvedValue({
      exists: !!resultScores,
      data: () => ({ scores: resultScores }),
    });
    const mockWhere = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        docs: existingIds.map((id) => ({ id })),
      }),
    });
    const mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, set: mockSet }),
        where: mockWhere,
      }),
    });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc, where: mockWhere });
    const mockGetAll = jest.fn().mockResolvedValue([
      { id: '266192', exists: !!thumbnail, data: () => ({ thumbnail }) },
    ]);
    return { collection: mockCollection, getAll: mockGetAll, _mockSet: mockSet };
  };

  test('imports a new scored play', async () => {
    axios.get.mockResolvedValue({ data: singlePlayXml });
    const db = makeDb();
    getFirestore.mockReturnValue(db);

    const result = await importBggScores('uid123', 'testuser');
    expect(result).toEqual({ imported: 1, skipped: 0 });
    expect(db._mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: '266192',
        gameName: 'Wingspan',
        score: 47,
        source: 'bgg',
        bggPlayId: '98765',
      })
    );
  });

  test('skips already-imported play', async () => {
    axios.get.mockResolvedValue({ data: singlePlayXml });
    const db = makeDb({ existingIds: ['bgg_98765'] });
    getFirestore.mockReturnValue(db);

    const result = await importBggScores('uid123', 'testuser');
    expect(result).toEqual({ imported: 0, skipped: 1 });
    expect(db._mockSet).not.toHaveBeenCalled();
  });

  test('returns zeros when user has no scored plays', async () => {
    axios.get.mockResolvedValue({
      data: makeXml(0, ''),
    });
    const db = makeDb();
    getFirestore.mockReturnValue(db);

    const result = await importBggScores('uid123', 'testuser');
    expect(result).toEqual({ imported: 0, skipped: 0 });
  });
});
```

- [ ] **Step 2: Run tests and confirm they pass**

```powershell
cd functions; npx jest test/importBggScores.test.js --no-coverage; cd ..
```

Expected output: all tests pass, no failures.

- [ ] **Step 3: Commit**

```powershell
git add functions/test/importBggScores.test.js
git commit -m "test: add BGG import core module tests"
```

---

## Task 3: HTTP handler

**Files:**
- Create: `functions/importBggHandler.js`

### Context

Pattern matches `functions/addGameHandler.js`. Uses `firebase-admin/auth` to verify the Firebase ID token from the `Authorization: Bearer {token}` header. Calls `importBggScores` and returns `{ imported, skipped }`. Returns 502 on any BGG/network error so the frontend can display a friendly message.

- [ ] **Step 1: Create `functions/importBggHandler.js`**

```javascript
const { getAuth } = require('firebase-admin/auth');
const { importBggScores } = require('./importBggScores');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let uid;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const bggUsername = (req.body?.bggUsername || '').trim();
  if (!bggUsername) {
    res.status(400).json({ error: 'Missing bggUsername' });
    return;
  }

  try {
    const result = await importBggScores(uid, bggUsername);
    res.status(200).json(result);
  } catch (err) {
    console.error('importBggScores failed:', err);
    res.status(502).json({ error: 'Failed to fetch plays from BGG' });
  }
};

module.exports = { handler };
```

- [ ] **Step 2: Write `functions/test/importBggHandler.test.js`**

```javascript
jest.mock('firebase-admin/auth');
jest.mock('../importBggScores');

const { getAuth } = require('firebase-admin/auth');
const { importBggScores } = require('../importBggScores');
const { handler } = require('../importBggHandler');

const makeReq = (method, body, headers = {}) => ({ method, body, headers });
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  getAuth.mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'uid123' }),
  });
});

const authedReq = (body) =>
  makeReq('POST', body, { authorization: 'Bearer valid-token' });

test('returns 405 for non-POST', async () => {
  const res = makeRes();
  await handler(makeReq('GET', {}, {}), res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 401 when Authorization header is missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { bggUsername: 'alice' }, {}), res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 401 when token is invalid', async () => {
  getAuth.mockReturnValue({
    verifyIdToken: jest.fn().mockRejectedValue(new Error('invalid')),
  });
  const res = makeRes();
  await handler(authedReq({ bggUsername: 'alice' }), res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 400 when bggUsername is missing', async () => {
  const res = makeRes();
  await handler(authedReq({}), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing bggUsername' });
});

test('returns 400 when bggUsername is whitespace-only', async () => {
  const res = makeRes();
  await handler(authedReq({ bggUsername: '   ' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 200 with import result on success', async () => {
  importBggScores.mockResolvedValue({ imported: 5, skipped: 2 });
  const res = makeRes();
  await handler(authedReq({ bggUsername: 'alice' }), res);
  expect(importBggScores).toHaveBeenCalledWith('uid123', 'alice');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ imported: 5, skipped: 2 });
});

test('returns 502 when importBggScores throws', async () => {
  importBggScores.mockRejectedValue(new Error('BGG unreachable'));
  const res = makeRes();
  await handler(authedReq({ bggUsername: 'alice' }), res);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch plays from BGG' });
});

test('trims bggUsername before passing to importBggScores', async () => {
  importBggScores.mockResolvedValue({ imported: 0, skipped: 0 });
  const res = makeRes();
  await handler(authedReq({ bggUsername: '  alice  ' }), res);
  expect(importBggScores).toHaveBeenCalledWith('uid123', 'alice');
});
```

- [ ] **Step 3: Run tests**

```powershell
cd functions; npx jest test/importBggHandler.test.js --no-coverage; cd ..
```

Expected: all tests pass.

- [ ] **Step 4: Run full test suite**

```powershell
cd functions; npx jest --no-coverage; cd ..
```

Expected: all tests pass (no regressions).

- [ ] **Step 5: Commit**

```powershell
git add functions/importBggHandler.js functions/test/importBggHandler.test.js
git commit -m "feat: add BGG import HTTP handler"
```

---

## Task 4: Wire up function and routing

**Files:**
- Modify: `functions/index.js`
- Modify: `firebase.json`

### Context

The function needs `BGG_API_KEY` secret (same as other BGG-calling functions). `timeoutSeconds: 300` because a user with hundreds of plays may take time to process. No `enforceAppCheck` — auth is handled via ID token verification in the handler instead.

- [ ] **Step 1: Add export to `functions/index.js`**

Open `functions/index.js`. After the `exports.addGameImmediate` block (around line 79), add:

```javascript
exports.importBggScores = onRequest(
  { memory: '512MiB', timeoutSeconds: 300, secrets: ['BGG_API_KEY'] },
  require('./importBggHandler').handler
);
```

- [ ] **Step 2: Add rewrite to `firebase.json`**

Open `firebase.json`. In the `rewrites` array, add this entry **before** the `/:id/:name` entries (so it doesn't get captured by them):

```json
{
  "source": "/api/import-bgg-scores",
  "function": "importBggScores"
},
```

The rewrites array should now start with:
```json
"rewrites": [
  { "source": "/preview/**", "function": "servePreviewImage" },
  { "source": "/api/record-view", "function": "recordGameView" },
  { "source": "/api/add-game", "function": "addGameImmediate" },
  { "source": "/api/import-bgg-scores", "function": "importBggScores" },
  { "source": "/:id/:name/**", "function": "serveOgTags" },
  ...
```

- [ ] **Step 3: Verify no syntax errors in index.js**

```powershell
node -e "require('./functions/index.js')" 2>&1
```

Expected: Firebase Admin not initialized error (expected in this context — means the require succeeded with no syntax errors).

- [ ] **Step 4: Commit**

```powershell
git add functions/index.js firebase.json
git commit -m "feat: register importBggScores Cloud Function and add routing"
```

---

## Task 5: Frontend — My Scores import UI

**Files:**
- Modify: `src/pages/MyScores.jsx`
- Modify: `src/pages/MyScores.css`

### Context

`MyScores.jsx` currently imports from `firebase/firestore`: `collection, query, orderBy, onSnapshot, doc, getDoc`. Add `setDoc` to this import. Also import `auth` from `'../firebase'` to call `auth.currentUser.getIdToken()`.

The BGG import section sits between the `<h1 className="my-scores-title">` and the empty-state/grid content. State: `bggUsername` (string, loaded from Firestore on mount), `editingUsername` (bool), `editValue` (string for the controlled input), `importStatus` ('idle'|'importing'|'done'|'error'), `importResult` ({ imported, skipped } | null), `importError` (string | null).

- [ ] **Step 1: Update imports in `src/pages/MyScores.jsx`**

Change line 4:
```javascript
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
```
to:
```javascript
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
```

Add after the `import { db } from '../firebase';` line:
```javascript
import { auth } from '../firebase';
```

- [ ] **Step 2: Add new state variables in the `MyScores` component**

After the existing state declarations (`allScores`, `loading`, `error`, `gameResults`), add:

```javascript
const [bggUsername, setBggUsername] = useState('');
const [editingUsername, setEditingUsername] = useState(false);
const [editValue, setEditValue] = useState('');
const [importStatus, setImportStatus] = useState('idle');
const [importResult, setImportResult] = useState(null);
const [importError, setImportError] = useState(null);
```

- [ ] **Step 3: Add useEffect to load BGG username on mount**

After the existing `useEffect` for loading scores, add:

```javascript
useEffect(() => {
  if (!user) return;
  getDoc(doc(db, 'users', user.uid)).then((snap) => {
    if (snap.exists()) setBggUsername(snap.data().bggUsername || '');
  });
}, [user?.uid]);
```

- [ ] **Step 4: Add handler functions**

Before the `if (authLoading || loading)` check, add:

```javascript
const saveUsername = async (value) => {
  const trimmed = value.trim();
  if (!trimmed) { setEditingUsername(false); return; }
  setBggUsername(trimmed);
  setEditingUsername(false);
  await setDoc(doc(db, 'users', user.uid), { bggUsername: trimmed }, { merge: true });
};

const handleImport = async () => {
  if (!bggUsername || importStatus === 'importing') return;
  setImportStatus('importing');
  setImportResult(null);
  setImportError(null);
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/import-bgg-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bggUsername }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error ${res.status}`);
    }
    const data = await res.json();
    setImportResult(data);
    setImportStatus('done');
  } catch (err) {
    setImportError(err.message);
    setImportStatus('error');
  }
};
```

- [ ] **Step 5: Add BGG import section JSX**

In the returned JSX, between `<h1 className="my-scores-title">My Scores</h1>` and the `{gameCards.length === 0 ? ...}` block, add:

```jsx
<div className="bgg-import">
  <div className="bgg-import-row">
    <span className="bgg-import-label">BGG Username:</span>
    {editingUsername ? (
      <input
        className="bgg-import-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveUsername(editValue);
          if (e.key === 'Escape') setEditingUsername(false);
        }}
        onBlur={() => saveUsername(editValue)}
        autoFocus
      />
    ) : bggUsername ? (
      <>
        <span className="bgg-import-username">{bggUsername}</span>
        <button
          className="bgg-import-edit-btn"
          onClick={() => { setEditValue(bggUsername); setEditingUsername(true); }}
          title="Edit username"
        >
          ✎
        </button>
      </>
    ) : (
      <input
        className="bgg-import-input"
        value={editValue}
        placeholder="your BGG username"
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && editValue.trim()) saveUsername(editValue);
        }}
        onBlur={() => { if (editValue.trim()) saveUsername(editValue); }}
      />
    )}
    <button
      className={`bgg-import-btn${importStatus === 'importing' ? ' bgg-import-btn--loading' : ''}`}
      onClick={handleImport}
      disabled={!bggUsername || importStatus === 'importing'}
    >
      {importStatus === 'importing' ? 'Importing…' : 'Import from BGG'}
    </button>
  </div>
  {importStatus === 'done' && importResult && (
    <p className="bgg-import-result">
      Imported {importResult.imported} score{importResult.imported !== 1 ? 's' : ''}
      {importResult.skipped > 0 ? `, ${importResult.skipped} already imported` : ''}
    </p>
  )}
  {importStatus === 'error' && (
    <p className="bgg-import-error">{importError || 'Import failed — try again'}</p>
  )}
</div>
```

- [ ] **Step 6: Add CSS for import section to `src/pages/MyScores.css`**

Append to the end of `src/pages/MyScores.css`:

```css
.bgg-import {
  margin-bottom: 28px;
  padding: 14px 18px;
  background: #1e2028;
  border-radius: 10px;
  border: 1px solid #2a2d35;
}

.bgg-import-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.bgg-import-label {
  font-size: 0.78rem;
  color: #888;
  white-space: nowrap;
}

.bgg-import-username {
  font-size: 0.85rem;
  color: #ccc;
}

.bgg-import-input {
  background: #2a2d35;
  border: 1px solid #3a3d45;
  border-radius: 6px;
  color: #ccc;
  font-size: 0.85rem;
  padding: 5px 10px;
  font-family: inherit;
  outline: none;
  width: 160px;
}
.bgg-import-input:focus { border-color: #7986cb; }

.bgg-import-edit-btn {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 1rem;
  padding: 0 4px;
  line-height: 1;
}
.bgg-import-edit-btn:hover { color: #aaa; }

.bgg-import-btn {
  background: rgba(121, 134, 203, 0.12);
  border: 1px solid rgba(121, 134, 203, 0.3);
  border-radius: 6px;
  color: #9fa8da;
  font-size: 0.78rem;
  padding: 5px 14px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  margin-left: auto;
  transition: background 0.15s;
}
.bgg-import-btn:hover:not(:disabled) { background: rgba(121, 134, 203, 0.22); }
.bgg-import-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.bgg-import-result {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: #7bc67e;
}

.bgg-import-error {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: #ef5350;
}

@media (max-width: 700px) {
  .bgg-import-btn { margin-left: 0; }
}
```

- [ ] **Step 7: Verify the dev build compiles without errors**

```powershell
npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 10
```

Expected: no TypeScript/build errors (chunk size warnings are fine).

- [ ] **Step 8: Commit**

```powershell
git add src/pages/MyScores.jsx src/pages/MyScores.css
git commit -m "feat: add BGG score import UI to My Scores page"
```

---

## Final step: Deploy

- [ ] **Build and deploy both hosting and functions**

```powershell
npm run build; firebase deploy
```

Expected: deploy completes successfully.

- [ ] **Smoke test in production**
  - Sign in on goodat.games
  - Go to My Scores
  - Enter a BGG username and click Import from BGG
  - Confirm scores appear in the grid after import
  - Click Import again — confirm result shows "0 already imported" count equals previous import count (dedup working)

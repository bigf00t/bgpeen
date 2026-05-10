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

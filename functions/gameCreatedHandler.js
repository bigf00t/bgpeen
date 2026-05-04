const { getFirestore } = require('firebase-admin/firestore');
const updatePlays = require('./updatePlays');
const updateResults = require('./updateResults');

const handler = async (event) => {
  const data = event.data.data();
  if ((data?.totalScores ?? 0) > 0 || (data?.totalPlays ?? 0) > 0) return;
  const game = { id: event.params.gameId, ...data };
  const db = getFirestore();
  try {
    // Phase 1: fetch first 5 pages (~500 plays) for fast initial results
    const batch1 = db.batch();
    const plays1 = await updatePlays.updateGamePlays(game, batch1, 5);
    await updateResults.updateResults(game, batch1, plays1, false);
    await batch1.commit();

    // Re-fetch so Phase 2 sees the counts written by Phase 1
    const snap = await db.collection('games').doc(game.id).get();
    const game2 = { id: game.id, ...snap.data() };

    // Phase 2: fetch full history (100 pages) for complete dataset
    const batch2 = db.batch();
    const plays2 = await updatePlays.updateGamePlays(game2, batch2, 100);
    await updateResults.updateResults(game2, batch2, plays2, false);
    await batch2.commit();
  } catch (err) {
    console.error(`onGameCreated failed for game ${game.id} (${game.name}): ${err.message}`, err.stack);
    throw err;
  }
};

module.exports = { handler };

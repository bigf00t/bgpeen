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
    const phase1Batch = db.batch();
    const initialPlays = await updatePlays.updateGamePlays(game, phase1Batch, 5);
    await updateResults.updateResults(game, phase1Batch, initialPlays, false);
    await phase1Batch.commit();

    // Re-fetch so Phase 2 sees the counts written by Phase 1
    const snap = await db.collection('games').doc(game.id).get();
    const refreshedGame = { id: game.id, ...snap.data() };

    // Phase 2: fetch full history (100 pages) for complete dataset
    const phase2Batch = db.batch();
    const fullPlays = await updatePlays.updateGamePlays(refreshedGame, phase2Batch, 100);
    await updateResults.updateResults(refreshedGame, phase2Batch, fullPlays, false);
    await phase2Batch.commit();
  } catch (err) {
    console.error(`onGameCreated failed for game ${game.id} (${game.name}): ${err.message}`, err.stack);
    throw err;
  }
};

module.exports = { handler };

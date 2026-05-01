const { getFirestore } = require('firebase-admin/firestore');
const updatePlays = require('./updatePlays');
const updateResults = require('./updateResults');

const handler = async (event) => {
  const game = { id: event.params.gameId, ...event.data.data() };
  const db = getFirestore();

  // Phase 1: fetch first 5 pages (~500 plays) for fast initial results
  const batch1 = db.batch();
  const plays1 = await updatePlays.updateGamePlays(game, batch1, 5);
  await updateResults.updateResults(game, batch1, plays1);
  await batch1.commit();

  // Phase 2: fetch full history (100 pages) for complete dataset
  const batch2 = db.batch();
  const plays2 = await updatePlays.updateGamePlays(game, batch2, 100);
  await updateResults.updateResults(game, batch2, plays2);
  await batch2.commit();
};

module.exports = { handler };

const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const util = require('./util');
const update = require('./update_results');

exports.manualResultsUpdate = async (gameIds) => {
  let query = firestore.collection('games');

  if (gameIds && gameIds.length > 0) {
    query = query.where('id', 'in', gameIds);
  }

  const gamesSnapshot = await query.get();

  const games = util.docsToArray(gamesSnapshot);

  for (const game of games) {
    console.info(`Started updating results for: ${game.name}`);

    // Expensive query!
    const playsSnapshot = await firestore.collection('games').doc(game.id).collection('plays').get();

    const batch = firestore.batch();

    await update.updateResults(game, batch, util.docsToArray(playsSnapshot), true);

    await batch.commit();
  }
};

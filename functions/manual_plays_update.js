const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const _ = require('lodash');

const util = require('./util');
const update_plays = require('./update_plays');
const update_results = require('./update_results');

exports.manualPlaysUpdate = async (gameIds, maxPages) => {
  const gamesSnapshot = await firestore.collection('games').where('id', 'in', gameIds).get();

  const games = util.docsToArray(gamesSnapshot);

  const batch = firestore.batch();

  for (const game of games) {
    const newPlays = await update_plays.updateGamePlays(game, batch, maxPages);
    await update_results.updateResults(game, batch, newPlays, false);
  }

  await batch.commit();
};

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const util = require('./util');

exports.manualGamesUpdate = async (gameIds) => {
  let query = firestore.collection('games');

  if (gameIds && gameIds.length > 0) {
    query = query.where('id', 'in', gameIds);
  }

  const gamesSnapshot = await query.get();

  const games = util.docsToArray(gamesSnapshot);

  let gameNum = 0;
  for (const game of games) {
    gameNum++;
    console.log(`${'-'.repeat(50)}\nUpdating game ${gameNum} of ${games.length}: ${game.name} (${game.id})`);

    const gameRef = firestore.collection('games').doc(game.id);

    const gameResultsRef = gameRef.collection('results');
    const gameResultsSnapshot = await gameResultsRef.get();
    const gameResults = util.docsToArray(gameResultsSnapshot);

    console.log(`Deleting ${gameResults.length} results`);

    for (const result of gameResults) {
      gameResultsRef.doc(result.id).delete();
    }

    console.log('Results deleted');

    const playsRef = firestore.collection('plays').doc(game.id);

    const batch = firestore.batch();

    // Reset all plays
    batch.set(playsRef, {
      minDatePlayIds: '',
      maxDatePlayIds: '',
      totalPlays: 0,
      unusablePlays: 0,
      remainingPlays: 0,
      newestPlayDate: '',
      oldestPlayDate: '',
      maxDate: '',
      minDate: '',
      hasMinPlays: false,
      hasNoPlays: true,
      playsLastUpdated: null,
    });

    batch.update(playsRef, {
      hasMinPlays: admin.firestore.FieldValue.delete(),
      hasNoPlays: admin.firestore.FieldValue.delete(),
      unusablePlays: admin.firestore.FieldValue.delete(),
    });

    console.log('Play data reset');

    batch.update(gameRef, {
      totalValidPlays: 0,
      totalInvalidPlays: 0,
      totalScores: 0,
      mean: 0,
      gameType: '',
    });

    console.log('Game fields reset');

    await batch.commit();
  }
};

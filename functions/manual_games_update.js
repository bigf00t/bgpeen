// const admin = require('firebase-admin');
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

    // const gameRef = firestore.collection('games').doc(game.id);
    // const gamePlaysRef = gameRef.collection('plays');
    // const gamePlaysSnapshot = await gamePlaysRef.get();
    // const gamePlays = util.docsToArray(gamePlaysSnapshot);

    // console.log(`Deleting ${gamePlays.length} old plays`);

    // for (const play of gamePlays) {
    //   gamePlaysRef.doc(play.id).delete();
    // }

    // console.log('Old plays deleted');

    // const gameResultsRef = gameRef.collection('results');
    // const gameResultsSnapshot = await gameResultsRef.get();
    // const gameResults = util.docsToArray(gameResultsSnapshot);

    // console.log(`Deleting ${gameResults.length} results`);

    // for (const result of gameResults) {
    //   gameResultsRef.doc(result.id).delete();
    // }

    // console.log('Results deleted');

    // const playsRef = firestore.collection('plays').doc(game.id);

    const batch = firestore.batch();

    // // Reset all plays
    // batch.set(playsRef, {
    //   minDatePlayIds: '',
    //   maxDatePlayIds: '',
    //   totalPlays: 0,
    //   unusablePlays: 0,
    //   remainingPlays: 0,
    //   newestPlayDate: '',
    //   oldestPlayDate: '',
    //   maxDate: '',
    //   minDate: '',
    //   hasMinPlays: false,
    //   hasNoPlays: true,
    //   playsLastUpdated: null,
    // });

    // batch.update(playsRef, {
    //   hasMinPlays: admin.firestore.FieldValue.delete(),
    //   hasNoPlays: admin.firestore.FieldValue.delete(),
    //   unusablePlays: admin.firestore.FieldValue.delete(),
    // });

    // console.log('Play data reset');

    // batch.update(gameRef, {
    //   totalValidPlays: 0,
    //   totalInvalidPlays: 0,
    //   totalScores: 0,
    //   mean: 0,
    //   gameType: '',
    // });

    // console.log('Game fields reset');

    // if (game.bggThumbnail == undefined) {
    //   console.log('Game schema already updated, skipping');
    //   await batch.commit();
    //   continue;
    // }

    // const detailsRef = firestore.collection('details').doc(game.id);

    // batch.set(detailsRef, {
    //   bggThumbnail: game.bggThumbnail,
    //   bggImage: game.bggImage,
    //   description: game.description,
    //   yearpublished: game.yearpublished,
    //   minplayers: game.minplayers,
    //   maxplayers: game.maxplayers,
    //   playingtime: game.playingtime,
    //   suggestedplayers: game.suggestedplayers,
    // });

    // batch.update(gameRef, {
    //   playerCounts: game.playerCounts.join(','),
    //   totalPlays: admin.firestore.FieldValue.delete(),
    //   unusablePlays: admin.firestore.FieldValue.delete(),
    //   remainingPlays: admin.firestore.FieldValue.delete(),
    //   newestPlayDate: admin.firestore.FieldValue.delete(),
    //   oldestPlayDate: admin.firestore.FieldValue.delete(),
    //   maxDate: admin.firestore.FieldValue.delete(),
    //   minDate: admin.firestore.FieldValue.delete(),
    //   hasMinPlays: admin.firestore.FieldValue.delete(),
    //   hasNoPlays: admin.firestore.FieldValue.delete(),
    //   playsLastUpdated: admin.firestore.FieldValue.delete(),
    //   bggThumbnail: admin.firestore.FieldValue.delete(),
    //   bggImage: admin.firestore.FieldValue.delete(),
    //   description: admin.firestore.FieldValue.delete(),
    //   yearpublished: admin.firestore.FieldValue.delete(),
    //   minplayers: admin.firestore.FieldValue.delete(),
    //   maxplayers: admin.firestore.FieldValue.delete(),
    //   playingtime: admin.firestore.FieldValue.delete(),
    //   suggestedplayers: admin.firestore.FieldValue.delete(),
    // });

    // console.log('Game schema updated.');

    await batch.commit();
  }
};

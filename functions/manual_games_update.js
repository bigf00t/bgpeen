const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const _ = require('lodash');

const util = require('./util');

exports.manualGamesUpdate = async (gameIds) => {
  let query = firestore.collection('games');
  // console.log(gameIds);

  if (gameIds && gameIds.length > 0) {
    query = query.where('id', 'in', gameIds);
  }

  const gamesSnapshot = await query.get();
  const batch = firestore.batch();

  const games = util.docsToArray(gamesSnapshot);

  for (const game of games) {
    console.log(`Updating ${game.name} (${game.id})`);
    const gameResultsRef = firestore.collection('results').doc(game.id);
    const resultsSnapshot = await gameResultsRef.get();
    const gameRef = firestore.collection('games').doc(game.id);

    if (resultsSnapshot.data() == undefined) {
      console.log('No results found, skipping.');
      continue;
    }

    const gameDetailsRef = firestore.collection('details').doc(game.id);
    const gamePlaysRef = firestore.collection('plays').doc(game.id);
    // const gamePlaysSnapshot = await gamePlaysRef.get();

    // TODO: Calc min/max play ids

    const minDatePlaysRef = firestore
      .collection('games')
      .doc(game.id)
      .collection('plays')
      .where('date', '==', game.minDate);

    const minDatePlaysSnapshot = await minDatePlaysRef.get();
    const minPlays = util.docsToArray(minDatePlaysSnapshot);
    const minDatePlayIds = _.map(minPlays, (play) => play.id);

    const maxDatePlaysRef = firestore
      .collection('games')
      .doc(game.id)
      .collection('plays')
      .where('date', '==', game.maxDate);

    const maxDatePlaysSnapshot = await maxDatePlaysRef.get();
    const maxPlays = util.docsToArray(maxDatePlaysSnapshot);
    const maxDatePlayIds = _.map(maxPlays, (play) => play.id);

    // batch.set(gamePlaysRef, {
    //   minDatePlayIds: minDatePlayIds.join(','),
    //   maxDatePlayIds: maxDatePlayIds.join(','),
    //   totalPlays: game.totalPlays,
    //   unusablePlays: game.unusablePlays,
    //   remainingPlays: game.remainingPlays,
    //   newestPlayDate: game.newestPlayDate,
    //   oldestPlayDate: game.oldestPlayDate,
    //   maxDate: game.maxDate,
    //   minDate: game.minDate,
    //   hasMinPlays: game.hasMinPlays,
    //   hasNoPlays: game.hasNoPlays,
    //   playsLastUpdated: game.playsLastUpdated,
    // });

    // batch.set(gameDetailsRef, {
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
  }

  await batch.commit();
};

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

    batch.set(gamePlaysRef, {
      totalPlays: game.totalPlays,
      unusablePlays: game.unusablePlays,
      remainingPlays: game.remainingPlays,
      newestPlayDate: game.newestPlayDate,
      oldestPlayDate: game.oldestPlayDate,
      maxDate: game.maxDate,
      minDate: game.minDate,
      hasMinPlays: game.hasMinPlays,
      hasNoPlays: game.hasNoPlays,
      playsLastUpdated: game.playsLastUpdated,
    });

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

    // const bggThumbnail = game.bggThumbnail ?? game.thumbnail;
    // const bggImage = game.bggImage ?? game.image;
    // const thumbnail = await util.uploadGameImage('thumbnails', game.id, bggThumbnail);
    // const image = await util.uploadGameImage('images', game.id, bggImage);

    await batch.update(gameRef, {
      totalPlays: admin.firestore.FieldValue.delete(),
      unusablePlays: admin.firestore.FieldValue.delete(),
      remainingPlays: admin.firestore.FieldValue.delete(),
      newestPlayDate: admin.firestore.FieldValue.delete(),
      oldestPlayDate: admin.firestore.FieldValue.delete(),
      maxDate: admin.firestore.FieldValue.delete(),
      minDate: admin.firestore.FieldValue.delete(),
      hasMinPlays: admin.firestore.FieldValue.delete(),
      hasNoPlays: admin.firestore.FieldValue.delete(),
      playsLastUpdated: admin.firestore.FieldValue.delete(),
    });

    // await batch.update(gameRef, {
    //   playerCounts: game.playerCounts.join(','),
    //   bggThumbnail: admin.firestore.FieldValue.delete(),
    //   bggImage: admin.firestore.FieldValue.delete(),
    //   description: admin.firestore.FieldValue.delete(),
    //   yearpublished: admin.firestore.FieldValue.delete(),
    //   minplayers: admin.firestore.FieldValue.delete(),
    //   maxplayers: admin.firestore.FieldValue.delete(),
    //   playingtime: admin.firestore.FieldValue.delete(),
    //   suggestedplayers: admin.firestore.FieldValue.delete(),
    // });

    // await batch.update(gameResultsRef, {
    //   playerCounts: admin.firestore.FieldValue.delete(),
    // });
  }

  batch.commit();
};

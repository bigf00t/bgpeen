// const admin = require('firebase-admin');
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

    const bggThumbnail = game.bggThumbnail ?? game.thumbnail;
    const bggImage = game.bggImage ?? game.image;
    const thumbnail = await util.uploadGameImage('thumbnails', game.id, bggThumbnail);
    const image = await util.uploadGameImage('images', game.id, bggImage);

    await batch.update(gameRef, {
      // playerCounts: resultsSnapshot.data().playerCounts ?? game.playerCounts,
      thumbnail: thumbnail,
      // bggThumbnail: bggThumbnail,
      image: image,
      // bggImage: bggImage,
    });

    // await batch.update(gameResultsRef, {
    //   playerCounts: admin.firestore.FieldValue.delete(),
    // });
  }

  batch.commit();
};

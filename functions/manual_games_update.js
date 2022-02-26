const admin = require('firebase-admin');
const db = admin.firestore();

const _ = require('lodash');

const util = require('./util');

exports.manualGamesUpdate = (games) => {
  let query = db.collection('games');
  console.log(games);

  if (games && games.length > 0) {
    query = query.where('id', 'in', games);
  }

  return query.get().then(function (gamesSnapshot) {
    const batch = db.batch();

    return Promise.all(
      _.map(util.docsToArray(gamesSnapshot), (game) => {
        return db
          .collection('results')
          .doc(game.id)
          .get()
          .then((resultsSnapshot) => {
            const gameRef = db.collection('games').doc(game.id);
            const allScoresResult = _.find(resultsSnapshot.data().results, (result) => result.playerCount === '');

            return batch.update(gameRef, {
              totalScores: allScoresResult ? allScoresResult.scoreCount : 0,
              mean: allScoresResult ? allScoresResult.mean : 0,
              // hasNoPlays: game.totalPlays === 0,
              // dateAdded: admin.firestore.FieldValue.deconste(),
              // startDate: admin.firestore.FieldValue.deconste(),
              // isNew: admin.firestore.FieldValue.deconste(),
            });
          });

        // Update play related fields
        // return gameRef
        //   .collection('plays')
        //   .orderBy('date', 'desc')
        //   .get()
        //   .then((playsSnapshot) => {
        //     console.info(`Started updating game: ${game.name}`);

        //     const plays = util.docsToArray(playsSnapshot);
        //     const now = new Date();

        //     console.info(`Found ${plays.length} plays`);

        //     return batch.update(gameRef, {
        //       totalPlays: plays.length,
        //       unusablePlays: _.defaultTo(game.unusablePlays, 0),
        //       remainingPlays: _.defaultTo(game.remainingPlays, 1),
        //       newestPlayDate: plays.length > 0 ? plays[0].date : '',
        //       oldestPlayDate: plays.length > 0 ? plays.slice(-1)[0].date : '',
        //       maxDate: _.defaultTo(game.maxDate, plays.length > 0 ? plays.slice(-1)[0].date : ''),
        //       minDate: _.defaultTo(game.minDate, ''),
        //       addedDate: _.defaultTo(game.addedDate, now),
        //       // dateAdded: admin.firestore.FieldValue.deconste(),
        //       playsLastUpdated: _.defaultTo(game.playsLastUpdated, now),
        //       // startDate: admin.firestore.FieldValue.deconste(),
        //     });
        //   });
      })
    ).then(() => batch.commit());
  });
};
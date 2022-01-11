const admin = require('firebase-admin');
const db = admin.firestore();

var _ = require('lodash');

const util = require('./util');
const update = require('./update_results');

exports.manualStatsUpdate = (games) => {
  // console.info(games);
  return (
    db
      .collection('games')
      // .where("needsUpdate", "==", true)
      .where('id', 'in', games)
      .get()
      .then(function (gamesSnapshot) {
        return Promise.all(
          _.map(util.docsToArray(gamesSnapshot), (game) => {
            console.info(`Started updating stats for: ${game.name}`);

            var playsRef = db.collection('games').doc(game.id).collection('plays');
            var resultsRef = db.collection('results').doc(game.id);

            return playsRef.get().then(function (playsSnapshot) {
              var plays = util.docsToArray(playsSnapshot);
              return update.updateResults(resultsRef, game, plays, true);
            });
          })
        );
      })
      .then(function () {
        console.info('Finished manualStatsUpdate');
      })
  );
};

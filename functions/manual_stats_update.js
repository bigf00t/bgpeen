const admin = require('firebase-admin');
const db = admin.firestore();

var _ = require('lodash');

const util = require('./util');
const update = require('./update_results');

exports.manualStatsUpdate = (games) =>
  db
    .collection('games')
    .where('id', 'in', games)
    .get()
    .then((gamesSnapshot) =>
      Promise.all(
        _.map(util.docsToArray(gamesSnapshot), (game) => {
          console.info(`Started updating stats for: ${game.name}`);

          // Expensive query!
          var playsRef = db.collection('games').doc(game.id).collection('plays');
          var resultsRef = db.collection('results').doc(game.id);

          return playsRef
            .get()
            .then((playsSnapshot) => update.updateResults(resultsRef, game, util.docsToArray(playsSnapshot), true));
        })
      )
    );

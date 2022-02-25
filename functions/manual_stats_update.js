const admin = require('firebase-admin');
const db = admin.firestore();

const _ = require('lodash');

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
          const playsRef = db.collection('games').doc(game.id).collection('plays');

          return playsRef
            .get()
            .then((playsSnapshot) => update.updateResults(game, util.docsToArray(playsSnapshot), true));
        })
      )
    );

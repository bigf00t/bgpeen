const admin = require('firebase-admin');
const db = admin.firestore();

var _ = require('lodash');

const util = require('./util');
const update_plays = require('./update_plays');
const update_results = require('./update_results');

exports.manualPlaysUpdate = (games, maxPages) =>
  db
    .collection('games')
    .where('id', 'in', games)
    .get()
    .then((gamesSnapshot) =>
      Promise.all(
        _.map(util.docsToArray(gamesSnapshot), (game) =>
          update_plays
            .updateGamePlays(game, maxPages)
            .then((plays) => update_results.updateResults(game, plays, false))
            .catch((err) => Promise.reject(err))
        )
      )
    )
    .catch((err) => Promise.reject(err));

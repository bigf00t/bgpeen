const admin = require('firebase-admin');
const db = admin.firestore();

var _ = require('lodash');

const util = require('./util');
const update = require('./update_plays');

exports.manualPlaysUpdate = (games, maxPages) => {
  // Missing minDate, maxDate, flush
  return db
    .collection('games')
    .where('id', 'in', games)
    .get()
    .then(function (gamesSnapshot) {
      return Promise.all(
        _.map(util.docsToArray(gamesSnapshot), (game) => {
          return update.updateGamePlays(game, maxPages);
        })
      );
    })
    .then(function () {
      return Promise.resolve();
    });
};

const admin = require('firebase-admin');
const db = admin.firestore();

const util = require('./util');
const add_game = require('./add_game');
const update_plays = require('./update_plays');
const update_results = require('./update_results');
const moment = require('moment');

exports.runAutomaticGameUpdates = (runAsFunction = true) => {
  return db
    .collection('searches')
    .limit(50)
    .get()
    .then((searchesSnapshot) => {
      if (searchesSnapshot.size > 0) {
        return addSearchedGames(searchesSnapshot);
      } else {
        let twoWeeksAgo = moment().subtract(2, 'week');

        var queries = [
          db.collection('games').where('isNew', '==', true).orderBy('createdDate', 'asc'),
          // The next two lines should be commented out for PROD until we perform local updates
          db.collection('games').where('remainingPlays', '>', 0).orderBy('remainingPlays', 'desc'),
          db.collection('games').where('playsLastUpdated', '<', twoWeeksAgo).orderBy('playsLastUpdated', 'asc'),
        ];

        let chain = Promise.resolve(false);
        queries.forEach((query) => {
          chain = chain.then((result) => {
            if (result) {
              return Promise.resolve(true);
            }

            if (runAsFunction) {
              query = query.limit(1);
            }

            return query.get().then((gamesSnapshot) => {
              if (gamesSnapshot.size > 0) {
                return updatePlaysForEligibleGames(gamesSnapshot, 0).then(() => {
                  return Promise.resolve(true);
                });
              }
              return Promise.resolve(false);
            });
          });
        });
        return chain.then(function (result) {
          if (!result) {
            console.log('Did not find any games to update!');
          }
          return Promise.resolve();
        });
      }
    });
};

function updatePlaysForEligibleGames(gamesSnapshot, maxPages) {
  let chain = Promise.resolve();
  gamesSnapshot.forEach((doc) => {
    chain = chain.then(() => {
      console.info('='.repeat(100));
      return update_plays
        .updateGamePlays(doc.data(), maxPages)
        .then((plays) => {
          var resultsRef = db.collection('results').doc(doc.data().id);
          return update_results.updateResults(resultsRef, doc.data(), plays, false);
        })
        .then(() => {
          return util.delay();
        });
    });
  });
  return chain.then(function () {
    console.info('='.repeat(100));
    return Promise.resolve();
  });
}

function addSearchedGames(searchesSnapshot) {
  let chain = Promise.resolve();
  searchesSnapshot.forEach((doc) => {
    chain = chain.then(() =>
      add_game
        .addGame(doc.data().name, true)
        .then((result) => {
          db.collection('searches').doc(doc.id).delete();
          return Promise.resolve(result);
        })
        .then(() => util.delay())
    );
  });
  return chain.then(function () {
    return Promise.resolve();
  });
}

const admin = require('firebase-admin');
const db = admin.firestore();

const util = require('./util');
const add_game = require('./add_game');
const update_plays = require('./update_plays');
const update_results = require('./update_results');
const moment = require('moment');

exports.runAutomaticGameUpdates = (newOnly = true, maxGames = 1, maxPages = 100) =>
  db
    .collection('searches')
    .limit(50)
    .get()
    .then((searchesSnapshot) => {
      if (searchesSnapshot.size > 0) {
        return addSearchedGames(searchesSnapshot, maxPages);
      } else {
        let twoWeeksAgo = moment().subtract(2, 'week');

        let queries = [db.collection('games').where('isNew', '==', true).orderBy('addedDate', 'asc')];

        // Temporary until local updates have finished
        if (!newOnly) {
          queries = queries.concat([
            db.collection('games').where('remainingPlays', '>', 0).orderBy('remainingPlays', 'desc'),
            db.collection('games').where('playsLastUpdated', '<', twoWeeksAgo).orderBy('playsLastUpdated', 'asc'),
          ]);
        }

        let chain = Promise.resolve();
        queries.forEach((query) => {
          chain = chain.then((result) => {
            if (result) {
              // Already loaded a query
              return Promise.resolve(true);
            }

            if (maxGames > 0) {
              query = query.limit(maxGames);
            }

            return query.get().then((gamesSnapshot) => {
              if (gamesSnapshot.size === 0) {
                return Promise.resolve();
              }
              return updatePlaysForEligibleGames(gamesSnapshot, maxPages).then(() => Promise.resolve(true));
            });
          });
        });
        return chain.then((result) => {
          if (!result) {
            return Promise.reject('Did not find any games to update!');
          }
          return Promise.resolve();
        });
      }
    });

const updatePlaysForEligibleGames = (gamesSnapshot, maxPages) => {
  let chain = Promise.resolve();
  gamesSnapshot.forEach((doc) => {
    chain = chain.then(() =>
      update_plays
        .updateGamePlays(doc.data(), maxPages)
        .then((plays) => update_results.updateResults(doc.data(), plays, false))
        .then(() => util.delay())
        .catch((err) => Promise.reject(err))
    );
  });
  return chain.then(() => Promise.resolve());
};

const addSearchedGames = (searchesSnapshot, maxPages) => {
  let chain = Promise.resolve();
  searchesSnapshot.forEach((doc) => {
    chain = chain.then(() =>
      add_game
        .addGame(doc.data().name, true)
        .then(() => util.delay())
        .then((newGame) =>
          update_plays
            .updateGamePlays(newGame, maxPages)
            .then((plays) => update_results.updateResults(newGame, plays, false))
            .catch((err) => Promise.reject(err))
        )
        .then(() => util.delay())
        .catch((err) => Promise.reject(err))
        .finally(() => db.collection('searches').doc(doc.id).delete())
    );
  });
  return chain.then(() => Promise.resolve());
};

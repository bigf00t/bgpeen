const admin = require('firebase-admin');
const db = admin.firestore();

const util = require('./util');
const add_game = require('./add_game');
const update_plays = require('./update_plays');
const update_results = require('./update_results');

const dayjs = require('dayjs');
var duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

exports.runAutomaticGameUpdates = (maxGames = 1, maxPages = 80) =>
  db
    .collection('searches')
    .limit(50)
    .get()
    .then((searchesSnapshot) => {
      if (searchesSnapshot.size > 0) {
        return addSearchedGames(searchesSnapshot, maxPages);
      } else {
        let oneMonthAgo = dayjs().subtract(1, 'month').toDate();
        let oneWeekAgo = dayjs().subtract(1, 'week').toDate();

        const queries = [
          db.collection('games').where('totalPlays', '==', 0),
          db
            .collection('games')
            .where('playsLastUpdated', '<', oneWeekAgo)
            .where('hasMinPlays', '==', false)
            .orderBy('playsLastUpdated', 'asc'),
          // db.collection('games').where('remainingPlays', '>', 0).orderBy('remainingPlays', 'desc'),
          db.collection('games').where('playsLastUpdated', '<', oneMonthAgo).orderBy('playsLastUpdated', 'asc'),
        ];

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
  let startTime = new Date();
  let chain = Promise.resolve();
  gamesSnapshot.docs.forEach((doc, index) => {
    chain = chain.then(() => {
      console.info('='.repeat(100));

      let elapsedTime = dayjs.duration(dayjs().diff(startTime));
      console.info(
        `Updating game ${index + 1} of ${gamesSnapshot.size} - ${doc.data().name} (${
          doc.data().id
        }) - Elapsed time ${elapsedTime.format('HH:mm:ss')}`
      );

      return update_plays
        .updateGamePlays(doc.data(), maxPages)
        .then((plays) => update_results.updateResults(doc.data(), plays, false))
        .then(() => util.delay())
        .catch((err) => Promise.reject(err));
    });
  });
  return chain.then(() => Promise.resolve());
};

const addSearchedGames = (searchesSnapshot, maxPages) => {
  let chain = Promise.resolve();
  searchesSnapshot.forEach((doc) => {
    chain = chain.then(() =>
      add_game
        .addGame(doc.data().name, true)
        .then((newGame) => util.delay(newGame))
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

const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const _ = require('lodash');
const util = require('./util');
const add_game = require('./add_game');
const update_plays = require('./update_plays');
const update_results = require('./update_results');

const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

exports.runAutomaticGameUpdates = (maxGames = 1, maxPages = 80, includeHistorical = false) =>
  firestore
    .collection('searches')
    .where('completed', '!=', true)
    .limit(maxGames)
    .get()
    .then((searchesSnapshot) => {
      if (searchesSnapshot.size > 0) {
        return addSearchedGames(searchesSnapshot, maxPages);
      } else {
        const oneMonthAgo = dayjs().subtract(1, 'month').toDate();
        const oneWeekAgo = dayjs().subtract(1, 'week').toDate();

        let queries = [
          firestore
            .collection('games')
            .where('playsLastUpdated', '<', oneWeekAgo)
            .where('hasMinPlays', '==', false)
            .orderBy('playsLastUpdated', 'asc'),
          firestore.collection('games').where('playsLastUpdated', '<', oneMonthAgo).orderBy('playsLastUpdated', 'asc'),
          // firestore.collection('games').where('hasNoPlays', '==', true),
        ];

        if (includeHistorical) {
          queries = queries.concat([
            firestore.collection('games').where('remainingPlays', '>', 0).orderBy('remainingPlays', 'asc'),
            firestore.collection('games').orderBy('playsLastUpdated', 'asc'),
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
  const startTime = new Date();
  let chain = Promise.resolve();
  gamesSnapshot.docs.forEach((doc, index) => {
    chain = chain.then(() => {
      console.info('='.repeat(100));

      const elapsedTime = dayjs.duration(dayjs().diff(startTime));
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

const addSearchedGames = async (searchesSnapshot, maxPages) => {
  return Promise.all(
    _.map(util.docsToArray(searchesSnapshot), async (search) => {
      try {
        const newGame = await add_game.addGame(search.term, true);
        await util.delay();

        const newPlays = await update_plays.updateGamePlays(newGame, maxPages);
        await update_results.updateResults(newGame, newPlays, false);

        firestore.collection('searches').doc(search.id).update({ completed: true, succeeded: true });
      } catch (e) {
        console.error(e);
        firestore.collection('searches').doc(search.id).update({ completed: true, succeeded: false });
      }

      await util.delay();
      return Promise.resolve();
    })
  );
};

const admin = require('firebase-admin');
const db = admin.firestore();

const util = require('./util');
const add_game = require('./add_game');
const update_plays = require('./update_plays');
const update_results = require('./update_results');

exports.runAutomaticGameUpdates = () => {
  return db
    .collection('searches')
    .limit(50)
    .get()
    .then((searchesSnapshot) => {
      if (searchesSnapshot.size > 0) {
        return addSearchedGames(searchesSnapshot);
      } else {
        // Where last updated more than two weeks ago, and no remainingPlays
        // totalPlays < 1000
        // order by: totalPlays asc, popularity desc, dateAdded desc
        return db
          .collection('games')
          .where('totalPlays', '<', 1000)
          .get()
          .then((gamesSnapshot) => {
            console.info(`Found ${gamesSnapshot.size} games to update`);
            if (gamesSnapshot.size > 0) {
              return updatePlaysForEligibleGames(gamesSnapshot);
            }
            // console.info('Nothing for runAutomaticGameUpdates to do!');
            return Promise.resolve();
          });
      }
    });
};

function updatePlaysForEligibleGames(gamesSnapshot) {
  let chain = Promise.resolve();
  gamesSnapshot.forEach((doc) => {
    chain = chain.then(() =>
      update_plays
        .updateGamePlays(doc.data(), 100)
        .then((plays) => {
          // console.info('Finished updatePlaysPagesRecursively');
          var resultsRef = db.collection('results').doc(doc.data().id);
          return update_results.updateResults(resultsRef, doc.data(), plays, false);
        })
        .then(() => {
          return util.delay();
        })
    );
  });
  return chain.then(function () {
    // console.info('Finished updatePlaysForNewGames');
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
          // console.info(result);
          db.collection('searches').doc(doc.id).delete();
          return Promise.resolve(result);
        })
        .then(() => util.delay())
    );
  });
  return chain.then(function () {
    // console.info('Finished addSearchedGames');
    return Promise.resolve();
  });
}

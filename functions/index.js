// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// const cors = require('cors')({ origin: true });

// const add_game = require('./add_game');
// const manual_plays = require('./manual_plays_update');
// const manual_stats = require('./manual_stats_update');
// const manual_games = require('./manual_games_update');
const automatic = require('./automatic_game_updates');

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: '1GB',
};

// exports.addGame = functions.https.onRequest(async (req, res) =>
//   cors(req, res, () =>
//     add_game
//       .addGame(req.body.name, true)
//       .then((newGame) => res.status(200).send(newGame))
//       .catch((e) => {
//         console.error(e);
//         res.send({ error: e });
//       })
//   )
// );

// exports.manualPlaysUpdate = functions.https.onRequest(async (req, res) =>
//   cors(req, res, async () =>
//     manual_plays
//       .manualPlaysUpdate(req.body.games, req.body.maxPages)
//       .then(() => res.status(200).send('Finished Updating Plays'))
//       .catch((e) => {
//         console.error(e);
//         res.status(500).send(e);
//       })
//   )
// );

// exports.manualStatsUpdate = functions
//   .runWith(runtimeOpts)
//   .https.onRequest(async (req, res) =>
//     cors(req, res, async () =>
//       manual_stats.manualStatsUpdate(req.body.games).then(() => res.status(200).send('Finished Updating Stats'))
//     )
//   );

// exports.manuallyRunAutomaticGameUpdates = functions.runWith(runtimeOpts).https.onRequest(async (req, res) =>
//   cors(req, res, async () =>
//     automatic
//       .runAutomaticGameUpdates(false, 1, 10)
//       .then(() => res.status(200).send('Finished runAutomaticGameUpdates!'))
//       .catch((e) => {
//         console.error(e);
//         res.status(500).send(e);
//       })
//   )
// );

// exports.manualGamesUpdate = functions.runWith(runtimeOpts).https.onRequest(async (req, res) =>
//   cors(req, res, async () =>
//     manual_games
//       .manualGamesUpdate(req.body.games)
//       .then(() => res.status(200).send('Finished Updating Games'))
//       .catch((e) => {
//         console.error(e);
//         res.status(500).send(e);
//       })
//   )
// );

exports.runAutomaticGameUpdates = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    await automatic.runAutomaticGameUpdates().catch((e) => {
      console.error(e);
    });
  });

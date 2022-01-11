// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const cors = require('cors')({ origin: true });

const add_game = require('./add_game');
const manual_plays = require('./manual_plays_update');
const manual_stats = require('./manual_stats_update');
const automatic = require('./automatic_game_updates');

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: '1GB',
};

exports.addGame = functions.https.onRequest(async (req, res) => {
  return cors(req, res, () => {
    add_game
      .addGame(req.body.name, true)
      .then((newGame) => res.status(200).send(newGame))
      .catch(function (e) {
        console.log(e);
        res.send({ error: e });
      });
  });
});

exports.manualPlaysUpdate = functions.https // .runWith(runtimeOpts)
  .onRequest(async (req, res) => {
    return cors(req, res, async () => {
      manual_plays
        .manualPlaysUpdate(req.body.games, req.body.maxPages, req.body.minDate, req.body.maxDate, req.body.flush)
        .then(function () {
          res.status(200).send('Finished Updating Plays');
        });
    });
  });

exports.manualStatsUpdate = functions.runWith(runtimeOpts).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    manual_stats.manualStatsUpdate(req.body.games).then(function () {
      res.status(200).send('Finished Updating Stats');
    });
  });
});

exports.manuallyRunAutomaticGameUpdates = functions.runWith(runtimeOpts).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    automatic.runAutomaticGameUpdates().then(function () {
      res.status(200).send('Finished runAutomaticGameUpdates!');
    });
  });
});

exports.runAutomaticGameUpdates = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    await automatic.runAutomaticGameUpdates();
    console.log('Finished runAutomaticGameUpdates!');
  });

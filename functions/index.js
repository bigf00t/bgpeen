// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const cors = require('cors')({ origin: true });
var _ = require('lodash');

const util = require('./util');

exports.addGame = functions.https.onRequest(async (req, res) => {
  return cors(req, res, () => {
    util
      .addGame(req.body.name, true)
      .then((newGame) => res.status(200).send(newGame))
      .catch(function (e) {
        console.log(e);
        res.send({ error: e });
      });
  });
});

// exports.addGames = functions.https.onRequest(async (req, res) => {
//     return cors(req, res, () => {
//         const games = req.body["games"];

//         var batch = db.batch();

//         _.forEach(games, function(game) {
//             var newGameRef = db.collection('newgames').doc();
//             batch.set(newGameRef, {name: game});
//         });

//         batch.commit().then(function() {
//             res.status(200).send({});
//         });
//     });
// });

// exports.getUserPlays = functions.https.onRequest(async (req, res) => {
//     return cors(req, res, () => {
//         console.log('getUserPlays');
//         // console.log(req.body["game"]);
//         db.collection('games').doc(req.body.game).collection('plays')
//         .where('playerUserIds', 'array-contains', req.body.user)
//         .get().then((snapshot) => {
//             return res.json(util.docsToArray(snapshot));
//         });
//     });
// });

// exports.markForUpdate = functions.https.onRequest(async (req, res) => {
//     return cors(req, res, async () => {
//         const gameID = req.body;
//         const gameRef = db.collection('games').doc(gameID);

//         gameRef.update({
//             needsUpdate: true
//         });

//         res.status(200).send('Added to update queue');
//     });
// });

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: '1GB',
};

exports.manualPlaysUpdate = functions
  // .runWith(runtimeOpts)
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      util
        .manualPlaysUpdate(
          req.body.games,
          req.body.maxPages,
          req.body.minDate,
          req.body.maxDate,
          req.body.flush
        )
        .then(function () {
          res.status(200).send('Finished Updating Plays');
        });
    });
  });

exports.manualStatsUpdate = functions
  .runWith(runtimeOpts)
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      util.manualStatsUpdate(req.body.games).then(function () {
        res.status(200).send('Finished Updating Stats');
      });
    });
  });

// exports.scheduledPlaysUpdate = functions.pubsub.schedule('every 24 hours').onRun((context) => {
//     util.updatePlays();
// });

exports.manuallyRunAutomaticGameUpdates = functions
  .runWith(runtimeOpts)
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      util.runAutomaticGameUpdates().then(function () {
        res.status(200).send('Finished runAutomaticGameUpdates!');
      });
    });
  });

exports.runAutomaticGameUpdates = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('every 5 minutes')
  .onRun((context) => {
    return util.runAutomaticGameUpdates().then(function () {
      console.log('Finished runAutomaticGameUpdates!');
    });
  });

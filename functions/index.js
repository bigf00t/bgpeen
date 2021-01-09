// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const lodash = require('lodash');
const cors = require('cors')({origin: true});

const util = require('./util');

exports.addGame = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        // TODO: Pull into function
        axios.get('https://api.geekdo.com/xmlapi2/search?query=' + req.body + '&exact=1&type=boardgame')
            .then(function (result) {
                var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});
                if (json.items.item != undefined) {
                    var item = json.items.item.length > 1 ? json.items.item[0] : json.items.item;
                    const gameRef = db.collection('games').doc(item.$.id);
                            
                    var game = {
                        id: item.$.id,
                        name: item.name.$.value,
                        lastUpdated: null,
                        needsUpdate: true,
                        scores: []
                    };

                    // console.log(game);
                    gameRef.set(game).then(function() {
                        res.status(200).send({
                            id: item.$.id,
                            ...game
                        });
                    })
                } else {
                    res.send(json); 
                }
            })
            .catch(function (e) {
                console.log(e);
                res.send({error: e});
            });
        });
});

exports.addGames = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        const games = req.body["games"];

        var batch = db.batch();

        lodash.forEach(games, function(game) {
            var newGameRef = db.collection('newgames').doc();
            batch.set(newGameRef, {name: game});
        });

        batch.commit().then(function() {
            res.status(200).send({});
        });
    });
});

exports.getGame = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        db.collection('games')
        .doc(req.body.game)
        .get().then((gameSnapshot) => {
            var game = gameSnapshot.data();
            return res.json(game);
        });
    });
});

exports.getGames = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        // console.log('getGames');
        db.collection('games')
        .orderBy("name")
        .get().then((snapshot) => {
            var games = util.docsToArray(snapshot);
            // console.log(games);
            return res.json( games );
        });
    });
});

exports.getUserPlays = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        console.log('getUserPlays');
        // console.log(req.body["game"]);
        db.collection('games').doc(req.body.game).collection('plays')
        .where('playerUserIds', 'array-contains', req.body.user)
        .get().then((snapshot) => {
            return res.json(util.docsToArray(snapshot));
        });
    });
});

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
    memory: '1GB'
}

exports.manualPlaysUpdate = functions.runWith(runtimeOpts).https.onRequest(async (req, res) => {
    console.log('manualPlaysUpdate');
    return cors(req, res, async () => {
        util.updatePlays(
            req.body.games, 
            req.body.maxPages, 
            req.body.minDate, 
            req.body.maxDate, 
            req.body.flush).then(function() {
                res.status(200).send('Finished Updating Plays');
            });
    });
});

// exports.scheduledPlaysUpdate = functions.pubsub.schedule('every 24 hours').onRun((context) => {
//     util.updatePlays();
// });

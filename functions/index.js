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

const moment = require('moment');
const { ceil } = require('lodash');

exports.getGames = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        console.log('getGames');
        db.collection('games').get().then((snapshot)=>{
            return res.json( docsToArray(snapshot) );
        });
    });
});

function docsToArray(snapshot) {
    let array = [];

    snapshot.forEach(doc => {
        array.push(doc.data());
    });

    return array;
}

exports.getUserPlays = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        console.log('getPlays');
        console.log(req.body["game"]);
        const gameID = req.body["game"];
        db.collection('games').doc(gameID).collection('plays')
        .where('playerUserIds', 'array-contains', req.body["user"])
        // .where('playerCount', '==', 2)
        .get().then((snapshot)=>{
            // console.log(snapshot.docs);
            let response = [];

            snapshot.forEach(doc => {
                response.push(doc.data());
            });
            
            return res.json( response );
        });
    });
});

exports.addGame = functions.https.onRequest(async (req, res) => {
    return cors(req, res, () => {
        axios.get('https://api.geekdo.com/xmlapi2/search?query=' + req.body + '&exact=1&type=boardgame')
            .then(function (result) {
                var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});
                if (json.items.item != undefined) {
                    var item = json.items.item.length > 1 ? json.items.item[0] : json.items.item;
                    const gameRef = db.collection('games').doc(item.$.id);
                            
                    var game = {
                        name: item.name.$.value,
                        lastUpdated: null,
                        needsUpdate: true
                    };

                    console.log(game);
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

exports.markForUpdate = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        const gameID = req.body;
        const gameRef = db.collection('games').doc(gameID);

        gameRef.update({
            needsUpdate: true
        });

        res.status(200).send('Added to update queue');
    });
});

exports.manualPlaysUpdate = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        updatePlays();
        res.status(200).send('Updating');
    });
});

exports.scheduledPlaysUpdate = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
    updatePlays();
});

function updatePlays() {
    db.collection('games')
        .where("needsUpdate", "==", true)
        .get().then(function(snapshot) {
            snapshot.forEach(doc => {
                var gameRef = db.collection('games').doc(doc.id);

                // Asynchronus update, so we don't wait for results
                getPlaysUrl(gameRef).then(function(playsUrl) {
                    updateAllPlays(gameRef, playsUrl, 1).then(function () {
                        return updateGame(gameRef);
                    });
                });
            });
        });
}

function updateAllPlays(gameRef, playsUrl, page) {
    return updatePlaysPage(gameRef, playsUrl, page).then(function (remainingPages) {
        console.log("Remaining pages: " + remainingPages);
        if (remainingPages > 0) {
            setTimeout(function(){
                return updateAllPlays(gameRef, playsUrl, page + 1)
            }, 2000);
        } else {
            return null;
        }
    });
}

function getPlaysUrl(gameRef) {
    return gameRef.get().then(function(game) {
        // TODO: Move into function
        console.log(game.data());
        var minDate = game.data().lastUpdated != undefined ? game.data().lastUpdated : '2020-01-01';
        return 'https://api.geekdo.com/xmlapi2/plays?id=' + gameRef.id + '&mindate=' + minDate + '&page=';
    });
}

function updatePlaysPage(gameRef, playsUrl, page) {
    console.log(playsUrl + page);
    return axios.get(playsUrl + page)
        .then(function (result) {
            var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});
            
            // TODO: Total plays
            var totalPlays = json.plays.$.total;
            console.log(totalPlays);

            if (json.plays.play != undefined) {
                var filteredPlays = getFilteredPlays(json.plays);

                var batch = db.batch();
                
                lodash.forEach(filteredPlays, function(play) {
                    var playRef = gameRef.collection('plays').doc(play.id);
                    batch.set(playRef, {
                        ...play,
                        playerCount: play.players.length,
                        playerUserIds: getPlayerUserIds(play.players)
                    });
                });

                batch.commit();

                var remainingPages = ceil(totalPlays / 100) - page;

                return remainingPages;
            }

            return null;
        });
}

function getPlayerUserIds(players) {
    return lodash.map(
        lodash.filter(players, function(player) { 
            return player.userid != undefined
        }), 
        function(player) {
            return player.userid
        });
}

function getFilteredPlays(plays) {
    return lodash.map(
        lodash.filter(plays.play, function(play) { 
            return play.players != undefined // TODO: All players have scores
        }), 
        function(play) {
            return {
                ...play.$,
                players: lodash.map(play.players.player, function(player) {
                    return { ...player.$ }
                })
            };
        });
}

function updateGame(gameRef) {
    return gameRef.collection('plays').get().then(function(snapshot) {
        var plays = docsToArray(snapshot);
        var players = lodash.flatten(lodash.map(plays, 'players'));
        var scores = lodash.map(lodash.filter(players, function(player) {
            return player.score 
        }), function(player) {
            return parseInt(player.score)
        });
        var mean = lodash.mean(scores);
        console.log(mean);
        gameRef.update({ 
            needsUpdate: false,
            lastUpdated: moment().format('YYYY-MM-DD'),
            average: parseInt(mean)
        });
    })
}
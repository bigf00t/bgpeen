// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
// admin.initializeApp();

const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const lodash = require('lodash');

const moment = require('moment');
const { ceil, floor } = require('lodash');

exports.docsToArray = (snapshot) => {
    let array = [];

    snapshot.forEach(doc => {
        if (! lodash.isEmpty(doc.data())) {
            array.push(doc.data());
        }
    });

    return array;
}

exports.updatePlays = () => {
    db.collection('games')
        .where("needsUpdate", "==", true)
        .get().then(function(gamesSnapshot) {
            gamesSnapshot.forEach(gameDoc => {
                var gameRef = db.collection('games').doc(gameDoc.id);
                var game = gameDoc.data();
                var playsUrl = getPlaysUrl(game);
                updateGamePlays(gameRef, game, playsUrl, 1);
            });
        });
}

function getScores(plays, existingScores) {
    var deepScores = getDeepScores(plays, existingScores);

    var flatScores = getFlatScores(deepScores);

    return flatScores;
}

function getDeepScores(plays, existingScores) {
    var scores = existingScores;

    lodash.forEach(plays, play => {
        var playerScores = getCleanPlayerScores(play.players);
        var playerCount = play.playerCount;
        if (playerScores.length > 0) {
            lodash.forEach(playerScores,
                function(score, i) {
                    var playerPosition = i + 1
                    scores[playerCount] = scores[playerCount] || {};
                    scores[playerCount][playerPosition] = scores[playerCount][playerPosition] || {}
                    scores[playerCount][playerPosition][score] = (scores[playerCount][playerPosition][score] ? scores[playerCount][playerPosition][score] : 0) + 1;
                });
        }
    });

    return scores;
}

function getCleanPlayerScores(players) {
    return lodash
    .chain(players)
    .filter(function(player) { 
        // Exclude bogus scores, as well as 0
        return ! (isNaN(player.score) || player.score == "" || player.score == "0")
    })
    .orderBy([function(player) { 
        return parseInt(player.score); 
    }], ['desc'])
    .map(function(player) { 
        // Handle ties
        return parseInt(player.score) + parseInt(player.win);
    })
    .value();
}

function getFlatScores(deepScores) {
    var flatScores = [];
    var maxPlayerCount = lodash.max(lodash.keys(deepScores));
    console.log();

    for (var playerCount = 1; playerCount <= maxPlayerCount; playerCount++) {
        var playerCountScores = deepScores[playerCount];
        if (playerCountScores) {
            for (var playerPosition = 1; playerPosition <= maxPlayerCount; playerPosition++) {
                var playerPositionScores = playerCountScores[playerPosition];
                if (playerPositionScores) {
                    flatScores.push({
                        playerCount: playerCount,
                        playerPosition: playerPosition,
                        scores: playerPositionScores
                    })
                } 
            } 
        }
    } 

    return flatScores;
}

function updateGamePlays(gameRef, game, playsUrl, page) {
    updatePlaysPage(gameRef, game, playsUrl, page).then(function (remainingPages) {
        console.log("Remaining pages: " + remainingPages);
        if (remainingPages > 0) {
            // TODO: Timeout not working right
            setTimeout(function(){
                updateGamePlays(gameRef, game, playsUrl, page + 1);
            }, 2000);
        }
    });
}

function getPlaysUrl(game) {
    // TODO: Move into function
    // console.log(game);
    // TODO: Remove default date
    var minDate = game.lastUpdated != undefined ? game.lastUpdated : '2021-01-01';
    return 'https://api.geekdo.com/xmlapi2/plays?id=' + game.id + '&mindate=' + minDate + '&page=';
}

function updatePlaysPage(gameRef, game, playsUrl, page) {
    console.log(playsUrl + page);
    return axios.get(playsUrl + page)
        .then(function (result) {
            var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});
            
            // TODO: Total plays
            var totalPlays = json.plays.$.total;
            // console.log(totalPlays);

            if (json.plays.play != undefined) {
                var plays = getCleanPlaysFromJson(json.plays.play);

                var batch = db.batch();
                
                lodash.forEach(plays, function(play) {
                    var playRef = gameRef.collection('plays').doc(play.id);
                    batch.set(playRef, play);
                });

                var scores = getScores(plays, game.scores);
                // console.log(scores);

                batch.update(gameRef, {
                    scores: scores
                });

                batch.commit();

                var remainingPages = ceil(totalPlays / 100) - page;

                return remainingPages;
            }

            return null;
        });
}

function getCleanPlaysFromJson(plays) {
    return lodash
    .chain(plays)
    .filter(function(play) { 
        return play.players != undefined
    })
    .map(function(play) {
        var players = getCleanPlayersFromJson(play.players.player);
        var play = { ...play.$ }
        play.players = players;
        play.playerCount = players.length.toString();
        play.playerUserIds = getPlayerUserIds(players);
        return play;
    })
    .value();
}

function getCleanPlayersFromJson(players) {
    return lodash
    .map(players, function(player) {
        return { ...player.$ }
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
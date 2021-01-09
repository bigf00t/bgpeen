const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const moment = require('moment');

var _ = require('lodash');

exports.docsToArray = (snapshot) => {
    let array = [];

    snapshot.forEach(doc => {
        if (! _.isEmpty(doc.data())) {
            array.push(doc.data());
        }
    });

    return array;
}

exports.updatePlays = (games, maxPages, minDate, maxDate, flush) => {
    console.log(games);
    return db.collection('games')
        // .where("needsUpdate", "==", true)
        .where('id', 'in', games)
        .get()
        .then(function(gamesSnapshot) {
            return Promise.all(_.map(exports.docsToArray(gamesSnapshot), game => {
                var gameRef = db.collection('games').doc(game.id);
                console.log('Started updating game plays for: ' + game.name);
                var playsUrl = getPlaysUrl(game);
                return updatePlaysPagesRecursively(gameRef, game, playsUrl, flush, maxPages, 1);
            }));
        }).then(function() {
            console.log('Finished updatePlaysPagesRecursively');
        });
}

function addToScoreGroups(dirtyPlays, scoreGroups) {
    var cleanPlays = getCleanPlays(dirtyPlays);
    _.forEach(cleanPlays, play => {
        var cleanPlayerScores = getCleanPlayerScores(play.players);
        if (cleanPlayerScores.length > 0) {
            _.forEach(cleanPlayerScores,
                function(score, i) {
                    var playerPosition = i + 1
                    // Find an existing scoreGroup or create a new one
                    var scoreGroupIndex = _.findIndex(scoreGroups, function(scoreGroup) {
                        return scoreGroup.playerCount == play.playerCount && scoreGroup.playerPosition == playerPosition;
                    });
                    
                    if (scoreGroupIndex == -1) {
                        scoreGroupIndex = scoreGroups.length;
                        scoreGroups.push({
                            scores:{}, 
                            playerCount: parseInt(play.playerCount), 
                            playerPosition: playerPosition
                        });
                    };

                    scoreGroups[scoreGroupIndex].scores[score] = _.defaultTo(scoreGroups[scoreGroupIndex].scores[score], 0) + 1
                });
        }
    });

    return scoreGroups;
}

function getCleanPlays(plays) {
    return _.filter(plays, function(play) {
        // TODO: Exclude plays where winner isn't person with highest score
        // Exclude plays where not every player has a score
        return _.every(play.players, function(player) {
            return player.score;
        });
    })
}

function getCleanPlayerScores(players) {
    return _(players)
    .filter(function(player) {
        // Exclude bogus scores, as well as 0
        return ! (isNaN(player.score) || player.score == "" || player.score == "0")
    })
    .orderBy([function(player) { 
        return parseInt(player.score)
    }, 
    function(player) { 
        // TODO: Verify that this works with a test
        return player.win 
    }], 
    ['desc', 'desc'])
    .map(function(player) {
        return parseInt(player.score);
    })
    .value();
}

// From https://stackoverflow.com/questions/22707475/how-to-make-a-promise-from-settimeout
function delay(delay, value) {
    return new Promise(resolve => setTimeout(resolve, delay, value));
}

function updatePlaysPagesRecursively(gameRef, game, playsUrl, flush, maxPages, page) {
    console.log("Loading plays page: " + page);
    return updatePlaysPage(gameRef, game, playsUrl, flush, page)
    .then(function (remainingPages) {
        console.log("Remaining pages: " + (remainingPages > (maxPages - page) ? maxPages - page : remainingPages));
        if (page >= maxPages || remainingPages == 0) {
            return Promise.resolve(0);
        }
        return delay(2000, page + 1);
    })
    .then(function(nextPage){
        console.log('nextPage = ' + nextPage);
        if (nextPage == 0) {
            return Promise.resolve(0);
        }
        return updatePlaysPagesRecursively(gameRef, game, playsUrl, flush, maxPages, nextPage);
    });
}

function getPlaysUrl(game) {
    var minDate = _.defaultTo(game.lastUpdated, '');
    return 'https://api.geekdo.com/xmlapi2/plays?id=' + game.id + '&mindate=' + minDate + '&page=';
}

function updatePlaysPage(gameRef, game, playsUrl, flush, page) {
    console.log("Starting BGG call: " + playsUrl + page);
    return axios.get(playsUrl + page)
        .then(function (result) {
            console.log("Finished BGG call");
            var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});

            if (json.plays.play != undefined) {
                var plays = getCleanPlaysFromJson(json.plays.play);
                // console.log(plays);
                
                console.log("Starting scoreGroup calculation");
                // If we're flushing scoreGroups, don't use the existing ones on the first page
                var existingScoreGroups = (flush && page == 1) ? [] : _.defaultTo(game.scoreGroups, []);
                var scoreGroups = addToScoreGroups(plays, existingScoreGroups);
                // console.log(scoreGroups);
                console.log("Finished scoreGroup calculation");

                console.log("Started db batch updates");
                var batch = db.batch();
                
                _.forEach(plays, function(play) {
                    var playRef = gameRef.collection('plays').doc(play.id);
                    batch.set(playRef, play);
                });
                
                // TODO: Consider doing this after all pages have been udpated
                batch.update(gameRef, {scoreGroups: scoreGroups});
                batch.commit();
                console.log("Committed db batch updates");

                var totalPlays = json.plays.$.total;
                var remainingPages = _.ceil(totalPlays / 100) - page;

                return remainingPages;
            }

            return null;
        });
}

function getCleanPlaysFromJson(plays) {
    return _(plays)
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
    return _(players)
    .map(function(player) {
        return { ...player.$ }
    })
    .value();
}

function getPlayerUserIds(players) {
    return _(players)
    .filter(function(player) { 
        return player.userid != undefined
    })
    .map(function(player) {
        return player.userid
    })
    .value();
}
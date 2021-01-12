const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const moment = require('moment');
const {mean, mode, median, std} = require('mathjs');

var _ = require('lodash');

exports.manualPlaysUpdate = (games, maxPages, minDate, maxDate, flush) => {
    // console.log(games);
    return db.collection('games')
        // .where("needsUpdate", "==", true)
        .where('id', 'in', games)
        .get()
        .then(function(gamesSnapshot) {
            return Promise.all(_.map(exports.docsToArray(gamesSnapshot), game => {
                var gameRef = db.collection('games').doc(game.id);
                console.log('Started updating plays for: ' + game.name);
                var playsUrl = getPlaysUrl(game);
                return updatePlaysRecursively(gameRef, playsUrl, maxPages, 1);
            }));
        }).then(function() {
            console.log('Finished updatePlaysPagesRecursively');
        });
}

exports.docsToArray = (snapshot) => {
    let array = [];

    snapshot.forEach(doc => {
        if (! _.isEmpty(doc.data())) {
            array.push(doc.data());
        }
    });

    return array;
}

function getPlaysUrl(game) {
    var minDate = _.defaultTo(game.lastUpdated, '');
    return 'https://api.geekdo.com/xmlapi2/plays?id=' + game.id + '&mindate=' + minDate + '&page=';
}

// From https://stackoverflow.com/questions/22707475/how-to-make-a-promise-from-settimeout
function delay(delay, value) {
    return new Promise(resolve => setTimeout(resolve, delay, value));
}

function updatePlaysRecursively(gameRef, playsUrl, maxPages, page) {
    console.log("Loading plays page: " + page);
    return updatePlaysPage(gameRef, playsUrl, page)
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
        return updatePlaysRecursively(gameRef, playsUrl, maxPages, nextPage);
    });
}

function updatePlaysPage(gameRef, playsUrl, page) {
    console.log("Starting BGG call: " + playsUrl + page);
    return axios.get(playsUrl + page)
        .then(function (result) {
            console.log("Finished BGG call");
            var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});

            if (json.plays.play != undefined) {
                var plays = getCleanPlaysFromJson(json.plays.play);
                // console.log(plays);

                console.log("Started db batch updates");
                var batch = db.batch();
                
                _.forEach(plays, function(play) {
                    var playRef = gameRef.collection('plays').doc(play.id);
                    batch.set(playRef, play);
                });
                
                // TODO: Consider doing this after all pages have been udpated
                // batch.update(gameRef, {results: results});
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

exports.manualStatsUpdate = (games, flushScores) => {
    // console.log(games);
    return db.collection('games')
        // .where("needsUpdate", "==", true)
        .where('id', 'in', games)
        .get()
        .then(function(gamesSnapshot) {
            return Promise.all(_.map(exports.docsToArray(gamesSnapshot), game => {
                var gameRef = db.collection('games').doc(game.id);
                console.log('Started updating stats for: ' + game.name);
                return updateResults(gameRef, flushScores);
            }));
        }).then(function() {
            console.log('Finished updatePlaysPagesRecursively');
        });
}

function updateResults(gameRef, flushScores) {
    var playsRef = gameRef.collection('plays');

    if (flushScores) {
        playsRef = playsRef.where();
    }

    return playsRef
    .get()
    .then(function(playsSnapshot) {
        console.log("Starting result calculation");
        var plays = exports.docsToArray(playsSnapshot);
        var rawResults = addToPlaysResults(plays, []);
        // console.log(results);
        console.log("Finished result calculation");

        console.log("Starting stats calculation");
        var results = _(rawResults)
        .filter((result) => {
            // We only want results with scores
            return ! _.isEmpty(result.scores);
        })
        .map((result) => {
            return addStatsToResult(result);
        })
        .value();
        console.log("Finished stats calculation");

        var playerCounts = getPlayersCounts(results);

        _.forEach(playerCounts, (playerCount) => {
            results.push(getGroupedResultsForPlayerCount(results, playerCount));
        });

        results.push(getGroupedResultsForPlayerCount(results, ""));
    
        gameRef.update({
            // stats: admin.firestore.FieldValue.delete(), // Temporary
            playerCounts: playerCounts,
            results: results,
        });
    });
}

function getPlayersCounts(results) {
    return _(results)
    .map((group) => {
        return group.playerCount;
    })
    .uniq()
    .sort()
    .value();
}

function getGroupedResultsForPlayerCount(results, playerCount) {
    var playerCountResults = _.filter(results, (result) => {
        return playerCount === "" || result.playerCount === playerCount;
    });

    var allScores = _.reduce(playerCountResults, (scores, result) => {
        return _.mergeWith(scores, result.scores, (val1, val2) => {
            return (val1 || 0) + val2;
        })
    }, {});

    var groupedResult = {};

    if (_.keys(allScores).length !== 0) {
        groupedResult = getStats(allScores);
        groupedResult.trimmedScoreCount = _.reduce(playerCountResults, (count, result) => { 
            return count + result.trimmedScoreCount;
        }, 0);
    }

    groupedResult.playerCount = playerCount;
    groupedResult.scores = allScores;

    return groupedResult;
}

function getTrimmedScores(explodedScores, scores) {
    var meanVal = mean(explodedScores);
    var stdVal = std(explodedScores);
    var stdToRemove = 3;

    return _.pickBy(scores, (count, score) => {
        // Three standard deviations from the mean is a common cut-off in practice
        return score > (meanVal - (stdVal * stdToRemove)) && score < (meanVal + (stdVal * stdToRemove));
    });
}

function getStats(scores) {
    var explodedScores = getExplodedScores(scores);

    if (explodedScores.length === 0) {
        return {scoreCount: explodedScores.length};
    }
    
    return {
        // TODO: Don't parse int, parse dec
        mean: parseInt(mean(explodedScores)),
        std: parseInt(std(explodedScores)),
        median: parseInt(median(explodedScores)),
        mode: parseInt(mode(explodedScores)),
        scoreCount: explodedScores.length
    }
}

function addStatsToResult(result) {
    if (_.keys(result.scores).length === 0) {
        return null;
    }
    
    var explodedScores = getExplodedScores(result.scores);
    var trimmedScores = getTrimmedScores(explodedScores, result.scores);
    result.scores = trimmedScores;
    
    var stats = getStats(trimmedScores);
    stats.trimmedScoreCount = explodedScores.length - stats.scoreCount;

    return {
        ...result,
        ...stats
    }
}

function getExplodedScores(scores) {
    return _.reduce(scores, (exploded, count, score) => {
        return exploded.concat(_.fill(Array(count), parseInt(score)));
    }, []);
}

function addToPlaysResults(dirtyPlays, results) {
    var cleanPlays = getCleanPlays(dirtyPlays);
    _.forEach(cleanPlays, play => {
        var cleanPlayerScores = getCleanPlayerScores(play.players);
        if (cleanPlayerScores.length > 0) {
            _.forEach(cleanPlayerScores,
                function(score, i) {
                    var playerPlace = i + 1
                    // Find an existing result or create a new one
                    var resultIndex = _.findIndex(results, function(result) {
                        return result.playerCount == play.playerCount && result.playerPlace == playerPlace;
                    });
                    
                    if (resultIndex == -1) {
                        resultIndex = results.length;
                        results.push({
                            scores:{}, 
                            playerCount: parseInt(play.playerCount), 
                            playerPlace: playerPlace
                        });
                    };

                    results[resultIndex].scores[score] = _.defaultTo(results[resultIndex].scores[score], 0) + 1
                });
        }
    });

    return results;
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
    }], ['desc', 'desc'])
    .map(function(player) {
        return parseInt(player.score);
    })
    .value();
}
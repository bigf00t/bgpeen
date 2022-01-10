const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
// const moment = require('moment');
const { mean, mode, median, std } = require('mathjs');

var _ = require('lodash');

// From https://stackoverflow.com/questions/22707475/how-to-make-a-promise-from-settimeout
function delay(delay, value) {
  return new Promise((resolve) => setTimeout(resolve, delay, value));
}

exports.addGame = (searchTerm, exact) => {
  return db
    .collection('games')
    .where('name', '==', searchTerm)
    .get()
    .then(function (gamesSnapshot) {
      if (gamesSnapshot.size > 0) {
        return Promise.resolve('Game already exists');
      }

      // eslint-disable-next-line prettier/prettier
      let searchUrl = `https://api.geekdo.com/xmlapi2/search?query=${searchTerm}&exact=${
        exact ? 1 : 0
      }&type=boardgame`;

      console.info(`Querying ${searchUrl}`);
      return axios
        .get(searchUrl)
        .then(function (result) {
          var json = convert.xml2js(result.data, {
            compact: true,
            attributesKey: '$',
          });
          if (json.items.item === undefined) {
            if (exact) {
              return delay(2000).then(function () {
                // If we didn't find an exact match, try again with an inexact search
                return exports.addGame(searchTerm.replace(':', ''), false);
              });
            }
            result = 'No search results found';
            console.warn(result);
            return Promise.resolve(result);
          }

          var item;
          if (json.items.item.length > 1) {
            item = json.items.orderBy(
              [
                function (item) {
                  return parseInt(item.yearpublished.$.value);
                },
                function (item) {
                  return parseInt(item.$.id);
                },
              ],
              ['desc', 'desc']
            )[0];
          } else {
            item = json.items.item;
          }

          if (
            item.name.$.value.replace(':', '').toUpperCase() !==
            searchTerm.toUpperCase()
          ) {
            result = `Found a result, but it did not match your search: ${item.name.$.value}`;
            console.warn(result);
            return Promise.resolve(result);
          }

          return db
            .collection('games')
            .doc(item.$.id)
            .get()
            .then(function (gameSnapshot) {
              if (gameSnapshot.exists) {
                result = 'Game already exists';
                console.warn(result);
                return Promise.resolve(result);
              }

              return delay(2000, item.$.id)
                .then(function (id) {
                  return axios.get(
                    `https://api.geekdo.com/xmlapi2/things?id=${id}`
                  );
                })
                .then(function (result) {
                  var item = convert.xml2js(result.data, {
                    compact: true,
                    attributesKey: '$',
                  }).items.item;
                  var name = Array.isArray(item.name)
                    ? _.find(item.name, (name) => name.$.type === 'primary').$
                        .value
                    : item.name.$.value;
                  var suggestedplayerspoll = _.find(
                    item.poll,
                    (poll) => poll.$.name === 'suggested_numplayers'
                  );
                  var suggestedplayers = _.reduce(
                    suggestedplayerspoll.results,
                    (redPoll, results) => {
                      redPoll[results.$.numplayers] = _.reduce(
                        results.result,
                        (redResults, result) => {
                          redResults[result.$.value] = parseInt(
                            result.$.numvotes
                          );
                          return redResults;
                        },
                        {}
                      );
                      return redPoll;
                    },
                    {}
                  );

                  var newGame = {
                    id: item.$.id,
                    name: name,
                    thumbnail: item.thumbnail._text,
                    image: item.image._text,
                    description: item.description._text,
                    yearpublished: parseInt(item.yearpublished.$.value),
                    minplayers: parseInt(item.minplayers.$.value),
                    maxplayers: parseInt(item.maxplayers.$.value),
                    playingtime: parseInt(item.playingtime.$.value),
                    suggestedplayers: suggestedplayers,
                    isNew: true,
                    popularity: 0,
                    // playsLastUpdated: null,
                    // oldestPlayDate: null,
                    // newestPlayDate: null,
                    // syncedPlays: 0,
                    // remainingPlays: 0,
                    // unusablePlays: 0
                  };

                  console.info(`Successfully added ${name}!`);

                  return db
                    .collection('games')
                    .doc(newGame.id)
                    .set(newGame)
                    .then(() => {
                      return newGame;
                    });
                })
                .catch(function (error) {
                  console.error(error.toJSON());
                });
            });
        })
        .catch(function (error) {
          console.error(error.toJSON());
        });
    });
};

exports.runAutomaticGameUpdates = () => {
  return db
    .collection('searches')
    .limit(50)
    .get()
    .then((searchesSnapshot) => {
      if (searchesSnapshot.size > 0) {
        return addSearchedGames(searchesSnapshot);
      } else {
        return db
          .collection('games')
          .where('isNew', '==', true)
          .get()
          .then((gamesSnapshot) => {
            console.info(`Found ${gamesSnapshot.size} games to update`);
            if (gamesSnapshot.size > 0) {
              return updatePlaysForNewGames(gamesSnapshot);
            }
            // console.info('Nothing for runAutomaticGameUpdates to do!');
            return Promise.resolve();
          });
      }
    });
};

function updatePlaysForNewGames(gamesSnapshot) {
  let chain = Promise.resolve();
  gamesSnapshot.forEach((doc) => {
    chain = chain.then(() =>
      updateGamePlaysAndStats(doc.data(), 100).then(() => delay(2000))
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
      exports
        .addGame(doc.data().name, true)
        .then((result) => {
          // console.info(result);
          db.collection('searches').doc(doc.id).delete();
          return Promise.resolve(result);
        })
        .then(() => delay(2000))
    );
  });
  return chain.then(function () {
    // console.info('Finished addSearchedGames');
    return Promise.resolve();
  });
}

exports.manualPlaysUpdate = (games, maxPages, minDate, maxDate, flush) => {
  // console.info(games);
  return db
    .collection('games')
    .where('id', 'in', games)
    .get()
    .then(function (gamesSnapshot) {
      return Promise.all(
        _.map(exports.docsToArray(gamesSnapshot), (game) => {
          return updateGamePlaysAndStats(game, maxPages);
        })
      );
    })
    .then(function () {
      // console.info('Finished updateGames');
      return Promise.resolve();
    });
};

function updateGamePlaysAndStats(game, maxPages) {
  var gameRef = db.collection('games').doc(game.id);
  console.info(`Started updating plays for: ${game.name}`);
  var playsUrl = getPlaysUrl(game);
  return updatePlaysRecursively(gameRef, playsUrl, maxPages, 1)
    .then(function (plays) {
      // console.info('Finished updatePlaysPagesRecursively');
      var resultsRef = db.collection('results').doc(game.id);
      return updateResults(resultsRef, game, plays, false);
    })
    .then(function () {
      if (game.isNew) {
        return gameRef.update({ isNew: false });
      }
      // console.info('Finished updateGamePlaysAndStats');
      return Promise.resolve();
    });
}

exports.docsToArray = (snapshot) => {
  let array = [];

  snapshot.forEach((doc) => {
    if (!_.isEmpty(doc.data())) {
      array.push(doc.data());
    }
  });

  return array;
};

function getPlaysUrl(game) {
  var minDate =
    game.remainingPlays && game.remainingPlays > 0
      ? _.defaultTo(game.oldestPlayDate, '')
      : _.defaultTo(game.playsLastUpdated, '');
  return `https://api.geekdo.com/xmlapi2/plays?id=${game.id}&mindate=${minDate}&page=`;
}

function updatePlaysRecursively(gameRef, playsUrl, maxPages, page) {
  // console.info('Loading plays page: ' + page);
  return updatePlaysPage(gameRef, playsUrl, page).then(function (pageResult) {
    // console.info(
    //   'Remaining pages: ' +
    //     (pageResult.remainingPages > maxPages - page
    //       ? maxPages - page
    //       : pageResult.remainingPages)
    // );
    if (page >= maxPages || pageResult.remainingPages == 0) {
      //Hit the bottom of the stack
      return gameRef
        .update({
          unusablePlays: pageResult.unusablePlays,
          remainingPlays: pageResult.remainingPlays,
        })
        .then(function () {
          return Promise.resolve(pageResult.plays);
        });
    }
    return delay(2000, page + 1).then(function (nextPage) {
      return updatePlaysRecursively(gameRef, playsUrl, maxPages, nextPage).then(
        function (plays) {
          // Returning plays back up the stack
          return Promise.resolve(plays.concat(pageResult.plays));
        }
      );
    });
  });
}

function updatePlaysPage(gameRef, playsUrl, page) {
  console.info(`Starting BGG call: ${playsUrl}${page}`);
  return axios
    .get(playsUrl + page)
    .then(function (result) {
      // console.info('Finished BGG call');
      var json = convert.xml2js(result.data, {
        compact: true,
        attributesKey: '$',
      });

      if (json.plays.play != undefined) {
        var plays = getCleanPlaysFromJson(json.plays.play);
        // console.info(plays);

        // console.info('Started db batch updates');
        var batch = db.batch();

        _.forEach(plays, function (play) {
          var playRef = gameRef.collection('plays').doc(play.id);
          batch.set(playRef, play);
        });

        batch.commit();
        // console.info('Committed db batch updates');

        var totalPlays = json.plays.$.total;
        var unusablePlays = json.plays.play.length - plays.length;
        var remainingPlays =
          totalPlays - (100 * (page - 1) + json.plays.play.length);
        var remainingPages = _.ceil(totalPlays / 100) - page;

        return {
          remainingPages: remainingPages,
          unusablePlays: unusablePlays,
          remainingPlays: remainingPlays,
          plays: plays,
        };
      }

      return null;
    })
    .catch(function (error) {
      console.error(error.toJSON());
    });
}

function getCleanPlaysFromJson(plays) {
  return _(plays)
    .filter(function (play) {
      return _.get(play, 'players.player[0]');
    })
    .map(function (play) {
      var players = getCleanPlayersFromJson(play.players.player);
      var cleanPlay = { ...play.$ };
      cleanPlay.players = players;
      cleanPlay.playerCount = players.length.toString();
      cleanPlay.playerUserIds = getPlayerUserIds(players);
      return cleanPlay;
    })
    .value();
}

function getCleanPlayersFromJson(players) {
  return _(players)
    .map(function (player) {
      return { ...player.$ };
    })
    .value();
}

function getPlayerUserIds(players) {
  return _(players)
    .filter(function (player) {
      return player.userid != undefined;
    })
    .map(function (player) {
      return player.userid;
    })
    .value();
}

exports.manualStatsUpdate = (games, flushScores) => {
  // console.info(games);
  return (
    db
      .collection('games')
      // .where("needsUpdate", "==", true)
      .where('id', 'in', games)
      .get()
      .then(function (gamesSnapshot) {
        return Promise.all(
          _.map(exports.docsToArray(gamesSnapshot), (game) => {
            console.info(`Started updating stats for: ${game.name}`);

            var playsRef = db
              .collection('games')
              .doc(game.id)
              .collection('plays');
            var resultsRef = db.collection('results').doc(game.id);

            return playsRef.get().then(function (playsSnapshot) {
              var plays = exports.docsToArray(playsSnapshot);
              return updateResults(resultsRef, game, plays, true);
            });
          })
        );
      })
      .then(function () {
        console.info('Finished manualStatsUpdate');
      })
  );
};

function updateResults(resultsRef, game, dirtyPlays, flush) {
  return resultsRef.get().then(function (resultsSnapshot) {
    // console.info('Starting result calculation');
    var existingResults = resultsSnapshot.data();
    var resultsToAddTo =
      flush || existingResults === undefined ? [] : existingResults.results;
    var cleanPlays = getCleanPlays(dirtyPlays);
    //TODO: Save this val
    var unusablePlays = dirtyPlays.length - cleanPlays.length;
    var rawResults = addPlaysToResults(cleanPlays, resultsToAddTo);
    // console.info('Finished result calculation');

    // console.info('Starting stats calculation');
    var results = _(rawResults)
      .filter((result) => {
        // We only want results with scores and valid player counts
        return (
          !_.isEmpty(result.scores) &&
          result.playerCount >= game.minplayers &&
          result.playerCount <= game.maxplayers &&
          result.playerPlace
        );
      })
      .map((result) => {
        return addStatsToResult(result);
      })
      .value();
    // console.info('Finished stats calculation');

    console.info(`Found ${results.lengthvalid} results`);

    // No valid results
    if (results.length === 0) {
      console.warn('No valid results found!');
      return {
        playerCounts: [],
        results: [],
      };
    }

    var playerCounts = getPlayersCounts(results);
    var playerCountResults = [];

    _.forEach(playerCounts, (playerCount) => {
      var playerCountResult = getGroupedResultsForPlayerCount(
        results,
        playerCount
      );
      playerCountResults.push(playerCountResult);
      results.push(playerCountResult);
    });

    results.push(getGroupedResultsForPlayerCount(playerCountResults, ''));

    return resultsRef.set(
      {
        playerCounts: playerCounts,
        results: results,
      },
      { merge: true }
    );
  });
}

function getPlayersCounts(results) {
  return _(results)
    .filter((group) => {
      return !_.isEmpty(group.scores);
    })
    .map((group) => {
      return parseInt(group.playerCount);
    })
    .uniq()
    .sortBy()
    .value();
}

function getGroupedResultsForPlayerCount(results, playerCount) {
  var playerCountResults = _.filter(results, (result) => {
    return playerCount === '' || result.playerCount === playerCount;
  });

  var allScores = _.reduce(
    playerCountResults,
    (scores, result) => {
      return _.mergeWith(scores, result.scores, (val1, val2) => {
        return (val1 || 0) + val2;
      });
    },
    {}
  );

  var groupedResult = getStats(allScores);
  groupedResult.trimmedScoreCount = _.reduce(
    playerCountResults,
    (count, result) => {
      return count + result.trimmedScoreCount;
    },
    0
  );

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
    return (
      score >= meanVal - stdVal * stdToRemove &&
      score <= meanVal + stdVal * stdToRemove
    );
  });
}

function getStats(scores) {
  var explodedScores = getExplodedScores(scores);

  return {
    // TODO: Don't parse int, parse dec
    mean: parseInt(mean(explodedScores)),
    std: parseInt(std(explodedScores)),
    median: parseInt(median(explodedScores)),
    mode: parseInt(mode(explodedScores)),
    scoreCount: explodedScores.length,
  };
}

function addStatsToResult(result) {
  var explodedScores = getExplodedScores(result.scores);
  var trimmedScores = getTrimmedScores(explodedScores, result.scores);
  result.scores = trimmedScores;

  var stats = getStats(trimmedScores);
  stats.trimmedScoreCount = explodedScores.length - stats.scoreCount;

  return {
    ...result,
    ...stats,
  };
}

function getExplodedScores(scores) {
  return _.reduce(
    scores,
    (exploded, count, score) => {
      return exploded.concat(_.fill(Array(count), parseInt(score)));
    },
    []
  );
}

function addPlaysToResults(plays, results) {
  _.forEach(plays, (play) => {
    var cleanPlayerScores = getCleanPlayerScores(play.players);
    if (cleanPlayerScores.length > 0) {
      _.forEach(cleanPlayerScores, function (score, i) {
        var playerPlace = i + 1;
        // Find an existing result or create a new one
        var resultIndex = _.findIndex(results, function (result) {
          return (
            result.playerCount == play.playerCount &&
            result.playerPlace == playerPlace
          );
        });

        if (resultIndex == -1) {
          resultIndex = results.length;
          results.push({
            scores: {},
            playerCount: parseInt(play.playerCount),
            playerPlace: playerPlace,
          });
        }

        results[resultIndex].scores[score] =
          _.defaultTo(results[resultIndex].scores[score], 0) + 1;
      });
    }
  });

  return results;
}

function getCleanPlays(plays) {
  return _.filter(plays, function (play) {
    // TODO: Exclude plays where winner isn't person with highest score
    // Exclude plays where not every player has a score
    return _.every(play.players, function (player) {
      return !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0);
    });
  });
}

function getCleanPlayerScores(players) {
  return _(players)
    .orderBy(
      [
        function (player) {
          return parseInt(player.score);
        },
        function (player) {
          // TODO: Verify that this works with a test
          return player.win;
        },
      ],
      ['desc', 'desc']
    )
    .map(function (player) {
      return parseInt(player.score);
    })
    .value();
}

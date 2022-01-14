const { mean, mode, median, std } = require('mathjs');

var _ = require('lodash');

exports.updateResults = (resultsRef, game, dirtyPlays, flush) => {
  console.info(`Updating results for ${game.name}`);

  return resultsRef.get().then(function (resultsSnapshot) {
    var existingResults = resultsSnapshot.data();
    var resultsToAddTo = flush || existingResults === undefined ? [] : existingResults.results;
    var cleanPlays = getCleanPlays(dirtyPlays);
    //TODO: Save this val
    // var unusablePlays = dirtyPlays.length - cleanPlays.length;

    var rawResults = addPlaysToResults(cleanPlays, resultsToAddTo);
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
      var playerCountResult = getGroupedResultsForPlayerCount(results, playerCount);
      playerCountResults.push(playerCountResult);
      results.push(playerCountResult);
    });

    var allResults = getGroupedResultsForPlayerCount(playerCountResults, '');

    console.info(`Adding ${allResults.scoreCount} valid scores to results`);

    results.push(allResults);

    return resultsRef.set(
      {
        playerCounts: playerCounts,
        results: results,
      },
      { merge: true }
    );
  });
};

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
    return score >= meanVal - stdVal * stdToRemove && score <= meanVal + stdVal * stdToRemove;
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
          return result.playerCount == play.playerCount && result.playerPlace == playerPlace;
        });

        if (resultIndex == -1) {
          resultIndex = results.length;
          results.push({
            scores: {},
            playerCount: parseInt(play.playerCount),
            playerPlace: playerPlace,
          });
        }

        results[resultIndex].scores[score] = _.defaultTo(results[resultIndex].scores[score], 0) + 1;
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

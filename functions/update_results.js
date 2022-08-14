const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const { mean, mode, median, std } = require('mathjs');

const _ = require('lodash');

exports.updateResults = async (game, newPlays) => {
  console.info('-'.repeat(100));
  console.info(`Updating results for ${game.name}`);

  const resultsRef = firestore.collection('results').doc(game.id);
  const detailsRef = firestore.collection('details').doc(game.id);

  const resultsSnapshot = await resultsRef.get();
  const detailsSnapshot = await detailsRef.get();

  const existingResults = resultsSnapshot.data();
  const details = detailsSnapshot.data();

  const existingAllScoreCount = existingResults
    ? _.find(existingResults.results, (result) => result.playerCount === '').scoreCount
    : 0;
  const resultsToAddTo = existingResults === undefined ? [] : existingResults.results;
  const validPlays = getCleanPlays(newPlays);
  const rawResults = addPlaysToResults(validPlays, resultsToAddTo);

  // We only want results with scores and valid player counts
  const results = _(rawResults)
    .filter(
      (result) =>
        !_.isEmpty(result.scores) &&
        result.playerCount >= details.minplayers &&
        result.playerCount <= details.maxplayers &&
        result.playerPlace
    )
    .map((result) => addStatsToResult(result))
    .value();

  if (results.length === 0) {
    console.log('No valid results found!');
    return;
  }

  const playerCounts = getPlayersCounts(results);
  const playerCountResults = [];

  _.forEach(playerCounts, (playerCount) => {
    const playerCountResult = getGroupedResultsForPlayerCount(results, playerCount);
    playerCountResults.push(playerCountResult);
    results.push(playerCountResult);
  });

  const allScoresResult = getGroupedResultsForPlayerCount(playerCountResults, '');
  const newScoresCount = allScoresResult.scoreCount - existingAllScoreCount;

  console.info(`Adding ${newScoresCount} new scores to results`);

  results.push(allScoresResult);

  await resultsRef.set(
    {
      results: results,
    },
    { merge: true }
  );

  await firestore
    .collection('games')
    .doc(game.id)
    .update({
      totalScores: allScoresResult.scoreCount,
      mean: allScoresResult.mean,
      playerCounts: playerCounts.join(','),
    });
};

const getPlayersCounts = (results) =>
  _(results)
    .filter((group) => !_.isEmpty(group.scores))
    .map((group) => parseInt(group.playerCount))
    .uniq()
    .sortBy()
    .value();

const getGroupedResultsForPlayerCount = (results, playerCount) => {
  const playerCountResults = _.filter(results, (result) => playerCount === '' || result.playerCount === playerCount);

  const allScores = _.reduce(
    playerCountResults,
    (scores, result) => _.mergeWith(scores, result.scores, (val1, val2) => (val1 || 0) + val2),
    {}
  );

  const groupedResult = getStats(allScores);
  groupedResult.trimmedScoreCount = _.reduce(
    playerCountResults,
    (count, result) => count + result.trimmedScoreCount,
    0
  );

  groupedResult.playerCount = playerCount;
  groupedResult.scores = allScores;

  return groupedResult;
};
const getTrimmedScores = (explodedScores, scores) => {
  const meanVal = mean(explodedScores);
  const stdVal = std(explodedScores);
  const stdToRemove = 3;

  // Three standard deviations from the mean is a common cut-off in practice
  return _.pickBy(
    scores,
    (count, score) => score >= meanVal - stdVal * stdToRemove && score <= meanVal + stdVal * stdToRemove
  );
};

const getStats = (scores) => {
  const explodedScores = getExplodedScores(scores);

  return {
    // TODO: Don't parse int, parse dec
    mean: parseInt(mean(explodedScores)),
    std: parseInt(std(explodedScores)),
    median: parseInt(median(explodedScores)),
    mode: parseInt(mode(explodedScores)),
    scoreCount: explodedScores.length,
  };
};

const addStatsToResult = (result) => {
  const explodedScores = getExplodedScores(result.scores);
  const trimmedScores = getTrimmedScores(explodedScores, result.scores);
  result.scores = trimmedScores;

  const stats = getStats(trimmedScores);
  stats.trimmedScoreCount = explodedScores.length - stats.scoreCount;

  return {
    ...result,
    ...stats,
  };
};

const getExplodedScores = (scores) =>
  _.reduce(
    scores,
    (exploded, count, score) => {
      return exploded.concat(_.fill(Array(count), parseInt(score)));
    },
    []
  );

const addPlaysToResults = (plays, results) => {
  _.forEach(plays, (play) => {
    const cleanPlayerScores = getCleanPlayerScores(play.players);
    if (cleanPlayerScores.length > 0) {
      _.forEach(cleanPlayerScores, (score, i) => {
        const playerPlace = i + 1;
        // Find an existing result or create a new one
        let resultIndex = _.findIndex(
          results,
          (result) => result.playerCount == play.playerCount && result.playerPlace == playerPlace
        );

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
};

const getCleanPlays = (plays) =>
  _.filter(plays, (play) =>
    // TODO: Exclude plays where winner isn't person with highest score
    // Exclude plays where not every player has a score
    _.every(play.players, (player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0))
  );

// TODO: Verify that this works with a test
const getCleanPlayerScores = (players) =>
  _(players)
    .orderBy([(player) => parseInt(player.score), (player) => player.win], ['desc', 'desc'])
    .map((player) => parseInt(player.score))
    .value();

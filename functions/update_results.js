const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const { mean, mode, median, std } = require('mathjs');

const _ = require('lodash');
const dayjs = require('dayjs');

const util = require('./util');

exports.updateResults = async (game, batch, newPlays, clear = false) => {
  if (newPlays.length === 0) {
    return;
  }

  console.info(`${'-'.repeat(100)}\n` + `Updating results for ${game.name}`);

  const resultsRef = firestore.collection('games').doc(game.id).collection('results');

  const resultsSnapshot = await resultsRef.get();

  const existingResults = clear ? [] : util.docsToArray(resultsSnapshot);

  const detailsRef = firestore.collection('details').doc(game.id);
  const detailsSnapshot = await detailsRef.get();
  const details = detailsSnapshot.data();

  const gameType = game.gameType ? game.gameType : getGameType(newPlays);

  console.log(gameType);

  // Filter out invalid plays
  const validPlays = getValidPlays(newPlays, details, gameType);

  // TODO: Add ignored plays to doc
  console.log(`Ignoring ${newPlays.length - validPlays.length} invalid plays`);

  if (validPlays.length === 0) {
    console.error('ERROR - No valid plays!');
    return;
  }

  // Get results from plays by player
  const playerResults = getPlayerResultsFromPlays(validPlays, gameType);

  // Group into keyed results
  const keyedResults = getKeyedResultsFromPlayerResults(playerResults);

  // Combine with existing results
  const combinedResults = getCombinedResults(keyedResults, existingResults);

  // Calculate stats for each remaining result
  const results = _.mapValues(combinedResults, (result) => addStatsToResult(result));

  const newScoresCount = results.all.scoreCount - game.totalScores;

  console.info(`Adding ${newScoresCount} new scores to results`);

  _.forOwn(results, (result, key) => {
    batch.set(resultsRef.doc(key), result, { merge: false });
  });

  batch.update(firestore.collection('games').doc(game.id), {
    totalScores: results.all.scoreCount,
    mean: results.all.mean,
    playerCounts: getPlayersCounts(results).join(','),
    gameType: gameType,
  });
};

const getGameType = (plays) => {
  const coopPlays = _.filter(
    plays,
    (play) => _.every(play.players, (player) => player.win == 0) || _.every(play.players, (player) => player.win == 1)
  );

  // console.log(coopPlays.length);
  // console.log(plays.length);
  const coopLikelihood = parseInt((coopPlays.length / plays.length) * 100);
  console.log(`Cooperative game likelihood: ${coopLikelihood}`);

  if (coopLikelihood > 80) {
    return 'co-op';
  }

  const playsWithAtLeastOneScore = _.filter(plays, (play) =>
    play.players.some((player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0))
  );

  const lowWinnerPlays = _.filter(
    playsWithAtLeastOneScore,
    (play) => _.minBy(play.players, (player) => parseInt(player.score)).win == 1
  );

  // const highWinnerPlays = _.filter(
  //   playsWithAtLeastOneScore,
  //   (play) => _.maxBy(play.players, (player) => parseInt(player.score)).win == 1
  // );
  // console.log(highWinnerPlays.length);

  // console.log(plays.length);
  // console.log(lowWinnerPlays.length);
  // console.log(playsWithAtLeastOneScore.length);
  const lowestScoreWinsLikelihood = parseInt((lowWinnerPlays.length / playsWithAtLeastOneScore.length) * 100);
  console.log(`Lowest score wins game likelihood: ${lowestScoreWinsLikelihood}`);

  if (lowestScoreWinsLikelihood > 25) {
    return 'lowest-wins';
  }

  return 'highest-wins';
};

// Remove plays that we don't want to include in our score
const getValidPlays = (plays, details, gameType) =>
  _.filter(
    plays,
    (play) =>
      // Only include plays where:
      //   Game was completed
      parseInt(play.incomplete) === 0 &&
      //   There weren't too many or too few players
      play.playerCount >= details.minplayers &&
      play.playerCount <= details.maxplayers &&
      //   Play date was after game was published, and not in the future
      dayjs(play.date).isAfter(dayjs(`${details.yearpublished}-01-01`).subtract(1, 'day'), 'day') &&
      dayjs(play.date).isBefore(dayjs().add(1, 'day'), 'day') &&
      (gameType === 'co-op' ||
        ((gameType === 'lowest-wins' || gameType === 'highest-wins') &&
          //   Every player has a parsable, non-zero score.
          //   Unfortuntely this will exclude plays with legit scores of 0.
          _.every(play.players, (player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0)) &&
          //   There is exactly one winner
          _.countBy(play.players, 'win')['1'] == 1 &&
          //   Lowest score is winner
          ((gameType === 'lowest-wins' && _.minBy(play.players, (player) => parseInt(player.score)).win == 1) ||
            //   Highest score is winner
            (gameType === 'highest-wins' && _.maxBy(play.players, (player) => parseInt(player.score)).win == 1))))
  );

const getPlayerResultsFromPlays = (plays, gameType) => {
  let playerResults = [];
  const sortDirection = gameType === 'lowest-wins' ? 'asc' : 'desc';

  _.forEach(plays, (play) => {
    // Sort players into finish position, based on score
    const sortedPlayers = _.orderBy(play.players, (player) => parseInt(player.score), sortDirection);

    if (sortedPlayers.length > 0) {
      _.forEach(sortedPlayers, (player, i) => {
        playerResults.push({
          score: parseInt(player.score),
          playerCount: parseInt(play.playerCount),
          new: player.new,
          startPosition: player.startposition ? parseInt(player.startposition) : '',
          finishPosition: i + 1,
          color: player.color.toLowerCase(),
          year: play.date ? parseInt(play.date.split('-')[0]) : '',
          month: play.date ? parseInt(play.date.split('-')[1]) : '',
          win: player.win,
          id: play.id,
        });
      });
    }
  });

  return _.filter(playerResults, (result) => result.finishPosition && result.score);
};

const getKeyedResultsFromPlayerResults = (playerResults) => {
  const keyedResults = {};

  playerResults.forEach((result) => {
    const keys = getKeysFromResult(result);
    _.forOwn(keys, (props, key) => {
      if (!keyedResults[key]) {
        keyedResults[key] = {
          scores: { [result.score]: 1 },
          wins: parseInt(result.win) === 1 ? { [result.score]: 1 } : {},
          playIds: [result.id],
        };
        props.forEach((prop) => (keyedResults[key][prop] = result[prop]));
      } else {
        keyedResults[key].scores[result.score] = _.defaultTo(keyedResults[key].scores[result.score], 0) + 1;
        if (parseInt(result.win) === 1) {
          keyedResults[key].wins[result.score] =
            _.defaultTo(keyedResults[key].wins[result.score], 0) + parseInt(result.win);
        }
        keyedResults[key].playIds.push(result.id);
      }
    });
  });

  return keyedResults;
};

const getKeysFromResult = (result) => {
  let keys = { all: [] };
  if (result.playerCount) {
    keys[`count-${result.playerCount}`] = ['playerCount'];
    if (result.startPosition && !isNaN(result.startPosition)) {
      keys[`count-${result.playerCount}-start-${result.startPosition}`] = ['playerCount', 'startPosition'];
    }
    if (result.finishPosition) {
      keys[`count-${result.playerCount}-finish-${result.finishPosition}`] = ['playerCount', 'finishPosition'];
    }
  }
  if (result.year) {
    keys[`year-${result.year}`] = ['year'];
  }
  if (result.month) {
    keys[`year-${result.year}-month-${result.month}`] = ['year', 'month'];
  }
  if (result.color) {
    keys[`color-${result.color.trim().replace(' ', '_')}`] = ['color'];
  }
  if (result.new > 0) {
    keys['new'] = [];
  }

  return keys;
};

const getCombinedResults = (keyedResults, existingResults) => {
  let combinedResults = {};

  _.forOwn(keyedResults, (result, key) => {
    const existingResult = _.find(existingResults, (result) => result.id === key);

    let scores = existingResult ? existingResult.scores : {};
    _.forOwn(result.scores, (newCount, score) => {
      scores[score] = _.defaultTo(scores[score], 0) + newCount;
    });

    let outlierScores = existingResult ? existingResult.outlierScores : {};
    _.forOwn(result.outlierScores, (newCount, score) => {
      outlierScores[score] = _.defaultTo(outlierScores[score], 0) + newCount;
    });

    let wins = existingResult ? existingResult.wins : {};
    _.forOwn(result.wins, (newCount, score) => {
      wins[score] = _.defaultTo(wins[score], 0) + newCount;
    });

    const playCount = (existingResult ? existingResult.playCount : 0) + _.uniq(result.playIds).length;

    delete result.playIds;

    combinedResults[key] = {
      ...result,
      scores: scores,
      wins: wins,
      outlierScores: outlierScores,
      playCount: playCount,
    };
  });

  return combinedResults;
};

// Remove outlier scores, based on std
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

// Calculates stats like mean and std
const getStats = (scores) => {
  const explodedScores = getExplodedScores(scores);

  return {
    mean: parseFloat(mean(explodedScores)).toFixed(2),
    std: parseFloat(std(explodedScores)).toFixed(2),
    median: parseFloat(median(explodedScores)),
    mode: parseFloat(mode(explodedScores)),
    scoreCount: explodedScores.length,
  };
};

// Fills in the stat section of the result, such as mean and std
const addStatsToResult = (result) => {
  const explodedScores = getExplodedScores(result.scores);

  // Remove outlier scores
  const trimmedScores = getTrimmedScores(explodedScores, result.scores);
  const newOutlierScores = _.pickBy(result.scores, (count, score) => !trimmedScores[score]);

  let outlierScores = result.outlierScores;
  _.forOwn(newOutlierScores, (newCount, score) => {
    outlierScores[score] = _.defaultTo(result.outlierScores[score], 0) + newCount;
  });

  result.scores = trimmedScores;
  result.outlierScores = outlierScores;

  // Remove outlier wins
  result.wins = _.pickBy(result.wins, (count, score) => result.scores[score]);

  // Get stats based on trimmed scores. This will recalculate std.
  const stats = getStats(result.scores);
  // stats.trimmedScoreCount = explodedScores.length - stats.scoreCount;
  stats.winPercentage = parseInt((_.sum(Object.values(result.wins)) / stats.scoreCount).toFixed(2) * 100);

  return {
    ...result,
    ...stats,
  };
};

// The expanded array of scores e.g. [23,23,23,4,4,7] instead of {23: 3, 4: 2, 7: 1}
// Used for stat math like mean and std
const getExplodedScores = (scores) =>
  _.reduce(
    scores,
    (exploded, count, score) => {
      return exploded.concat(_.fill(Array(count), parseInt(score)));
    },
    []
  );

const getPlayersCounts = (results) =>
  _(results)
    .filter((result) => result.playerCount)
    .map((result) => parseInt(result.playerCount))
    .uniq()
    .sortBy()
    .value();

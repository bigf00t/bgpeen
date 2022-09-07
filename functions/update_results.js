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

  // Filter out invalid plays
  const validPlays = getValidPlays(newPlays, details, gameType);

  const invalidPlaysCount = newPlays.length - validPlays.length;
  console.log(`Ignoring ${invalidPlaysCount} invalid plays`);

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
    totalValidPlays: _.defaultTo(game.totalValidPlays, 0) + validPlays.length,
    totalInvalidPlays: _.defaultTo(game.totalInvalidPlays, 0) + invalidPlaysCount,
    mean: results.all.mean,
    playerCounts: getPlayersCounts(results).join(','),
    gameType: gameType,
  });
};

const getGameType = (plays) => {
  const playsWithAtLeastOneWin = _.filter(plays, (play) => play.players.some((player) => parseInt(player.win) == 1));

  const playsWithAllWinners = _.filter(playsWithAtLeastOneWin, (play) =>
    _.every(play.players, (player) => player.win == 1)
  );

  const coopLikelihood = parseInt((playsWithAllWinners.length / playsWithAtLeastOneWin.length) * 100);
  console.log(`Cooperative game likelihood: ${coopLikelihood}`);

  if (coopLikelihood > 80) {
    return 'co-op';
  }

  const playsWithAtLeastOneScoreAndWin = _.filter(playsWithAtLeastOneWin, (play) =>
    play.players.some((player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0))
  );

  const playsWithLowestWinner = _.filter(
    playsWithAtLeastOneScoreAndWin,
    (play) => _.minBy(play.players, (player) => parseInt(player.score)).win == 1
  );

  const lowestScoreWinsLikelihood = parseInt((playsWithLowestWinner.length / playsWithAtLeastOneScoreAndWin.length) * 100);
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
      // For co-op games, we're more lenient about winners and scores
      (gameType === 'co-op' ||
        ((gameType === 'lowest-wins' || gameType === 'highest-wins') &&
          //   At least one player has a parsable, non-zero score. This may inlcude some plays with erroneous 0s.
          _.some(play.players, (player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) === 0)) &&
          //   ? Every player has a parsable, non-zero score. Unfortuntely this will exclude plays with legit scores of 0.
          //   ? There is at least one winner
          //   Lowest score is winner
          ((gameType === 'lowest-wins' && _.minBy(play.players, (player) => parseInt(player.score)).win == 1) ||
            //   Highest score is winner
            (gameType === 'highest-wins' && _.maxBy(play.players, (player) => parseInt(player.score)).win == 1))))
  );

const getPlayerResultsFromPlays = (plays, gameType) => {
  let playerResults = [];
  const sortDirection = gameType === 'lowest-wins' ? 'asc' : 'desc';

  _.forEach(plays, (play) => {
    // Sort players into finish position, based on score and win (for tie breaking)
    const sortedPlayers = _.orderBy(
      play.players,
      [(player) => parseInt(player.score), (player) => parseInt(player.win)],
      [sortDirection, 'desc']
    );

    if (sortedPlayers.length > 0) {
      _.forEach(sortedPlayers, (player, i) => {
        playerResults.push({
          score: parseInt(player.score),
          playerCount: parseInt(play.playerCount),
          new: player.new,
          startPosition: isNaN(parseInt(player.startposition)) ? '' : parseInt(player.startposition),
          // Handles ties
          finishPosition:
            i > 0 && playerResults[i - 1].score == parseInt(player.score) && parseInt(player.win) == 1
              ? playerResults[i - 1].finishPosition
              : i + 1,
          color: player.color.toLowerCase(),
          year: play.date ? parseInt(play.date.split('-')[0]) : '',
          month: play.date ? parseInt(play.date.split('-')[1]) : '',
          isWin: Boolean(parseInt(player.win) === 1),
          id: play.id,
          isTieBreakerWin: Boolean(
            parseInt(player.win) === 1 &&
              _.filter(sortedPlayers, (p) => parseInt(p.win) === 1).length === 1 &&
              _.filter(sortedPlayers, (p) => parseInt(p.score) == parseInt(player.score)).length > 1
          ),
          isSharedWin: Boolean(
            _.filter(sortedPlayers, (p) => parseInt(p.win) === 1 && parseInt(p.score) == parseInt(player.score))
              .length > 1
          ),
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
          wins: result.isWin ? { [result.score]: 1 } : {},
          playIds: [result.id],
          tieBreakerWins: result.isTieBreakerWin ? { [result.score]: 1 } : {},
          sharedWins: result.isSharedWin ? { [result.score]: 1 } : {},
        };
        props.forEach((prop) => (keyedResults[key][prop] = result[prop]));
      } else {
        keyedResults[key].scores[result.score] = _.defaultTo(keyedResults[key].scores[result.score], 0) + 1;
        if (result.isWin) {
          keyedResults[key].wins[result.score] = _.defaultTo(keyedResults[key].wins[result.score], 0) + 1;
        }
        keyedResults[key].playIds.push(result.id);
        if (result.isTieBreakerWin) {
          keyedResults[key].tieBreakerWins[result.score] =
            _.defaultTo(keyedResults[key].tieBreakerWins[result.score], 0) + 1;
        }
        if (result.isSharedWin) {
          keyedResults[key].sharedWins[result.score] = _.defaultTo(keyedResults[key].sharedWins[result.score], 0) + 1;
        }
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

const combineScores = (existingScores, newScores) => {
  let scores = existingScores || {};
  _.forOwn(newScores, (newCount, score) => {
    scores[score] = _.defaultTo(scores[score], 0) + newCount;
  });

  return scores;
};

const getCombinedResults = (keyedResults, existingResults) => {
  let combinedResults = {};

  _.forOwn(keyedResults, (result, key) => {
    const existingResult = _.find(existingResults, (result) => result.id === key);

    let scores = combineScores(existingResult?.scores, result.scores);
    let outlierScores = combineScores(existingResult?.outlierScores, result.outlierScores);
    let wins = combineScores(existingResult?.wins, result.wins);
    let tieBreakerWins = combineScores(existingResult?.tieBreakerWins, result.tieBreakerWins);
    let sharedWins = combineScores(existingResult?.sharedWins, result.sharedWins);

    const playCount = (existingResult ? existingResult.playCount : 0) + _.uniq(result.playIds).length;

    delete result.playIds;

    combinedResults[key] = {
      ...result,
      scores: scores,
      wins: wins,
      tieBreakerWins: tieBreakerWins,
      sharedWins: sharedWins,
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
  // Put old outliers back in so we don't mess with the STD too much
  let allScores = combineScores(result.scores, result.outlierScores);
  const allExplodedScores = getExplodedScores(allScores);

  // Remove outlier scores
  const trimmedScores = getTrimmedScores(allExplodedScores, allScores);
  const outlierScores = _.pickBy(allScores, (count, score) => !trimmedScores[score]);

  result.scores = trimmedScores;
  result.outlierScores = outlierScores;

  // Get stats based on trimmed scores. This will recalculate std.
  const stats = getStats(result.scores);

  // Get win percentage based on filtered wins
  const filteredWins = _.pickBy(result.wins, (count, score) => !result.outlierScores[score]);
  stats.winPercentage = parseInt((_.sum(Object.values(filteredWins)) / stats.scoreCount).toFixed(2) * 100);

  // Get tieBreakerWinCount based on filtered tieBreakerWins
  const filteredTieBreakerWins = _.pickBy(result.tieBreakerWins, (count, score) => !result.outlierScores[score]);
  stats.tieBreakerWinCount = _.sum(Object.values(filteredTieBreakerWins));

  // Get sharedWinCount based on filtered sharedWins
  const filteredSharedWins = _.pickBy(result.sharedWins, (count, score) => !result.outlierScores[score]);
  stats.sharedWinCount = _.sum(Object.values(filteredSharedWins));

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

const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const { mean } = require('mathjs');

const _ = require('lodash');
const dayjs = require('dayjs');

const util = require('./util');
const { combineScores, getResultsWithStats } = require('./resultStats');

exports.updateResults = async (game, batch, newPlays, clear = false) => {
  if (newPlays.length === 0) {
    return;
  }

  console.info(`Updating results for ${game.name} — ${newPlays.length} plays`);

  const resultsRef = firestore.collection('games').doc(game.id).collection('results');

  const resultsSnapshot = await resultsRef.get();

  const existingResults = clear ? [] : util.snapshotToArray(resultsSnapshot);
  const existingAllResult = _.find(existingResults, (result) => result.id === 'all');

  const detailsRef = firestore.collection('details').doc(game.id);
  const detailsSnapshot = await detailsRef.get();
  const details = detailsSnapshot.data();

  // Re-evaluate game type until enough plays have accumulated to be confident.
  // A small early sample can misclassify a game permanently.
  const GAME_TYPE_MIN_PLAYS = 50;
  const gameType =
    game.gameType && (game.totalValidPlays || 0) >= GAME_TYPE_MIN_PLAYS
      ? game.gameType
      : getGameType(newPlays);

  // Filter out invalid plays
  const validPlays = getValidPlays(newPlays, details, gameType);

  const invalidPlaysCount = newPlays.length - validPlays.length;
  console.info(`Ignoring ${invalidPlaysCount} invalid plays`);
  console.info(`Parsing ${validPlays.length} valid plays`);
  console.info('-'.repeat(100));

  if (validPlays.length === 0) {
    console.error('No valid plays!');
    return;
  }

  const playerResults = getPlayerResultsFromPlays(validPlays, gameType);
  const keyedResults = getKeyedResultsFromPlayerResults(playerResults);
  const filteredResults = filterResults(keyedResults);
  const combinedResults = getCombinedResults(filteredResults, existingResults);
  const resultsWithStats = getResultsWithStats(combinedResults);
  const playerCounts = getCombinedPlayerCounts(resultsWithStats, existingResults);
  const playerCountMeans = getPlayerCountMeans(resultsWithStats, existingResults, playerCounts);
  const results = getResultsWithExpected(resultsWithStats, playerCountMeans);

  const existingResultsWithKeys = existingResults.reduce((result, item) => ({ ...result, [item.id]: item }), {});
  const allResults = { ...existingResultsWithKeys, ...results };
  const updatedColors = getUpdatedColors(allResults);
  const updatedMonths = getUpdatedMonths(allResults);

  const newScoresCount = results.all.scoreCount - game.totalScores;
  const newOutlierScoreCount = results.all.outlierScoreCount - (existingAllResult?.outlierScoreCount || 0);
  console.info(`Ignoring ${newOutlierScoreCount} outlier scores`);
  console.info(`Adding ${newScoresCount} new scores to results`);

  _.forOwn(results, (result, key) => {
    batch.set(resultsRef.doc(key), result, { merge: false });
  });

  batch.update(firestore.collection('games').doc(game.id), {
    totalScores: results.all.scoreCount,
    totalValidPlays: _.defaultTo(game.totalValidPlays, 0) + validPlays.length,
    totalInvalidPlays: _.defaultTo(game.totalInvalidPlays, 0) + invalidPlaysCount,
    mean: parseFloat(results.all.mean),
    playerCounts: playerCounts,
    gameType: gameType,
    colors: updatedColors,
    months: updatedMonths,
  });
};

const getUpdatedColors = (allResults) => {
  const updatedColors = _.sortBy(
    Object.values(allResults).filter((result) => result.color),
    'scoreCount'
  )
    .reverse()
    .map((result) => result.color)
    .slice(0, 20);

  return updatedColors;
};

const getUpdatedMonths = (allResults) => {
  const updatedMonths = Object.values(allResults)
    .filter((result) => result.month)
    .map((result) => `${result.year}-${result.month}`);

  updatedMonths.sort().reverse();

  return updatedMonths;
};

const getGameType = (plays) => {
  const playsWithAtLeastOneWin = _.filter(plays, (play) => play.players.some((player) => parseInt(player.win) === 1));

  const playsWithAllWinners = _.filter(playsWithAtLeastOneWin, (play) =>
    _.every(play.players, (player) => parseInt(player.win) === 1)
  );

  if (playsWithAtLeastOneWin.length === 0) {
    console.info('No plays with win data — defaulting to highest-wins');
    return 'highest-wins';
  }

  const coopLikelihood = parseInt((playsWithAllWinners.length / playsWithAtLeastOneWin.length) * 100);
  console.info(`Cooperative game likelihood: ${coopLikelihood}`);

  if (coopLikelihood > 80) {
    return 'co-op';
  }

  const playsWithAtLeastOneScoreAndWin = _.filter(playsWithAtLeastOneWin, (play) =>
    play.players.some((player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) === 0))
  );

  if (playsWithAtLeastOneScoreAndWin.length === 0) {
    console.info('No plays with both score and win data — defaulting to highest-wins');
    return 'highest-wins';
  }

  const playsWithLowestWinner = _.filter(
    playsWithAtLeastOneScoreAndWin,
    (play) => parseInt(_.minBy(play.players, (player) => parseInt(player.score)).win) === 1
  );

  const lowestScoreWinsLikelihood = parseInt(
    (playsWithLowestWinner.length / playsWithAtLeastOneScoreAndWin.length) * 100
  );
  console.info(`Lowest score wins game likelihood: ${lowestScoreWinsLikelihood}`);

  if (lowestScoreWinsLikelihood > 50) {
    return 'lowest-wins';
  }

  return 'highest-wins';
};

// Remove plays that we don't want to include in our score
const getValidPlays = (plays, details, gameType) => {
  let totalRemovedPlays = 0;
  let removedPlays = 0;

  // Only include plays where game was completed
  let validPlays = _.filter(plays, (play) => parseInt(play.incomplete) === 0);
  removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
  console.info(`Removed ${removedPlays} plays for being incomplete`);
  totalRemovedPlays = plays.length - validPlays.length;

  // There weren't too many or too few players.
  // Solo plays (playerCount === 1) are always allowed regardless of minplayers,
  // since many games support a solo mode even when minplayers > 1 on BGG.
  validPlays = _.filter(
    validPlays,
    (play) => play.playerCount === 1 || (play.playerCount >= details.minplayers && play.playerCount <= details.maxplayers)
  );
  removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
  console.info(`Removed ${removedPlays} plays for having too few or too many players`);
  totalRemovedPlays = plays.length - validPlays.length;

  // Play date was after game was published, and not in the future
  validPlays = _.filter(
    validPlays,
    (play) =>
      dayjs(play.date).isAfter(dayjs(`${details.yearpublished}-01-01`).subtract(1, 'day'), 'day') &&
      dayjs(play.date).isBefore(dayjs().add(1, 'day'), 'day')
  );
  removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
  console.info(`Removed ${removedPlays} plays for having a date before game was published or in the future`);
  totalRemovedPlays = plays.length - validPlays.length;

  // Every player has a numeric score.
  validPlays = _.filter(validPlays, (play) => _.every(play.players, (player) => !isNaN(parseInt(player.score))));
  removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
  console.info(`Removed ${removedPlays} because not every player had a valid numeric score`);
  totalRemovedPlays = plays.length - validPlays.length;

  // At least one player has a non-zero score. This may include some plays with erroneous 0s.
  validPlays = _.filter(validPlays, (play) => _.some(play.players, (player) => parseInt(player.score) > 0));
  removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
  console.info(`Removed ${removedPlays} because all players had a score of 0`);
  totalRemovedPlays = plays.length - validPlays.length;

  // At most one player has a score of zero. This may exclude more plays than we want to.
  validPlays = _.filter(
    validPlays,
    (play) => _.filter(play.players, (player) => parseInt(player.score) === 0).length <= 1
  );
  removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
  console.info(`Removed ${removedPlays} because more than one player had a score of 0`);
  totalRemovedPlays = plays.length - validPlays.length;

  // Lowest score is winner (skipped for solo plays — no win flag expected)
  if (gameType === 'lowest-wins') {
    validPlays = _.filter(validPlays, (play) => play.playerCount === 1 || parseInt(_.minBy(play.players, (player) => parseInt(player.score)).win) === 1);
    removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
    console.info(`Removed ${removedPlays} because the lowest scoring player was not the winner`);
    totalRemovedPlays = plays.length - validPlays.length;
  }

  // Highest score is winner (skipped for solo plays — no win flag expected)
  if (gameType === 'highest-wins') {
    validPlays = _.filter(validPlays, (play) => play.playerCount === 1 || parseInt(_.maxBy(play.players, (player) => parseInt(player.score)).win) === 1);
    removedPlays = plays.length - (validPlays.length + totalRemovedPlays);
    console.info(`Removed ${removedPlays} because the highest scoring player was not the winner`);
  }

  return validPlays;
};

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
        const tieBreakerWin = Boolean(
          parseInt(player.win) === 1 &&
            _.filter(sortedPlayers, (p) => parseInt(p.win) === 1).length === 1 &&
            _.filter(sortedPlayers, (p) => parseInt(p.score) === parseInt(player.score)).length > 1
        );

        const sharedWin = Boolean(
          _.filter(sortedPlayers, (p) => parseInt(p.win) === 1 && parseInt(p.score) === parseInt(player.score)).length >
            1
        );

        // Count how many players have a strictly better score to determine finish position.
        // This correctly handles ties among non-winners (e.g. two players both 2nd).
        const betterPlayers = sortedPlayers.filter((p) =>
          gameType === 'lowest-wins'
            ? parseInt(p.score) < parseInt(player.score)
            : parseInt(p.score) > parseInt(player.score)
        );
        const finishPosition = sharedWin ? 1 : betterPlayers.length + 1;

        playerResults.push({
          // Undefined scores are valid for co-op games
          score: parseInt(player.score),
          playerCount: parseInt(play.playerCount),
          new: player.new,
          startPosition: isNaN(parseInt(player.startposition)) ? '' : parseInt(player.startposition),
          finishPosition: finishPosition,
          color: player.color === undefined ? '' : player.color.toLowerCase(),
          year: play.date ? parseInt(play.date.split('-')[0]) : '',
          month: play.date ? parseInt(play.date.split('-')[1]) : '',
          isWin: Boolean(parseInt(player.win) === 1),
          id: play.id,
          isTieBreakerWin: tieBreakerWin,
          isSharedWin: i === 0 && sharedWin,
        });
      });
    }
  });

  return playerResults;
};

const getKeyedResultsFromPlayerResults = (playerResults) => {
  const keyedResults = {};

  playerResults.forEach((result) => {
    const keys = getKeysFromResult(result);
    _.forOwn(keys, (props, key) => {
      if (!keyedResults[key]) {
        // Key is new
        keyedResults[key] = {
          scores: { [result.score]: 1 },
          playIds: [result.id],
          playCount: 1,
        };

        if (props.includes('wins')) {
          keyedResults[key].wins = result.isWin ? { [result.score]: 1 } : {};
        }
        if (props.includes('tieBreakerWins')) {
          keyedResults[key].tieBreakerWins = result.isTieBreakerWin ? { [result.score]: 1 } : {};
        }
        if (props.includes('sharedWins')) {
          keyedResults[key].sharedWins = result.isSharedWin ? { [result.score]: 1 } : {};
        }
        if (props.includes('playerCounts')) {
          keyedResults[key].playerCounts = { [result.playerCount]: 1 };
        }

        // Additional props
        props.forEach((prop) => {
          if (result[prop]) {
            keyedResults[key][prop] = result[prop];
          }
        });
      } else {
        // Key already exists
        keyedResults[key].scores[result.score] = _.defaultTo(keyedResults[key].scores[result.score], 0) + 1;

        if (!keyedResults[key].playIds.includes(result.id)) {
          keyedResults[key].playIds.push(result.id);
          keyedResults[key].playCount = keyedResults[key].playIds.length;
        }

        if (result.isWin && keyedResults[key].wins) {
          keyedResults[key].wins[result.score] = _.defaultTo(keyedResults[key].wins[result.score], 0) + 1;
        }
        if (result.isTieBreakerWin && keyedResults[key].tieBreakerWins) {
          keyedResults[key].tieBreakerWins[result.score] =
            _.defaultTo(keyedResults[key].tieBreakerWins[result.score], 0) + 1;
        }
        if (result.isSharedWin && keyedResults[key].sharedWins) {
          keyedResults[key].sharedWins[result.score] = _.defaultTo(keyedResults[key].sharedWins[result.score], 0) + 1;
        }
        if (keyedResults[key].playerCounts) {
          keyedResults[key].playerCounts[result.playerCount] =
            _.defaultTo(keyedResults[key].playerCounts[result.playerCount], 0) + 1;
        }
      }
    });
  });

  return keyedResults;
};

const getColorKey = (color) => {
  return `color-${color.trim().toLowerCase().replace(/ /g, '-').replace(/[.']/g, '')}`;
};

const getKeysFromResult = (result) => {
  // Solo plays are a separate category — exclude them from aggregate keys
  // (all, year, color) so they don't pollute multiplayer distributions.
  const isSolo = result.playerCount === 1;
  let keys = isSolo ? {} : { all: ['wins', 'tieBreakerWins', 'sharedWins'] };
  if (result.playerCount) {
    keys[`count-${result.playerCount}`] = ['playerCount', 'tieBreakerWins', 'sharedWins'];
    if (!isSolo) {
      if (result.startPosition && !isNaN(result.startPosition) && result.startPosition <= result.playerCount) {
        keys[`count-${result.playerCount}-start-${result.startPosition}`] = ['playerCount', 'startPosition', 'wins'];
      }
      if (result.finishPosition) {
        keys[`count-${result.playerCount}-finish-${result.finishPosition}`] = ['playerCount', 'finishPosition'];
      }
      if (result.new > 0) {
        keys[`count-${result.playerCount}-new`] = ['playerCount', 'new', 'wins'];
      }
    }
  }
  if (!isSolo) {
    if (result.year) {
      keys[`year-${result.year}`] = ['year'];
      if (result.month) {
        keys[`year-${result.year}-month-${result.month}`] = ['year', 'month'];
      }
    }
    if (result.color) {
      keys[getColorKey(result.color)] = ['color', 'wins', 'playerCounts'];
    }
  }

  return keys;
};

const getCombinedResults = (keyedResults, existingResults) => {
  let combinedResults = {};

  _.forOwn(keyedResults, (result, key) => {
    const existingResult = _.find(existingResults, (result) => result.id === key);

    let scores = combineScores(existingResult?.scores, result.scores);
    delete scores['NaN'];

    delete result.playIds;
    delete result.playCount;

    combinedResults[key] = {
      ...result,
      scores: scores,
      outlierScores: existingResult?.outlierScores,
    };

    if (result.wins !== undefined) {
      combinedResults[key].wins = combineScores(existingResult?.wins, result.wins);
    }
    if (result.tieBreakerWins !== undefined) {
      combinedResults[key].tieBreakerWins = combineScores(existingResult?.tieBreakerWins, result.tieBreakerWins);
    }
    if (result.sharedWins !== undefined) {
      combinedResults[key].sharedWins = combineScores(existingResult?.sharedWins, result.sharedWins);
    }
    if (result.playerCounts !== undefined) {
      combinedResults[key].playerCounts = combineScores(existingResult?.playerCounts, result.playerCounts);
    }
  });

  return combinedResults;
};

const filterResults = (newResults) => {
  const colorResults = _.filter(Object.values(newResults), (result) => result.color !== undefined);
  const colorPlayCounts = _.map(colorResults, 'playCount');
  const colorPlayCountTotal = _.sum(colorPlayCounts);

  console.info(`Total color results: ${colorPlayCountTotal}`);

  const filteredResults = _.pickBy(
    newResults,
    (result, key) =>
      !key.startsWith('color') ||
      (/^[a-zA-Z0-9'\-. ]+$/.test(result.color) &&
        result.playCount > 1 &&
        result.playCount / colorPlayCountTotal >= 0.001)
  );

  const sortedColorResults = _.orderBy(colorResults, 'playCount', 'desc');

  // Log results
  for (const result of sortedColorResults) {
    if (filteredResults[getColorKey(result.color)] === undefined) {
      console.info(
        `Skipping color: ${result.color} - ${result.playCount} - ${(result.playCount / colorPlayCountTotal).toFixed(4)}`
      );
    } else {
      console.info(
        `Including color: ${result.color} - ${result.playCount} - ${(result.playCount / colorPlayCountTotal).toFixed(
          4
        )}`
      );
    }
  }
  console.info('-'.repeat(100));

  return filteredResults;
};

const getPlayerCountMeans = (results, existingResults, playerCounts) => {
  return playerCounts.reduce((means, playerCount) => {
    const key = `count-${playerCount}`;
    let result = results[key];

    if (result === undefined) {
      result = _.find(existingResults, (result) => result.id === key);
    }

    if (result === undefined) {
      console.warn(`getPlayerCountMeans: no result found for key "${key}", skipping`);
      return means;
    }

    return {
      ...means,
      [playerCount]: result.mean,
    };
  }, {});
};

const getResultsWithExpected = (results, playerCountMeans) => {
  return _.mapValues(results, (result) => {
    if (result.new || result.startPosition) {
      const expectedMean = playerCountMeans[result.playerCount];
      return {
        ...result,
        ...(expectedMean !== undefined && { expectedMean }),
        expectedWinPercentage: (100 / result.playerCount).toFixed(2),
      };
    }

    if (!result.playerCounts) {
      return result;
    }

    // Get the mean of means for all playsCounts
    const meanInputs = _.transform(
      result.playerCounts,
      (means, num, playerCount) => {
        if (playerCountMeans[playerCount] !== undefined) {
          means.push(Array(num).fill(playerCountMeans[playerCount]));
        }
      },
      []
    );
    const expectedMean = meanInputs.length > 0 ? mean(meanInputs) : undefined;

    const expectedWinPercentage = mean(
      _.transform(
        result.playerCounts,
        (winPercentages, num, playerCount) => {
          winPercentages.push(Array(num).fill(100 / playerCount));
        },
        []
      )
    );

    return {
      ...result,
      ...(expectedMean !== undefined && { expectedMean: expectedMean.toFixed(2) }),
      expectedWinPercentage: expectedWinPercentage.toFixed(2),
    };
  });
};

const getCombinedPlayerCounts = (results, existingResults) =>
  _(getPlayerCounts(results).concat(getPlayerCounts(existingResults)))
    .uniq()
    .sortBy()
    .value();

const getPlayerCounts = (results) =>
  _(results)
    .filter((result) => result.playerCount)
    .map((result) => parseInt(result.playerCount))
    .uniq()
    .sortBy()
    .value();

// Exported for testing only
exports._test = {
  getGameType,
  getValidPlays,
  getColorKey,
  getKeysFromResult,
  getResultsWithExpected,
  filterResults,
  getKeyedResultsFromPlayerResults,
  getPlayerResultsFromPlays,
  getCombinedResults,
};

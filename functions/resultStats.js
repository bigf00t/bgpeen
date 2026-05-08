const { mean, mode, median, std, mad, abs } = require('mathjs');
const _ = require('lodash');

const combineScores = (existingScores, newScores) => {
  if (newScores === undefined) {
    return existingScores;
  }

  const scores = existingScores === undefined ? {} : { ...existingScores };

  _.forOwn(newScores, (newCount, score) => {
    scores[score] = _.defaultTo(scores[score], 0) + newCount;
  });

  return scores;
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

const getStats = (explodedScores) => {
  if (explodedScores.length === 0) {
    return {};
  }

  const modeResult = mode(explodedScores);
  // mathjs returns an array when multiple values share the highest frequency;
  // use the median of the modes so the result is a single representative number.
  const modeValue = Array.isArray(modeResult)
    ? parseFloat(median(modeResult))
    : parseFloat(modeResult);

  return {
    mean: parseFloat(mean(explodedScores)).toFixed(2),
    std: parseFloat(std(explodedScores)).toFixed(2),
    median: parseFloat(median(explodedScores)),
    mode: modeValue,
    mad: parseFloat(mad(explodedScores)),
  };
};

const removeOutlierScores = (scores, outliers) => {
  return _.pickBy(scores, (_, score) => !outliers.includes(parseInt(score)));
};

const getOutlierScores = (scores, outliers) => {
  return _.pickBy(scores, (_, score) => outliers.includes(parseInt(score)));
};

// Get outlier scores based on double MAD
const calculateNewOutliers = (result) => {
  // Put old outliers back in so we don't mess with the STD too much
  const scoresAndOutliers = combineScores(result.scores, result.outlierScores);

  const explodedScores = getExplodedScores(scoresAndOutliers);

  const medianVal = median(explodedScores);
  const madCutoff = 8;

  const leftHalf = _.filter(explodedScores, (score) => score <= medianVal);
  const rightHalf = _.filter(explodedScores, (score) => score >= medianVal);

  // Floor at 1 to prevent division by zero when a single score dominates a half,
  // which would collapse MAD to 0 and flag all other scores as infinite outliers.
  const leftMad = Math.max(mad(leftHalf), 1);
  const rightMad = Math.max(mad(rightHalf), 1);

  console.info(`Left mad: ${leftMad} - Median: ${medianVal} - Right mad: ${rightMad} - Cutoff: ${madCutoff}`);
  console.info(`Finding outlier scores < ${medianVal - leftMad * madCutoff} and > ${medianVal + rightMad * madCutoff}`);

  const leftOutliers = _(leftHalf)
    .filter((score) => abs(score - medianVal) / leftMad > madCutoff)
    .uniq()
    .value();
  const rightOutliers = _(rightHalf)
    .filter((score) => abs(score - medianVal) / rightMad > madCutoff)
    .uniq()
    .value();

  const outliers = leftOutliers.concat(rightOutliers);
  console.info(`Found ${outliers.length} outlier score values: `);
  console.info(outliers);
  console.info('-'.repeat(100));

  return outliers;
};

const addStatsToResult = (result, outliers) => {
  // Re-evaluate the full distribution (current scores + previously flagged outliers)
  // so that scores which are no longer anomalous can be promoted back.
  const allScores = combineScores(result.scores, result.outlierScores);
  const trimmedScores = removeOutlierScores(allScores, outliers);
  const outlierScores = getOutlierScores(allScores, outliers);
  const outlierScoreCount = _.sum(Object.values(outlierScores));

  const explodedScores = getExplodedScores(trimmedScores);
  const trimmedScoreCount = explodedScores.length;

  const updated = {
    ...result,
    scores: trimmedScores,
    scoreCount: trimmedScoreCount,
    outlierScores,
    outlierScoreCount,
  };

  if (result.wins !== undefined) {
    const trimmedWins = removeOutlierScores(result.wins, outliers);
    updated.trimmedWinCount = _.sum(Object.values(trimmedWins));
    updated.trimmedWinPercentage = ((updated.trimmedWinCount / trimmedScoreCount) * 100).toFixed(2);
  }

  if (result.tieBreakerWins !== undefined) {
    const trimmedTieBreakerWins = removeOutlierScores(result.tieBreakerWins, outliers);
    updated.trimmedTieBreakerWinCount = _.sum(Object.values(trimmedTieBreakerWins));
  }

  if (result.sharedWins !== undefined) {
    const trimmedSharedWins = removeOutlierScores(result.sharedWins, outliers);
    updated.trimmedSharedWinCount = _.sum(Object.values(trimmedSharedWins));
  }

  return { ...updated, ...getStats(explodedScores) };
};

// We only calc outliers on the "all" result, since it has all datapoints
const getResultsWithStats = (results) => {
  if (!results.all) {
    console.error('getResultsWithStats: no "all" result found, cannot calculate outliers');
    return _.mapValues(results, (result) => addStatsToResult(result, []));
  }
  const newOutliers = calculateNewOutliers(results.all);
  return _.mapValues(results, (result) => addStatsToResult(result, newOutliers));
};

module.exports = {
  combineScores,
  getResultsWithStats,
  _test: {
    getExplodedScores,
    getStats,
    combineScores,
    removeOutlierScores,
    getOutlierScores,
    calculateNewOutliers,
    addStatsToResult,
  },
};

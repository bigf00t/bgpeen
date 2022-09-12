const fcmScores = require('./fcm-scores.json');
const gaiaScores = require('./gaia-scores.json');
const arkNovaScores = require('./ark-nova-scores.json');
const catanScores = require('./catan-scores.json');
const _ = require('lodash');
const { mean, mode, median, std, mad, variance, abs } = require('mathjs');

describe('outliers', () => {
  test('outliers 1', () => {
    const exploded = _.reduce(
      fcmScores,
      (exploded, count, score) => {
        return exploded.concat(_.fill(Array(count), parseInt(score)));
      },
      []
    );

    const stats = {
      mean: parseFloat(mean(exploded)).toFixed(2),
      std: parseFloat(std(exploded)).toFixed(2),
      median: parseFloat(median(exploded)),
      mode: parseFloat(mode(exploded)),
      scoreCount: exploded.length,
      mad: parseFloat(mad(exploded)).toFixed(2),
      variance: parseFloat(variance(exploded)).toFixed(2),
    };

    console.log(stats);

    const leftHalf = _.filter(exploded, (score) => score <= stats.median);
    const rightHalf = _.filter(exploded, (score) => score >= stats.median);

    const leftMad = mad(leftHalf);
    const rightMad = mad(rightHalf);

    console.log(leftMad);
    console.log(rightMad);

    const cutoff = 8;

    const leftOutliers = _(leftHalf)
      .filter((score) => abs(score - stats.median) / leftMad > cutoff)
      .uniq()
      .value();
    const rightOutliers = _(rightHalf)
      .filter((score) => abs(score - stats.median) / rightMad > cutoff)
      .uniq()
      .value();

    console.log(leftOutliers);
    console.log(rightOutliers);
  });
});

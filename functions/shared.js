const { getStorage } = require('firebase-admin/storage');
const { BUCKET } = require('./util');
const _ = require('lodash');

const getResultId = (params) => {
  if (params.players) {
    let id = `count-${params.players}`;
    if (params.start) id += `-start-${params.start}`;
    else if (params.finish) id += `-finish-${params.finish}`;
    else if (params.new) id += `-new`;
    return id;
  }
  if (params.color) return `color-${params.color}`;
  if (params.year) {
    let id = `year-${params.year}`;
    if (params.month) id += `-month-${params.month}`;
    return id;
  }
  return 'all';
};

const calcPercentile = (scores, score) => {
  const s = parseInt(score);
  const total = _.sum(_.values(scores));
  if (!total) return null;
  return (
    (_.reduce(scores, (acc, c, key) => acc + (parseInt(key) < s ? c : 0) + (parseInt(key) === s ? c * 0.5 : 0), 0) *
      100) /
    total
  );
};

const getPercentileQuip = (percentile) => {
  if (Math.ceil(percentile) === 69) return 'nice.';
  if (percentile < 1) return 'quite possibly one of the worst in the world!';
  if (percentile < 10) return 'just terrible.';
  if (percentile < 40) return 'not very good.';
  if (percentile < 60) return 'boringly average.';
  if (percentile < 90) return 'actually pretty decent...';
  if (percentile < 99) return 'legit amazing!';
  return 'probably cheating :(';
};

const getFromCache = async (cacheKey) => {
  const file = getStorage().bucket(BUCKET).file(cacheKey);
  try {
    const [buffer] = await file.download();
    return buffer;
  } catch (e) {
    if (e.code === 404) return null;
    throw e;
  }
};

const setToCache = async (cacheKey, data, contentType, { makePublic = false } = {}) => {
  const file = getStorage().bucket(BUCKET).file(cacheKey);
  await file.save(data, { contentType, resumable: false });
  if (makePublic) await file.makePublic();
};

module.exports = { BUCKET, getResultId, calcPercentile, getPercentileQuip, getFromCache, setToCache };

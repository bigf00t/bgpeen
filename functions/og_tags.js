const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const BUCKET = 'bgpeen-1fc16.appspot.com';

const getCacheKey = (reqPath) => `og-tags${reqPath.replace(/\/$/, '')}.html`;

const getCachedHtml = async (cacheKey) => {
  const file = getStorage().bucket(BUCKET).file(cacheKey);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buffer] = await file.download();
  return buffer.toString('utf8');
};

const setCachedHtml = async (cacheKey, html) => {
  const file = getStorage().bucket(BUCKET).file(cacheKey);
  await file.save(html, { contentType: 'text/html' });
};

// Parse URL path into named params
// e.g. /127060/bora-bora/players/4/finish/2/score/180
const parseParams = (reqPath) => {
  const parts = reqPath.replace(/^\//, '').split('/');
  const params = { id: parts[0] };
  for (let i = 2; i < parts.length - 1; i += 2) {
    params[parts[i]] = parts[i + 1];
  }
  return params;
};

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
    (_.reduce(scores, (acc, c, key) => acc + (parseInt(key) < s ? c : 0) + (parseInt(key) === s ? c / 0.5 : 0), 0) *
      100) /
    total
  );
};

const getPercentileDesc = (percentile) => {
  if (percentile === null) return null;
  const position = percentile < 50 ? 'bottom' : percentile > 50 ? 'top' : 'middle';
  const pct = percentile > 50 ? (100 - percentile).toFixed(2) : percentile.toFixed(2);
  return `${position} ${pct}%`;
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

const getHtmlWithTags = (game, result, params, percentile) => {
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  let title = `How good at ${game.name} are you?`;
  let description = title;
  const resultId = getResultId(params);
  let image = `https://goodat.games/preview/${params.id}/${resultId}`;

  if (params.score && result?.scores) {
    const percentile = calcPercentile(result.scores, params.score);
    const percentileDesc = getPercentileDesc(percentile);
    const query = [`score=${params.score}`, `percentile=${percentile.toFixed(2)}`].join('&');
    image = `https://goodat.games/preview/${params.id}/${resultId}?${query}`;
    title = `I'm ${getPercentileQuip(percentile).replace(/[.!:(]+$/, '')} at ${game.name}`;
    description = `My score of ${params.score} was in the ${percentileDesc} of similar scores on goodat.games. How good are you?`;
  }

  const url = `https://goodat.games`;

  const tags = `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="goodat.games" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@GoodAtDotGames" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />`;

  return html.replace('</head>', `${tags}\n  </head>`);
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

exports.serveOgTags = async (req, res) => {
  try {
    const params = parseParams(req.path);
    const cacheKey = getCacheKey(req.path);
    const db = getFirestore();

    // Race Storage cache against Firestore — serve whichever wins
    const cached = await Promise.race([
      getCachedHtml(cacheKey),
      new Promise((resolve) => setTimeout(() => resolve(null), 800)),
    ]);

    if (cached) {
      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'public, max-age=300');
      res.status(200).send(cached);
      return;
    }
    const gameSnap = await db.collection('games').doc(params.id).get();
    if (!gameSnap.exists) {
      res.status(404).send('Not found');
      return;
    }

    const game = gameSnap.data();
    let result = null;
    let percentile = null;

    const resultId = getResultId(params);
    const resultSnap = await db.collection('games').doc(params.id).collection('results').doc(resultId).get();
    if (resultSnap.exists) {
      result = resultSnap.data();
      if (params.score) {
        percentile = calcPercentile(result.scores, params.score);
      }
    }

    const html = getHtmlWithTags(game, result, params, percentile);

    setCachedHtml(cacheKey, html).catch((e) => console.error('Failed to cache og tags:', e));

    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).send(html);
  } catch (e) {
    console.error('serveOgTags failed:', e);
    res.status(500).send('Internal server error');
  }
};

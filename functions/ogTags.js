const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const { getResultId, calcPercentile, getPercentileQuip, getFromCache, setToCache } = require('./scoring');

const loadIndexHtml = () => {
  try {
    return fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  } catch (e) {
    console.warn('Could not read index.html:', e.message);
    return null;
  }
};

const INDEX_HTML = loadIndexHtml();
const BUILD_VERSION = INDEX_HTML ? (INDEX_HTML.match(/index-([^"]+)\.js/)?.[1] ?? 'default') : 'default';

const getCacheKey = (reqPath) => `og-tags/${BUILD_VERSION}${reqPath.replace(/\/$/, '')}.html`;

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

const getPercentileDesc = (percentile) => {
  if (percentile === null) return null;
  const position = percentile < 50 ? 'bottom' : percentile > 50 ? 'top' : 'middle';
  const pct = percentile > 50 ? (100 - percentile).toFixed(2) : percentile.toFixed(2);
  return `${position} ${pct}%`;
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getHtmlWithTags = (game, params, percentile) => {
  const html = INDEX_HTML;

  let title = `How good at ${game.name} are you?`;
  let description = title;
  const resultId = getResultId(params);
  let image = `https://goodat.games/preview/${params.id}/${resultId}`;

  if (params.score && percentile !== null && percentile !== undefined) {
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

exports.serveOgTags = async (req, res) => {
  try {
    const params = parseParams(req.path);
    const cacheKey = getCacheKey(req.path);
    const db = getFirestore();

    // Race Storage cache against Firestore — serve whichever wins
    const cachedBuffer = await Promise.race([
      getFromCache(cacheKey),
      new Promise((resolve) => setTimeout(() => resolve(null), 800)),
    ]);

    if (cachedBuffer) {
      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'public, max-age=300');
      res.status(200).send(cachedBuffer.toString('utf8'));
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

    const html = getHtmlWithTags(game, params, percentile);

    setToCache(cacheKey, html, 'text/html').catch((e) => console.error('Failed to cache og tags:', e));

    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).send(html);
  } catch (e) {
    console.error('serveOgTags failed:', e);
    res.status(500).send('Internal server error');
  }
};

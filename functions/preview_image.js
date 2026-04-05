const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const _ = require('lodash');

const BUCKET = 'bgpeen-1fc16.appspot.com';

const WIDTH = 1200;
const HEIGHT = 600;

const COLORS = {
  background: 'rgba(255, 205, 86, 0.25)',
  border: 'rgba(255, 205, 86, 0.5)',
  point: 'rgba(255, 205, 86, 1)',
  text: 'rgba(255, 255, 255, 0.7)',
  grid: 'rgba(255, 255, 255, 0.12)',
  mean: 'rgba(255, 255, 255, 0.5)',
};

const getScoreColor = (percentile) => {
  if (percentile === null || percentile === undefined) return null;
  return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : 'rgba(255, 255, 255, 0.7)';
};

const renderChart = async (result, score, percentile) => {
  const chartData = _.chain(result.scores)
    .reduce((points, count, s) => points.concat([{ x: parseInt(s), y: count }]), [])
    .orderBy(['x'])
    .value();

  const labels = chartData.map((item) => item.x);
  const values = chartData.map((item) => item.y);
  const xMin = labels[0];
  const xMax = labels[labels.length - 1];

  const annotations = {
    mean: {
      type: 'line',
      scaleID: 'x',
      value: result.mean,
      borderColor: COLORS.mean,
      borderDash: [5],
      borderWidth: 2,
    },
  };

  if (score) {
    annotations.score = {
      type: 'line',
      scaleID: 'x',
      value: parseInt(score),
      borderColor: getScoreColor(percentile) || COLORS.text,
      borderWidth: 4,
    };
  }

  const OVERSCAN_X = 20;
  const OVERSCAN_Y = 50;
  const canvas = new ChartJSNodeCanvas({
    width: WIDTH + OVERSCAN_X * 2,
    height: HEIGHT + OVERSCAN_Y,
    backgroundColour: 'transparent',
    plugins: { modern: ['chartjs-plugin-annotation'] },
  });

  return canvas.renderToBuffer({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: COLORS.background,
          borderColor: COLORS.border,
          pointBackgroundColor: COLORS.point,
          fill: true,
          spanGaps: true,
          tension: 0,
          clip: false,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      scales: {
        y: {
          display: false,
          beginAtZero: true,
        },
        x: {
          display: false,
          type: 'linear',
          min: xMin,
          max: xMax,
        },
      },
      plugins: {
        legend: { display: false },
        annotation: { animation: false, annotations },
      },
      layout: { padding: 0 },
    },
  });
};

const fetchImage = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return loadImage(Buffer.from(response.data));
};

// Draw image cover-scaled (like CSS background-size: cover) centered
const drawCover = (ctx, img, x, y, w, h) => {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = x + (w - sw) / 2;
  const sy = y + (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
};

const composite = async (gameImageUrl, chartBuffer) => {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Dark base background
  ctx.fillStyle = '#303030';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Game art filling entire canvas
  if (gameImageUrl) {
    try {
      const gameImg = await fetchImage(gameImageUrl);
      drawCover(ctx, gameImg, 0, 0, WIDTH, HEIGHT);
    } catch (e) {
      console.warn('Could not load game image:', e.message);
    }
  }

  // Dark overlay for chart readability across full image
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Chart overlaid full canvas — crop overscan margins
  const OVERSCAN_X = 20;
  const OVERSCAN_Y = 50;
  const chartImg = await loadImage(chartBuffer);
  ctx.drawImage(chartImg, OVERSCAN_X, 0, WIDTH, HEIGHT + OVERSCAN_Y, 0, 0, WIDTH, HEIGHT + 5);

  return canvas.toBuffer('image/png');
};

const getCacheKey = (gameId, resultId, score) => {
  const scorePart = score ? `_score-${score}` : '';
  return `previews/${gameId}/${resultId}${scorePart}.png`;
};

const getCachedImage = async (cacheKey) => {
  const file = getStorage().bucket(BUCKET).file(cacheKey);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buffer] = await file.download();
  return buffer;
};

const setCachedImage = async (cacheKey, png) => {
  const file = getStorage().bucket(BUCKET).file(cacheKey);
  await file.save(png, { contentType: 'image/png', resumable: false });
  await file.makePublic();
};

exports.warmCache = async (gameId, resultId, score, percentile) => {
  const cacheKey = getCacheKey(gameId, resultId, score);
  const [exists] = await getStorage().bucket(BUCKET).file(cacheKey).exists();
  if (exists) return;

  const db = getFirestore();
  const [gameSnap, resultSnap] = await Promise.all([
    db.collection('games').doc(gameId).get(),
    db.collection('games').doc(gameId).collection('results').doc(resultId).get(),
  ]);

  if (!resultSnap.exists) return;

  const game = gameSnap.exists ? gameSnap.data() : null;
  const result = resultSnap.data();
  const gameImageUrl = game?.image || game?.thumbnail || null;

  const chartBuffer = await renderChart(result, score, percentile ? parseFloat(percentile) : null);
  const png = await composite(gameImageUrl, chartBuffer);
  await setCachedImage(cacheKey, png);
};

exports.servePreviewImage = async (req, res) => {
  try {
    const parts = req.path.replace(/^\//, '').split('/');
    const gameId = parts[1];
    const resultId = parts[2] || 'all';
    const score = req.query.score ? parseInt(req.query.score) : null;
    const percentile = req.query.percentile ? parseFloat(req.query.percentile) : null;

    const cacheKey = getCacheKey(gameId, resultId, score);

    // Serve from cache if available
    const cached = await getCachedImage(cacheKey);
    if (cached) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-Cache', 'HIT');
      res.status(200).send(cached);
      return;
    }

    const db = getFirestore();
    const [gameSnap, resultSnap] = await Promise.all([
      db.collection('games').doc(gameId).get(),
      db.collection('games').doc(gameId).collection('results').doc(resultId).get(),
    ]);

    if (!resultSnap.exists) {
      res.status(404).send('Not found');
      return;
    }

    const game = gameSnap.exists ? gameSnap.data() : null;
    const result = resultSnap.data();
    const gameImageUrl = game?.image || game?.thumbnail || null;

    const chartBuffer = await renderChart(result, score, percentile);
    const png = await composite(gameImageUrl, chartBuffer);

    // Cache in background — don't block the response
    setCachedImage(cacheKey, png).catch((e) => console.error('Failed to cache preview image:', e));

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('X-Cache', 'MISS');
    res.status(200).send(png);
  } catch (e) {
    console.error('servePreviewImage failed:', e);
    res.status(500).send('Internal server error');
  }
};

const { getFirestore } = require('firebase-admin/firestore');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const _ = require('lodash');
const { existsInCache, setToCache } = require('./scoring');

const WIDTH = 1200;
const HEIGHT = 600;
const OVERSCAN_X = 20;
const OVERSCAN_Y = 50;

const chartCanvas = new ChartJSNodeCanvas({
  width: WIDTH + OVERSCAN_X * 2,
  height: HEIGHT + OVERSCAN_Y,
  backgroundColour: 'transparent',
  plugins: { modern: ['chartjs-plugin-annotation'] },
});

const COLORS = {
  background: 'rgba(255, 205, 86, 1)',
  border: 'rgba(255, 205, 86, 1)',
  point: 'rgba(255, 205, 86, 1)',
  text: 'rgba(255, 255, 255, 0.7)',
  grid: 'rgba(255, 255, 255, 0.12)',
  mean: 'rgba(255, 255, 255, 1)',
};

const getScoreColor = (percentile, { opaque = false } = {}) => {
  if (percentile === null || percentile === undefined) return opaque ? '#ffffff' : null;
  return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : '#cccccc';
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
      borderWidth: 6,
      z: 1,
    },
    meanLabel: {
      type: 'label',
      xScaleID: 'x',
      yScaleID: 'y',
      xValue: result.mean,
      yAdjust: -20,
      content: `Avg - ${Math.round(result.mean)}`,
      backgroundColor: '#ffffff',
      color: '#000',
      rotation: -90,
      font: { size: 42, weight: 'bold' },
      padding: 8,
      z: 10,
    },
  };

  if (score) {
    const scoreColor = getScoreColor(percentile) || COLORS.text;
    const scoreFraction = (parseInt(score) - xMin) / (xMax - xMin);
    const LABEL_HALF_WIDTH = 90;
    const xAdjust = scoreFraction * WIDTH < LABEL_HALF_WIDTH ? LABEL_HALF_WIDTH - scoreFraction * WIDTH :
                    (1 - scoreFraction) * WIDTH < LABEL_HALF_WIDTH ? (1 - scoreFraction) * WIDTH - LABEL_HALF_WIDTH : 0;
    annotations.score = {
      type: 'line',
      scaleID: 'x',
      value: parseInt(score),
      borderColor: scoreColor,
      borderWidth: 6,
      z: 1,
    };
    annotations.scoreLabel = {
      type: 'label',
      xScaleID: 'x',
      yScaleID: 'y',
      xValue: parseInt(score),
      yAdjust: 200,
      xAdjust,
      content: `You - ${Math.round(score)}`,
      backgroundColor: getScoreColor(percentile, { opaque: true }),
      color: '#000',
      rotation: -90,
      font: { size: 42, weight: 'bold' },
      padding: 8,
      z: 10,
    };
  }

  return chartCanvas.renderToBuffer({
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
          pointRadius: 0,
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

  // Chart overlaid full canvas — crop overscan margins
  const chartImg = await loadImage(chartBuffer);
  ctx.drawImage(chartImg, OVERSCAN_X, 0, WIDTH, HEIGHT + OVERSCAN_Y, 0, 0, WIDTH, HEIGHT + 5);

  return canvas.toBuffer('image/png');
};

const { BUCKET } = require('./util');

const getCacheKey = (gameId, resultId, score) => {
  const scorePart = score ? `_score-${score}` : '';
  return `previews/${gameId}/${resultId}${scorePart}.png`;
};

const getPublicUrl = (cacheKey) => `https://storage.googleapis.com/${BUCKET}/${cacheKey}`;

exports.servePreviewImage = async (req, res) => {
  try {
    const parts = req.path.replace(/^\//, '').split('/');
    const gameId = parts[1];
    const resultId = parts[2] || 'all';
    const score = req.query.score ? parseInt(req.query.score) : null;
    const percentile = req.query.percentile ? parseFloat(req.query.percentile) : null;

    const cacheKey = getCacheKey(gameId, resultId, score);
    const publicUrl = getPublicUrl(cacheKey);

    // Redirect to GCS if already cached — GCS serves it directly, no function bytes proxied
    if (await existsInCache(cacheKey)) {
      res.redirect(302, publicUrl);
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

    // Must await — redirect to GCS requires the file to exist before we send the 302
    await setToCache(cacheKey, png, 'image/png', { makePublic: true });

    res.redirect(302, publicUrl);
  } catch (e) {
    console.error('servePreviewImage failed:', e);
    res.status(500).send('Internal server error');
  }
};

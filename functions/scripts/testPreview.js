const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fs = require('fs');

const WIDTH = 1200;
const HEIGHT = 600;

const COLORS = {
  background: 'rgba(255, 205, 86, 1)',
  border: 'rgba(255, 205, 86, 1)',
  point: 'rgba(255, 205, 86, 1)',
  text: 'rgba(255, 255, 255, 0.7)',
  grid: 'rgba(255, 255, 255, 0.12)',
  mean: 'rgba(255, 255, 255, 1)',
};

const getScoreColor = (percentile) => {
  if (percentile === null || percentile === undefined) return null;
  return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : '#cccccc';
};

const getScoreColorOpaque = (percentile) => {
  if (percentile === null || percentile === undefined) return '#ffffff';
  return percentile < 40 ? '#e57373' : percentile > 60 ? '#66bb6a' : '#cccccc';
};

const mockResult = {
  mean: 130,
  scores: {
    80: 3, 90: 5, 100: 12, 110: 18, 120: 25, 130: 30, 140: 22, 150: 15, 160: 10, 170: 6, 180: 4, 190: 2
  }
};

const mockScore = 133;
const mockPercentile = 52.4;

// Same game image as Gaia Project
const gameImageUrl = 'https://picsum.photos/1200/600';

async function renderChart(result, score, percentile) {
  const chartData = Object.entries(result.scores)
    .map(([s, count]) => ({ x: parseInt(s), y: count }))
    .sort((a, b) => a.x - b.x);

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
      backgroundColor: getScoreColorOpaque(percentile),
      color: '#000',
      rotation: -90,
      font: { size: 42, weight: 'bold' },
      padding: 8,
      z: 10,
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
}

const fetchImage = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return loadImage(Buffer.from(response.data));
};

const drawCover = (ctx, img, x, y, w, h) => {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = x + (w - sw) / 2;
  const sy = y + (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
};

async function main() {
  const chartBuffer = await renderChart(mockResult, mockScore, mockPercentile);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#303030';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  try {
    const gameImg = await fetchImage(gameImageUrl);
    drawCover(ctx, gameImg, 0, 0, WIDTH, HEIGHT);
  } catch (e) {
    console.warn('Could not load game image:', e.message);
  }

  const OVERSCAN_X = 20;
  const OVERSCAN_Y = 50;
  const chartImg = await loadImage(chartBuffer);
  ctx.drawImage(chartImg, OVERSCAN_X, 0, WIDTH, HEIGHT + OVERSCAN_Y, 0, 0, WIDTH, HEIGHT + 5);

  const png = canvas.toBuffer('image/png');
  fs.writeFileSync('test_preview_output.png', png);
  console.log('Saved test_preview_output.png');
}

main().catch(console.error);

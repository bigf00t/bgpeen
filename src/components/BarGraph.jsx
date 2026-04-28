import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const getPercentileColor = (pct) =>
  (pct ?? 0) < 33 ? '#ef5350' : (pct ?? 0) < 66 ? '#ffc107' : '#66bb6a';

const pctToColor = (pct, alpha = 0.7) => {
  const t = Math.min(100, Math.max(0, pct)) / 100;
  let r, g, b;
  if (t < 0.5) {
    const u = t * 2;
    r = Math.round(239 + (255 - 239) * u);
    g = Math.round(83  + (193 - 83)  * u);
    b = Math.round(80  + (7   - 80)  * u);
  } else {
    const u = (t - 0.5) * 2;
    r = Math.round(255 + (102 - 255) * u);
    g = Math.round(193 + (187 - 193) * u);
    b = Math.round(7   + (106 - 7)   * u);
  }
  return `rgba(${r},${g},${b},${alpha})`;
};

// 6 sections: -3σ→-2σ, -2σ→-1σ, -1σ→0, 0→+1σ, +1σ→+2σ, +2σ→+3σ
const BANDS = [
  { lo: -3, hi: -2, fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.25)' },
  { lo: -2, hi: -1, fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.35)' },
  { lo: -1, hi:  0, fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.5)', skipMean: true },
  { lo:  0, hi:  1, fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.5)', skipMean: true },
  { lo:  1, hi:  2, fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.35)' },
  { lo:  2, hi:  3, fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.25)' },
];

const stdDevPlugin = {
  id: 'rv2StdDev',
  afterDatasetsDraw(chart, _, opts) {
    if (!opts.show || !opts.labels.length) return;
    const { ctx, scales: { x, y } } = chart;
    const mean = parseFloat(opts.mean);
    const stdDev = parseFloat(opts.stdDev);
    const labels = opts.labels;
    const minLabel = labels[0];
    const maxLabel = labels[labels.length - 1];
    const barW = x.width / labels.length;

    const loPixel = (v) => x.left + (Math.ceil(v) - minLabel) * barW;
    const hiPixel = (v) => x.left + (Math.floor(v) - minLabel + 1) * barW;
    const avgBin = Math.round(mean);
    const meanLeft  = x.left + (avgBin - minLabel) * barW;
    const meanRight = x.left + (avgBin - minLabel + 1) * barW;

    ctx.save();
    BANDS.forEach(({ lo, hi, fill, stroke, skipMean }) => {
      const loVal = mean + lo * stdDev;
      const hiVal = mean + hi * stdDev;
      const x1 = Math.max(loPixel(loVal), x.left);
      const x2 = Math.min(hiPixel(hiVal), x.right);
      if (x1 >= x2) return;
      if (fill) {
        ctx.fillStyle = fill;
        if (skipMean) {
          if (x1 < meanLeft)  ctx.fillRect(x1, y.top, meanLeft  - x1, y.bottom - y.top);
          if (x2 > meanRight) ctx.fillRect(meanRight, y.top, x2 - meanRight, y.bottom - y.top);
        } else {
          ctx.fillRect(x1, y.top, x2 - x1, y.bottom - y.top);
        }
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      if (lo !== 0 && loVal >= minLabel) { ctx.moveTo(x1, y.top); ctx.lineTo(x1, y.bottom); }
      if (hi !== 0 && hiVal <= maxLabel) { ctx.moveTo(x2, y.top); ctx.lineTo(x2, y.bottom); }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Dotted lines flanking the mean bar
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(meanLeft,  y.top); ctx.lineTo(meanLeft,  y.bottom);
    ctx.moveTo(meanRight, y.top); ctx.lineTo(meanRight, y.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },
};
ChartJS.register(stdDevPlugin);

const STD_DEV_FALLBACK = 12;

const BarGraph = ({ result, score, percentile, onScoreClick }) => {
  const [showStdDev, setShowStdDev] = useState(false);
  const scrollRef = useRef(null);

  const mean = result.mean;
  const stdDev = result.stdDev ?? STD_DEV_FALLBACK;
  const avgBin = Math.round(mean);

  const { labels, counts } = useMemo(() => {
    const scores = result.scores || {};
    const keys = Object.keys(scores).map(Number);
    if (!keys.length) return { labels: [], counts: [] };
    const minS = Math.min(...keys);
    const maxS = Math.max(...keys);
    const lbls = [];
    const cnts = [];
    for (let i = minS; i <= maxS; i++) {
      lbls.push(i);
      cnts.push(scores[i] ?? 0);
    }
    return { labels: lbls, counts: cnts };
  }, [result.scores]);

  const userBin = score !== '' && score != null ? parseInt(score) : null;

  const barPcts = useMemo(() => {
    const scores = result.scores || {};
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    if (!total) return labels.map(() => 50);
    return labels.map((s) =>
      (Object.entries(scores).reduce((acc, [k, c]) => {
        const ki = parseInt(k);
        return acc + (ki < s ? c : 0) + (ki === s ? c * 0.5 : 0);
      }, 0) * 100) / total
    );
  }, [labels, result.scores]);

  const backgroundColors = useMemo(() => {
    return labels.map((s, i) => {
      if (userBin !== null && s === userBin) return pctToColor(barPcts[i], 0.9);
      if (s === avgBin) return 'rgba(180,190,240,0.8)';
      return 'rgba(121,134,203,0.6)';
    });
  }, [labels, userBin, avgBin, barPcts]);

  const hoverBackgroundColors = useMemo(() =>
    labels.map((s, i) => {
      if (userBin !== null && s === userBin) return pctToColor(barPcts[i], 1.0);
      if (s === avgBin) return 'rgba(200,210,255,0.95)';
      return pctToColor(barPcts[i], 1.0);
    }),
  [labels, userBin, avgBin, barPcts]);

  const avgColor = 'rgba(180,190,240,0.9)';
  const scoreColor = getPercentileColor(percentile);

  const handleClick = useMemo(() => (_, elements) => {
    if (elements.length > 0) onScoreClick(labels[elements[0].index]);
  }, [labels, onScoreClick]);

  const xTickDivisor = useMemo(() => {
    const spread = labels.length > 1 ? labels[labels.length - 1] - labels[0] : 0;
    if (spread <= 15) return 1;
    if (spread <= 100) return 5;
    return 10;
  }, [labels]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        grid: { color: '#2a2d35' },
        ticks: {
          color: '#aaa',
          maxRotation: 0,
          font: { size: 14 },
          callback: (val) => {
            const label = labels[val];
            if (label === undefined) return null;
            return xTickDivisor === 1 || label % xTickDivisor === 0 ? label : null;
          },
        },
        title: { display: true, text: 'Score', color: '#aaa', font: { size: 13 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#2a2d35' },
        ticks: { color: '#aaa', font: { size: 14 } },
        title: { display: true, text: 'Count', color: '#aaa', font: { size: 13 }, padding: 0 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        titleMarginBottom: 0,
        backgroundColor: (ctx) => {
          const idx = ctx.tooltip?.dataPoints?.[0]?.dataIndex;
          const color = idx !== undefined ? hoverBackgroundColors[idx] : null;
          return color ? color.replace(/[\d.]+\)$/, '0.9)') : 'rgba(30,32,40,0.95)';
        },
        borderColor: (ctx) => {
          const idx = ctx.tooltip?.dataPoints?.[0]?.dataIndex;
          const color = idx !== undefined ? hoverBackgroundColors[idx] : null;
          return color ? color.replace(/[\d.]+\)$/, '1)') : 'rgba(80,80,80,0.5)';
        },
        borderWidth: 1,
        callbacks: {
          title: (items) => ` Score ${labels[items[0].dataIndex]} - Count ${items[0].parsed.y.toLocaleString()}`,
          label: (item) => {
            const pct = Math.round(barPcts[item.dataIndex]);
            return pct >= 50 ? ` Better than ${pct}% of players` : ` Worse than ${100 - pct}% of players`;
          },
        },
      },
      rv2StdDev: { show: showStdDev, mean, stdDev, labels },
    },
    onClick: handleClick,
  }), [labels, xTickDivisor, handleClick, showStdDev, mean, stdDev, backgroundColors, hoverBackgroundColors, barPcts]);

  const data = useMemo(() => ({
    labels,
    datasets: [{
      data: counts,
      backgroundColor: backgroundColors,
      hoverBackgroundColor: hoverBackgroundColors,
      borderWidth: 0,
      barPercentage: 0.9,
      categoryPercentage: 1.0,
    }],
  }), [labels, counts, backgroundColors, hoverBackgroundColors]);

  // Auto-scroll to avg on mount, score on change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.offsetWidth >= el.scrollWidth) return;
    const target = userBin !== null ? userBin : Math.round(mean);
    const idx = labels.indexOf(target);
    if (idx === -1) return;
    const barW = el.scrollWidth / labels.length;
    el.scrollTo({ left: Math.max(0, idx * barW - el.offsetWidth / 2), behavior: 'smooth' });
  }, [score, mean, labels]);

  // Edge-fade masks
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const atStart = el.scrollLeft <= 2;
      const atEnd = el.scrollLeft + el.offsetWidth >= el.scrollWidth - 2;
      let mask = 'none';
      if (!atStart && !atEnd) mask = 'linear-gradient(to right, transparent 0%, black 8%, black 85%, transparent 100%)';
      else if (!atStart) mask = 'linear-gradient(to right, transparent 0%, black 8%)';
      else if (!atEnd) mask = 'linear-gradient(to right, black 85%, transparent 100%)';
      el.style.webkitMaskImage = mask;
      el.style.maskImage = mask;
    };
    el.addEventListener('scroll', update);
    update();
    return () => el.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="rv-chart-section">
      <div className="rv-chart-legend">
        <span className="rv-chart-legend-item">
          <span className="rv-chart-legend-swatch" style={{ background: avgColor }} />
          Average: <strong>{Math.round(mean)}</strong>
        </span>
        {userBin !== null && (
          <span className="rv-chart-legend-item">
            <span className="rv-chart-legend-swatch" style={{ background: scoreColor }} />
            Your score: <strong>{userBin}</strong>
          </span>
        )}
        <button
          className={`rv-stddev-toggle${showStdDev ? ' rv-stddev-toggle--on' : ''}`}
          onClick={() => setShowStdDev((v) => !v)}
        >
          ±3 std devs {showStdDev ? 'on' : 'off'}
        </button>
      </div>
      <div className="rv-chart-scroll" ref={scrollRef}>
        <div className="rv-chart-wrap">
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

BarGraph.propTypes = {
  result: PropTypes.object.isRequired,
  score: PropTypes.any,
  percentile: PropTypes.number,
  onScoreClick: PropTypes.func.isRequired,
};

export default BarGraph;

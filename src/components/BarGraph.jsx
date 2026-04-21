import React, { useMemo, useRef, useEffect } from 'react';
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

const barLabelPlugin = {
  id: 'rv2BarLabels',
  afterDatasetsDraw(chart, _, opts) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    (opts.items || []).forEach(({ labelIndex, lines, color }) => {
      const bar = meta.data[labelIndex];
      if (!bar) return;
      const bx = bar.x;
      const barTop = bar.y;
      const lineLen = 14;
      const lineStartY = barTop - lineLen;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, lineStartY);
      ctx.lineTo(bx, barTop);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '12px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const lineH = 13;
      lines.forEach((text, i) => {
        ctx.fillText(text, bx, lineStartY - (lines.length - i - 1) * lineH - 4);
      });
    });
    ctx.restore();
  },
};
ChartJS.register(barLabelPlugin);

const STD_DEV_FALLBACK = 12;

const BarGraph = ({ result, score, percentile, onScoreClick }) => {
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

  const backgroundColors = useMemo(() => {
    return labels.map((s) => {
      if (userBin !== null && s === userBin) {
        return getPercentileColor(percentile);
      }
      if (s === avgBin) return 'rgba(180,190,240,0.8)';
      const sd = Math.abs(s - mean) / stdDev;
      const alpha = sd < 1 ? 0.55 : sd < 2 ? 0.38 : sd < 3 ? 0.22 : 0.1;
      return `rgba(121,134,203,${alpha})`;
    });
  }, [labels, userBin, percentile, mean, stdDev, avgBin]);

  const labelPluginItems = useMemo(() => {
    const items = [];
    const avgIdx = labels.indexOf(avgBin);
    if (avgIdx !== -1) {
      items.push({ labelIndex: avgIdx, lines: ['avg', String(Math.round(mean))], color: 'rgba(180,190,240,0.9)' });
    }
    if (userBin !== null) {
      const userIdx = labels.indexOf(userBin);
      if (userIdx !== -1) {
        const color = getPercentileColor(percentile);
        items.push({ labelIndex: userIdx, lines: [String(userBin)], color });
      }
    }
    return items;
  }, [labels, avgBin, mean, userBin, percentile]);

  const handleClick = useMemo(() => (_, elements) => {
    if (elements.length > 0) onScoreClick(labels[elements[0].index]);
  }, [labels, onScoreClick]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        grid: { color: '#2a2d35' },
        ticks: { color: '#777', maxRotation: 0, maxTicksLimit: 20, font: { size: 13 } },
        title: { display: true, text: 'Score', color: '#555', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#2a2d35' },
        ticks: { color: '#777', font: { size: 13 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: () => '',
          label: (ctx) => ` Score ${labels[ctx.dataIndex]}: ${ctx.parsed.y.toLocaleString()} players`,
        },
      },
      rv2BarLabels: { items: labelPluginItems },
    },
    onClick: handleClick,
  }), [labels, labelPluginItems, handleClick]);

  const data = useMemo(() => ({
    labels,
    datasets: [{
      data: counts,
      backgroundColor: backgroundColors,
      borderWidth: 0,
      barPercentage: 0.9,
      categoryPercentage: 1.0,
    }],
  }), [labels, counts, backgroundColors]);

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
    <div className="rv2-chart-section">
      <div className="rv2-chart-scroll" ref={scrollRef}>
        <div className="rv2-chart-wrap">
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

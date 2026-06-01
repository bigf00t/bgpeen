import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { db } from '../firebase';
import { pctToColor } from '../utils/colors';
import { computeAvgScore, computePercentile, formatFilters, formatPercentileLabel, getResultIdFromFilters } from '../utils/scores';
import './GameScoreHistory.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip);

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return '';
  return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const GameScoreHistory = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const authLoading = useSelector((state) => state.auth.authLoading);

  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameInfo, setGameInfo] = useState(null);
  const [resultMap, setResultMap] = useState({});
  const [chartType, setChartType] = useState('bar');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const chartScrollRef = useRef(null);
  const tableScrollRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }

    const q = query(
      collection(db, 'users', user.uid, 'scores'),
      where('gameId', '==', gameId),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const scores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setScores(scores);
      if (scores.length) {
        setGameInfo({ name: scores[0].gameName, thumbnail: scores[0].gameThumbnail });
      }
      setLoading(false);
    });
    return unsub;
  }, [user?.uid, authLoading, gameId, navigate]);

  useEffect(() => {
    if (!gameId) return;
    getDoc(doc(db, 'games', gameId)).then((gameSnap) => {
      if (gameSnap.exists() && gameSnap.data().image) {
        setGameInfo((prev) => ({ ...prev, image: gameSnap.data().image }));
      }
    });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !scores.length) return;
    const toFetch = new Set();
    scores.forEach((s) => {
      const primary = getResultIdFromFilters(s.filters);
      if (!(primary in resultMap)) toFetch.add(primary);
      if (s.filters?.players) {
        const fallback = `count-${s.filters.players}`;
        if (!(fallback in resultMap)) toFetch.add(fallback);
      }
    });
    if (!toFetch.size) return;
    Promise.all(
      [...toFetch].map((rid) =>
        getDoc(doc(db, 'games', gameId, 'results', rid)).then((snap) => ({
          rid,
          scores: snap.exists() ? snap.data().scores : null,
        }))
      )
    ).then((results) => {
      setResultMap((prev) => {
        const next = { ...prev };
        results.forEach(({ rid, scores }) => { next[rid] = scores; });
        return next;
      });
    });
  }, [gameId, scores]);

  useEffect(() => {
    [chartScrollRef, tableScrollRef].forEach((ref) => {
      const el = ref.current;
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
    });
  }, [scores]);

  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" pt="80px">
        <CircularProgress size={40} sx={{ color: '#7986cb' }} />
      </Box>
    );
  }

  const chartLabels = scores.map((s) => formatDate(s.date));
  const chartValues = scores.map((s) => s.score);

  const handleDeleteScore = async (id) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'scores', id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const getScoreResult = (s) => {
    const primary = resultMap[getResultIdFromFilters(s.filters)];
    if (primary != null) return primary;
    if (s.filters?.players) return resultMap[`count-${s.filters.players}`] ?? null;
    return null;
  };
  const getScorePct = (s) => { const r = getScoreResult(s); return r ? computePercentile(s.score, r) : null; };

  const barColors = scores.map((s) => {
    const pct = getScorePct(s);
    return pct != null ? pctToColor(pct, 0.85) : 'rgba(121,134,203,0.85)';
  });
  const barHoverColors = scores.map((s) => {
    const pct = getScorePct(s);
    return pct != null ? pctToColor(pct, 1.0) : 'rgba(121,134,203,1.0)';
  });

  const chartData = {
    labels: chartLabels,
    datasets: [
      chartType === 'bar' ? {
        data: chartValues,
        backgroundColor: barColors,
        hoverBackgroundColor: barHoverColors,
        borderWidth: 0,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      } : {
        data: chartValues,
        borderColor: 'rgba(121,134,203,0.6)',
        backgroundColor: 'rgba(121,134,203,0.08)',
        pointBackgroundColor: barColors,
        pointBorderColor: barColors,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        titleMarginBottom: 0,
        backgroundColor: 'rgba(30,32,40,0.95)',
        borderColor: 'rgba(80,80,80,0.5)',
        borderWidth: 1,
        callbacks: {
          title: (items) => {
            const s = scores[items[0].dataIndex];
            return ` ${formatDate(s.date)}`;
          },
          label: (ctx) => {
            const s = scores[ctx.dataIndex];
            const pct = getScorePct(s);
            return pct != null
              ? ` ${s.score} — ${formatPercentileLabel(pct, { ofPlayers: true })}`
              : ` ${s.score}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#2a2d35' },
        ticks: { color: '#aaa', maxRotation: 0, font: { size: 13 } },
        title: { display: true, text: 'Date', color: '#aaa', font: { size: 13 } },
      },
      y: {
        beginAtZero: false,
        grid: { color: '#2a2d35' },
        ticks: { color: '#aaa', font: { size: 13 } },
        title: { display: true, text: 'Score', color: '#aaa', font: { size: 13 }, padding: 0 },
      },
    },
  };

  const avgScore = computeAvgScore(scores);
  const scorePcts = scores.map(getScorePct).filter((p) => p != null);
  const avgPct = scorePcts.length ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : null;

  return (
    <div className="gsh-page">
      <div className="gsh-header">
        {(gameInfo?.image || gameInfo?.thumbnail) && (
          <img src={gameInfo.image || gameInfo.thumbnail} alt={gameInfo?.name} className="gsh-thumb" />
        )}
        <div className="gsh-title-wrap">
          <span className="gsh-title-prefix">My</span>
          <div className="gsh-title-row">
            <RouterLink
              to={`/${gameId}/${encodeURIComponent((gameInfo?.name || '').toLowerCase().replace(/\s+/g, '-'))}`}
              className="gsh-title-link"
            >
              <h1 className="gsh-title">{gameInfo?.name}</h1>
            </RouterLink>
            <span className="gsh-title-scores">Scores</span>
          </div>
        </div>
        {avgScore != null && (
          <div className="gsh-stats">
            <div className="gsh-stats-numbers">
              <div className="gsh-stat">
                <div className="gsh-stat-row">
                  <span className="gsh-stat-value">{scores.length}</span>
                  <span className="gsh-stat-label">plays</span>
                </div>
              </div>
              <div className="gsh-stat">
                <div className="gsh-stat-row">
                  <span className="gsh-stat-value">{avgScore}</span>
                  <span className="gsh-stat-label">my avg</span>
                </div>
              </div>
            </div>
            {avgPct != null && (
              <span className="gsh-stat-pct" style={{ color: pctToColor(avgPct) }}>
                {formatPercentileLabel(avgPct, { ofPlayers: true })}
              </span>
            )}
          </div>
        )}
      </div>

      {scores.length === 0 ? (
        <p className="gsh-empty">No scores logged for this game.</p>
      ) : (
        <>
          <div className="gsh-chart-header">
            <button
              className="gsh-chart-toggle"
              onClick={() => setChartType((t) => t === 'bar' ? 'line' : 'bar')}
              title={chartType === 'bar' ? 'Switch to line chart' : 'Switch to bar chart'}
            >
              {chartType === 'bar'
                ? <ShowChartOutlinedIcon sx={{ fontSize: 18 }} />
                : <BarChartOutlinedIcon sx={{ fontSize: 18 }} />
              }
            </button>
          </div>
          <div className="gsh-chart-scroll" ref={chartScrollRef}>
            <div className="gsh-chart-wrap">
              {chartType === 'bar'
                ? <Bar data={chartData} options={chartOptions} />
                : <Line data={chartData} options={chartOptions} />
              }
            </div>
          </div>

          <div className="gsh-table-wrap" ref={tableScrollRef}>
          <table className="gsh-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Filters</th>
                <th>Score</th>
                <th>Percentile</th>
                <th>Avg</th>
                <th>Change</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // scores is oldest-first; compute running avg per position then display newest-first
                const runningAvgs = scores.map((_, i) =>
                  Math.round(scores.slice(0, i + 1).reduce((sum, r) => sum + r.score, 0) / (i + 1))
                );
                const reversed = [...scores].reverse();
                return reversed.map((s, i) => {
                  const runningAvg = runningAvgs[scores.length - 1 - i];
                  const prevAvg = scores.length - 2 - i >= 0 ? runningAvgs[scores.length - 2 - i] : null;
                  const delta = prevAvg != null ? runningAvg - prevAvg : null;
                  const pct = getScorePct(s);
                  const filterLabel = formatFilters(s.filters);
                return (
                  <tr key={s.id}>
                    <td>{formatDate(s.date)}</td>
                    <td className="gsh-filters">{filterLabel ?? <span className="gsh-filters-none">none</span>}</td>
                    <td className="gsh-score">{s.score}</td>
                    <td style={{ color: pct != null ? pctToColor(pct) : '#666' }}>
                      {pct != null ? formatPercentileLabel(pct) : '—'}
                    </td>
                    <td className="gsh-running-avg">{runningAvg}</td>
                    <td className={`gsh-delta${delta > 0 ? ' gsh-delta--up' : delta < 0 ? ' gsh-delta--down' : ''}`}>
                      {delta != null && delta !== 0
                        ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}`
                        : delta === 0 ? '—' : ''}
                    </td>
                    <td className="gsh-delete-cell">
                      {confirmDeleteId === s.id ? (
                        <>
                          <button
                            className="gsh-confirm-delete-btn"
                            onClick={() => handleDeleteScore(s.id)}
                            disabled={deletingId === s.id}
                          >
                            {deletingId === s.id ? '…' : 'Delete'}
                          </button>
                          <button className="gsh-cancel-delete-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="gsh-delete-btn" onClick={() => setConfirmDeleteId(s.id)}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              });
            })()}

            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
};

export default GameScoreHistory;

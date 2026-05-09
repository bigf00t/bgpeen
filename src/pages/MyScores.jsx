import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { db } from '../firebase';
import { pctToColor } from '../utils/colors';
import { computeAvgScore, computePercentile, formatPercentileLabel, getResultIdFromFilters } from '../utils/scores';
import './MyScores.css';

const Sparkline = ({ scores }) => {
  if (!scores.length) return null;
  const values = scores.map((s) => s.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 3;
  const reversed = scores.slice().reverse();
  const pointCoords = reversed.map((s, i) => ({
    x: scores.length === 1 ? pad : pad + (i / (scores.length - 1)) * (w - 2 * pad),
    y: scores.length === 1 ? h / 2 : pad + (1 - (s.score - min) / range) * (h - 2 * pad),
  }));

  return (
    <svg width={w} height={h} className="my-scores-sparkline">
      <polyline
        points={pointCoords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke="rgba(121,134,203,0.7)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pointCoords.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.5" fill="rgba(121,134,203,0.9)" />
      ))}
    </svg>
  );
};

const MyScores = () => {
  const user = useSelector((state) => state.auth.user);
  const authLoading = useSelector((state) => state.auth.authLoading);
  const navigate = useNavigate();
  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameResults, setGameResults] = useState({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    const q = query(
      collection(db, 'users', user.uid, 'scores'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllScores(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [user?.uid, authLoading, navigate]);

  useEffect(() => {
    const pairs = [...new Set(allScores.map((s) => `${s.gameId}:${getResultIdFromFilters(s.filters)}`))];
    const missing = pairs.filter((key) => !(key in gameResults));
    if (!missing.length) return;
    Promise.all(
      missing.map((key) => {
        const sep = key.indexOf(':');
        const gameId = key.slice(0, sep);
        const resultId = key.slice(sep + 1);
        return getDoc(doc(db, 'games', gameId, 'results', resultId)).then((snap) => ({
          key,
          scores: snap.exists() ? snap.data().scores : null,
        }));
      })
    ).then((results) => {
      setGameResults((prev) => {
        const next = { ...prev };
        results.forEach(({ key, scores }) => { next[key] = scores; });
        return next;
      });
    });
  }, [allScores]);

  const gameCards = useMemo(() => {
    const map = {};
    allScores.forEach((s) => {
      if (!map[s.gameId]) {
        map[s.gameId] = {
          gameId: s.gameId,
          gameName: s.gameName,
          gameThumbnail: s.gameThumbnail,
          scores: [],
        };
      }
      map[s.gameId].scores.push(s);
    });
    return Object.values(map);
  }, [allScores]);

  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" pt="80px">
        <CircularProgress size={40} sx={{ color: '#7986cb' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <div className="my-scores-page">
        <p style={{ color: '#ef5350', fontSize: '0.9rem' }}>
          Failed to load scores. Please try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="my-scores-page">
      <h1 className="my-scores-title">My Scores</h1>
      {gameCards.length === 0 ? (
        <p className="my-scores-empty">
          No scores logged yet. Enter a score on any game page and click &ldquo;Save score&rdquo;.
        </p>
      ) : (
        <div className="my-scores-grid">
          {gameCards.map(({ gameId, gameName, gameThumbnail, scores }) => {
            const avgScore = computeAvgScore(scores);
            const scorePcts = scores.map((s) => {
              const res = gameResults[`${gameId}:${getResultIdFromFilters(s.filters)}`];
              return res ? computePercentile(s.score, res) : null;
            }).filter((p) => p != null);
            const avgPct = scorePcts.length ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : null;
            return (
            <RouterLink
              key={gameId}
              to={`/scores/${gameId}`}
              className="my-scores-card"
            >
              <div className="my-scores-card-header">
                {gameThumbnail && (
                  <img
                    src={gameThumbnail}
                    alt={gameName}
                    className="my-scores-thumb"
                  />
                )}
                <span className="my-scores-game-name">{gameName}</span>
              </div>
              <div className="my-scores-latest">
                <span className="my-scores-latest-score-row">
                  <span className="my-scores-score-group">
                    <span className="my-scores-avg-label">my avg</span>
                    <span className="my-scores-recent">{avgScore}</span>
                  </span>
                  {avgPct != null && (
                    <span
                      className="my-scores-percentile"
                      style={{ color: pctToColor(avgPct) }}
                    >
                      {formatPercentileLabel(avgPct)}
                    </span>
                  )}
                </span>
              </div>
              <Sparkline scores={scores} />
              <div className="my-scores-meta">
                <span>{scores.length} {scores.length === 1 ? 'play' : 'plays'}</span>
                <span>{scores[0].date?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? ''}</span>
              </div>
            </RouterLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyScores;

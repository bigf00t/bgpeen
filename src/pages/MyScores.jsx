import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { db } from '../firebase';
import './MyScores.css';

const Sparkline = ({ scores }) => {
  if (scores.length < 2) return null;
  const values = scores.map((s) => s.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 3;
  const pts = scores
    .slice()
    .reverse()
    .map((s, i) => {
      const x = pad + (i / (scores.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (s.score - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="my-scores-sparkline">
      <polyline
        points={pts}
        fill="none"
        stroke="rgba(121,134,203,0.7)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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
          {gameCards.map(({ gameId, gameName, gameThumbnail, scores }) => (
            <RouterLink
              key={gameId}
              to={`/${gameId}/${encodeURIComponent(
                (gameName || '').toLowerCase().replace(/\s+/g, '-')
              )}`}
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
              <span className="my-scores-recent">{scores[0].score}</span>
              <Sparkline scores={scores} />
              <div className="my-scores-meta">
                <span>{scores.length} {scores.length === 1 ? 'play' : 'plays'}</span>
              </div>
            </RouterLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyScores;

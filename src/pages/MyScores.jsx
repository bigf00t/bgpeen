import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { auth, db } from '../firebase';
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
  const [bggUsername, setBggUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [importStatus, setImportStatus] = useState('idle');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    const toFetch = new Set();
    allScores.forEach((s) => {
      const primary = `${s.gameId}:${getResultIdFromFilters(s.filters)}`;
      if (!(primary in gameResults)) toFetch.add(primary);
      if (s.filters?.players) {
        const fallback = `${s.gameId}:count-${s.filters.players}`;
        if (!(fallback in gameResults)) toFetch.add(fallback);
      }
    });
    if (!toFetch.size) return;
    Promise.all(
      [...toFetch].map((key) => {
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

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) setBggUsername(snap.data().bggUsername || '');
    });
  }, [user?.uid]);

  const saveUsername = async (value) => {
    const trimmed = value.trim();
    if (!trimmed) { setEditingUsername(false); return; }
    setBggUsername(trimmed);
    setEditingUsername(false);
    await setDoc(doc(db, 'users', user.uid), { bggUsername: trimmed }, { merge: true });
  };

  const handleImport = async () => {
    if (!bggUsername || importStatus === 'importing') return;
    setImportStatus('importing');
    setImportResult(null);
    setImportError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/import-bgg-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bggUsername }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setImportResult(data);
      setImportStatus('done');
    } catch (err) {
      setImportError(err.message);
      setImportStatus('error');
    }
  };

  const handleDeleteScores = async (source) => {
    setBulkDeleting(true);
    try {
      const ref = source
        ? query(collection(db, 'users', user.uid, 'scores'), where('source', '==', source))
        : collection(db, 'users', user.uid, 'scores');
      const snap = await getDocs(ref);
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } finally {
      setBulkDeleting(false);
      setBulkDeleteConfirm(null);
    }
  };

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
      <div className="bgg-import">
        <div className="bgg-import-row">
          <span className="bgg-import-label">BGG Username:</span>
          {editingUsername ? (
            <input
              className="bgg-import-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveUsername(editValue);
                if (e.key === 'Escape') setEditingUsername(false);
              }}
              onBlur={() => saveUsername(editValue)}
              autoFocus
            />
          ) : bggUsername ? (
            <>
              <span className="bgg-import-username">{bggUsername}</span>
              <button
                className="bgg-import-edit-btn"
                onClick={() => { setEditValue(bggUsername); setEditingUsername(true); }}
                title="Edit username"
              >
                ✎
              </button>
            </>
          ) : (
            <input
              className="bgg-import-input"
              value={editValue}
              placeholder="your BGG username"
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editValue.trim()) saveUsername(editValue);
              }}
              onBlur={() => { if (editValue.trim()) saveUsername(editValue); }}
            />
          )}
          <button
            className={`bgg-import-btn${importStatus === 'importing' ? ' bgg-import-btn--loading' : ''}`}
            onClick={handleImport}
            disabled={!bggUsername || importStatus === 'importing'}
          >
            {importStatus === 'importing' && (
              <span className="bgg-import-spinner" />
            )}
            {importStatus === 'importing' ? 'Importing…' : 'Import from BGG'}
          </button>
        </div>
        {importStatus === 'done' && importResult && (
          <>
            <p className="bgg-import-result">
              Imported {importResult.imported} score{importResult.imported !== 1 ? 's' : ''}
              {importResult.skipped > 0 ? `, ${importResult.skipped} already imported` : ''}
            </p>
            {importResult.notInDb?.length > 0 && (
              <p className="bgg-import-detail">
                <strong>Not in database:</strong> {importResult.notInDb.join(', ')}
              </p>
            )}
            {importResult.noResult?.length > 0 && (
              <p className="bgg-import-detail">
                <strong>No score data:</strong> {importResult.noResult.join(', ')}
              </p>
            )}
          </>
        )}
        {importStatus === 'error' && (
          <p className="bgg-import-error">{importError || 'Import failed — try again'}</p>
        )}
      </div>
      {gameCards.length === 0 ? (
        <p className="my-scores-empty">
          No scores logged yet. Enter a score on any game page and click &ldquo;Save score&rdquo;.
        </p>
      ) : (
        <div className="my-scores-grid">
          {gameCards.map(({ gameId, gameName, gameThumbnail, scores }) => {
            const avgScore = computeAvgScore(scores);
            const lookupResult = (s) => {
              const primary = gameResults[`${gameId}:${getResultIdFromFilters(s.filters)}`];
              if (primary != null) return primary;
              if (s.filters?.players) return gameResults[`${gameId}:count-${s.filters.players}`] ?? null;
              return null;
            };
            const scorePcts = scores.map((s) => {
              const res = lookupResult(s);
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
      {gameCards.length > 0 && (
        <div className="my-scores-manage">
          {bulkDeleteConfirm ? (
            <span className="my-scores-manage-confirm">
              {bulkDeleteConfirm === 'imported' ? 'Delete all imported scores?' : 'Delete all scores?'}
              {' '}
              <button
                className="my-scores-confirm-btn"
                onClick={() => handleDeleteScores(bulkDeleteConfirm === 'imported' ? 'bgg' : null)}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? 'Deleting…' : 'Confirm'}
              </button>
              {' '}
              <button className="my-scores-cancel-btn" onClick={() => setBulkDeleteConfirm(null)}>Cancel</button>
            </span>
          ) : (
            <>
              {allScores.some((s) => s.source === 'bgg') && (
                <button className="my-scores-delete-btn" onClick={() => setBulkDeleteConfirm('imported')}>
                  Delete imported scores
                </button>
              )}
              <button className="my-scores-delete-btn" onClick={() => setBulkDeleteConfirm('all')}>
                Delete all scores
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MyScores;

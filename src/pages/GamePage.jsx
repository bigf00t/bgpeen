import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import _ from 'lodash';
import * as actions from '../store/actions';
import { addRecentlyViewed } from '../components/RecentlyViewed';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import Image from 'mui-image';

import Filters from '../components/Filters';
import PercentileBar from '../components/PercentileBar';
const ScoreChart = React.lazy(() => import('../components/ScoreChart'));

import './GamePage.css';

const getIntFromParam = (param) => (param && !isNaN(param) ? parseInt(param) : '');

const GamePage = (props) => {
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState();
  const [resultLoading, setResultLoading] = useState(false);
  const [percentile, setPercentile] = useState(null);
  const [score, setScore] = useState('');
  const [showMoreStats, setShowMoreStats] = useState(false);
  const scoreDebounceRef = useRef(null);
  const scoreInputRef = useRef(null);

  const { id, name } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const justAdded = !!location.state?.justAdded;

  const getResultId = () => {
    if (filters.players) {
      let rid = `count-${filters.players}`;
      if (filters.start) rid += `-start-${filters.start}`;
      else if (filters.finish) rid += `-finish-${filters.finish}`;
      else if (filters.new) rid += `-new`;
      return rid;
    }
    if (filters.color) return `color-${filters.color}`;
    if (filters.year) {
      let rid = `year-${filters.year}`;
      if (filters.month) rid += `-month-${filters.month}`;
      return rid;
    }
    return 'all';
  };

  const updateHistory = (newScore) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newScore) next.set('score', newScore);
      else next.delete('score');
      return next;
    });
  };

  const handleScoreInput = (e) => {
    const val = e.target.value;
    clearTimeout(scoreDebounceRef.current);
    if (!val) { setScore(''); return; }
    scoreDebounceRef.current = setTimeout(() => {
      const n = parseInt(val);
      if (!isNaN(n)) setScore(n);
    }, 400);
  };

  const handleScoreClick = (binScore) => {
    setScore(binScore);
    if (scoreInputRef.current) scoreInputRef.current.value = binScore;
  };

  const findOrLoadResult = () => {
    const resultId = getResultId();
    const results = props.data.game.results;
    if (Object.prototype.hasOwnProperty.call(results, resultId)) {
      setResult(results[resultId]);
      setResultLoading(false);
    } else {
      setResultLoading(true);
      props.loadResult(id, resultId);
    }
  };

  const updatePercentile = () => {
    if (!score) { setPercentile(null); return; }
    if (!result?.scores) { setPercentile(null); return; }
    const total = _.sum(_.values(result.scores));
    if (!total) { setPercentile(null); return; }
    const newPct = (_.reduce(
      result.scores,
      (acc, c, s) => acc + (parseInt(s) < score ? c : 0) + (parseInt(s) === score ? c * 0.5 : 0),
      0
    ) * 100) / total;
    setPercentile(newPct);
  };

  const setFiltersFromUrl = () => {
    setFilters({
      players: getIntFromParam(searchParams.get('players')),
      finish:  getIntFromParam(searchParams.get('finish')),
      start:   getIntFromParam(searchParams.get('start')),
      new:     getIntFromParam(searchParams.get('new')),
      color:   searchParams.get('color') || '',
      year:    getIntFromParam(searchParams.get('year')),
      month:   getIntFromParam(searchParams.get('month')),
    });
  };

  const findOrLoadGame = () => {
    const foundGame = props.data.loadedGames[id];
    if (foundGame) {
      props.setGame(foundGame);
      addRecentlyViewed(foundGame);
      fetch(`/api/record-view?id=${id}`).catch((e) => console.error('Failed to record game view:', e));
    } else {
      props.loadGame(id);
    }
  };

  // Mount
  useEffect(() => {
    if (props.data.game === null || props.data.game.id !== id) findOrLoadGame();
    const initialScore = getIntFromParam(searchParams.get('score'));
    setScore(initialScore);
    if (scoreInputRef.current && initialScore) scoreInputRef.current.value = initialScore;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (!isTouch && scoreInputRef.current) scoreInputRef.current.focus();
  }, []);

  // Game loaded / URL params changed
  useEffect(() => {
    if (props.data.game) {
      addRecentlyViewed(props.data.game);
      setFiltersFromUrl();
    }
  }, [props.data.game?.id, searchParams.toString()]);

  // Filters changed → load result
  useEffect(() => {
    if (!_.isEmpty(filters)) findOrLoadResult();
  }, [filters]);

  // Results arrive from Redux
  useEffect(() => {
    if (_.isEmpty(filters)) return;
    if (props.data?.game?.results && Object.keys(props.data.game.results).length > 0) {
      setResult(props.data.game.results[getResultId()]);
      setResultLoading(false);
    }
  }, [props.data.game?.results]);

  // Score or result changed → recalculate percentile
  useEffect(() => {
    if (score && !_.isEmpty(result)) updatePercentile();
    else setPercentile(null);
  }, [score, result]);

  // Page title
  useEffect(() => {
    if (props.data.game && result) {
      document.title = `goodat.${props.data.game.name.toLowerCase()}`;
    }
  }, [props.data.game?.name, result?.id]);

  // Live-update while scores are being crunched (only for freshly-added games)
  const loadGameRef = useRef(props.loadGame);
  useEffect(() => { loadGameRef.current = props.loadGame; });
  useEffect(() => {
    if (!justAdded || (props.data.game?.totalScores ?? 0) > 0) return;
    const unsubscribe = onSnapshot(doc(db, 'games', id), (snap) => {
      if ((snap.data()?.totalScores ?? 0) > 0) loadGameRef.current(id);
    });
    return unsubscribe;
  }, [justAdded, props.data.game?.totalScores, id]);

  const derivedStats = useMemo(() => {
    if (!result?.scores) return null;
    const entries = Object.entries(result.scores).map(([k, v]) => [parseInt(k), v]).sort((a, b) => a[0] - b[0]);
    if (!entries.length) return null;
    const total = entries.reduce((s, [, c]) => s + c, 0);
    if (!total) return null;

    const min = entries[0][0];
    const max = entries[entries.length - 1][0];
    const mode = entries.reduce((best, cur) => cur[1] > best[1] ? cur : best, entries[0])[0];

    const findPct = (pct) => {
      const target = total * pct / 100;
      let cum = 0;
      for (const [s, c] of entries) { cum += c; if (cum >= target) return s; }
      return max;
    };

    const median = findPct(50);
    const p10 = findPct(10);
    const p25 = findPct(25);
    const p75 = findPct(75);
    const p90 = findPct(90);

    const mean = parseFloat(result.mean);
    const stdDev = parseFloat(result.stdDev);
    const skewness = stdDev
      ? Math.round((entries.reduce((sum, [s, c]) => sum + Math.pow(s - mean, 3) * c, 0) / (total * Math.pow(stdDev, 3))) * 100) / 100
      : null;

    return { min, max, mode, median, p10, p25, p75, p90, skewness };
  }, [result?.scores, result?.mean, result?.stdDev]);

  // ── Loading / error states ──
  if (result === null) {
    if (justAdded) {
      return (
        <Box display="flex" flexDirection="column" pt="64px" pb="48px" alignItems="center" gap={3}>
          <Box display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" p={3} pb={0}>
            <Image
              src={props.data.game.thumbnail}
              duration={0}
              wrapperStyle={{ margin: '0 16px', maxWidth: 150 }}
              style={{ height: 150, width: 150, objectFit: 'scale-down' }}
            />
            <Typography variant="h2" sx={{ mt: 2, mx: 2, mb: 0 }} align="center">
              {props.data.game.name}
            </Typography>
          </Box>
          <CircularProgress size={32} thickness={3} sx={{ color: '#7986cb' }} />
          <Box sx={{ textAlign: 'center', color: '#888', maxWidth: 400, px: 3 }}>
            <Typography sx={{ fontSize: '0.95rem', mb: 0.5 }}>
              Fetching play data from BoardGameGeek…
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#666' }}>
              This usually takes 10–30 seconds. Initial data will load first — full score history builds in the background.
            </Typography>
          </Box>
        </Box>
      );
    }
    return (
      <Box height="100vh" justifyContent="center" display="flex" alignItems="center">
        <Typography variant="h5" align="center">No data available for these filters.</Typography>
      </Box>
    );
  }

  if (_.isEmpty(result)) {
    return (
      <Box height="100vh" justifyContent="center" display="flex" alignItems="center">
        <CircularProgress size={60} color="inherit" />
      </Box>
    );
  }

  const game = props.data.game;
  const totalScores = result.scoreCount ?? 0;
  const scoreLabel = result.id === 'all' ? 'scores' : `scores of ${game.totalScores?.toLocaleString()}`;

  return (
    <Fade in timeout={500}>
      <div className="rv-page">

        <div className="rv-header">
          <div className="rv-thumb-wrap">
            <Image
              src={game.thumbnail}
              duration={0}
              wrapperStyle={{ width: '100%', height: '100%' }}
              style={{ width: '100%', height: '100%', objectFit: 'scale-down', borderRadius: 8 }}
            />
          </div>
          <div className="rv-header-name">
            <div className="rv-game-name">{game.name}</div>
            <a
              className="rv-bgg-link"
              href={`https://boardgamegeek.com/boardgame/${game.id}`}
              target="_blank"
              rel="noreferrer"
            >
              View on boardgamegeek.com ↗
            </a>
          </div>
          <div className="rv-header-stats">
            <div className="rv-stats-primary">
              <div className="rv-stat-primary-group">
                <span className="rv-stat-big">{totalScores.toLocaleString()}</span>
                <span className="rv-stat-big-label">{scoreLabel}</span>
              </div>
              <div className="rv-stat-primary-group">
                <span className="rv-stat-big">{result.mean}</span>
                <span className="rv-stat-big-label">avg</span>
              </div>
            </div>
            <div className="rv-stats-secondary">
              {result.stdDev !== undefined && (
                <span className="rv-stat-sm">std dev <strong>±{result.stdDev}</strong></span>
              )}
              {derivedStats && (<>
                <span className="rv-stat-sm">median <strong>{derivedStats.median}</strong></span>
                <span className="rv-stat-sm">mode <strong>{derivedStats.mode}</strong></span>
                <span className="rv-stat-sm">min <strong>{derivedStats.min}</strong> · max <strong>{derivedStats.max}</strong></span>
                {derivedStats.skewness !== null && (
                  <span className="rv-stat-sm">skew <strong>{derivedStats.skewness}</strong></span>
                )}
              </>)}
            </div>
            {showMoreStats && (
              <div className="rv-stats-extra">
                {derivedStats && (
                  <div className="rv-stats-extra-row">
                    <span className="rv-stat-sm">p10 <strong>{derivedStats.p10}</strong> · p25 <strong>{derivedStats.p25}</strong> · p75 <strong>{derivedStats.p75}</strong> · p90 <strong>{derivedStats.p90}</strong></span>
                  </div>
                )}
                {((filters.players && result.trimmedWinPercentage !== undefined) || result.expectedMean !== undefined) && (
                  <div className="rv-stats-extra-row">
                    {filters.players && result.trimmedWinPercentage !== undefined && (
                      <span className="rv-stat-sm">win % <strong>{result.trimmedWinPercentage}%</strong></span>
                    )}
                    {result.expectedMean !== undefined && (
                      <span className="rv-stat-sm">expected avg <strong>{result.expectedMean}</strong></span>
                    )}
                    {filters.players && result.expectedWinPercentage !== undefined && (
                      <span className="rv-stat-sm">expected win % <strong>{result.expectedWinPercentage}%</strong></span>
                    )}
                  </div>
                )}
              </div>
            )}
            {derivedStats && (
              <button
                className={`rv-stddev-toggle rv-stats-more-toggle${showMoreStats ? ' rv-stddev-toggle--on' : ''}`}
                onClick={() => setShowMoreStats((v) => !v)}
              >
                {showMoreStats ? 'less ▲' : 'more ▼'}
              </button>
            )}
          </div>
        </div>

        <hr className="rv-divider" />

        <Filters />

        <hr className="rv-divider" />

        <div className="rv-score-row">
          <span className="rv-score-label">Score</span>
          <input
            ref={scoreInputRef}
            className="rv-score-input"
            type="number"
            placeholder="Score"
            onChange={handleScoreInput}
          />
          <PercentileBar score={score} percentile={percentile} />
        </div>

        <div className={resultLoading ? 'rv-result-loading' : ''}>
          <React.Suspense fallback={<CircularProgress size={40} color="inherit" />}>
            <ScoreChart result={result} score={score} percentile={percentile} onScoreClick={handleScoreClick} />
          </React.Suspense>
        </div>


      </div>
    </Fade>
  );
};

GamePage.propTypes = {
  data: PropTypes.object,
  setGame: PropTypes.func,
  loadGame: PropTypes.func,
  loadResult: PropTypes.func,
};

const selectData = createSelector(
  (state) => state.data.game,
  (state) => state.data.loadedGames,
  (game, loadedGames) => ({ game, loadedGames })
);

const mapStateToProps = (state) => ({ data: selectData(state) });

export default connect(mapStateToProps, actions)(GamePage);

import React, { useState, useEffect, useRef } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import _ from 'lodash';
import * as actions from '../actions';
import { addRecentlyViewed } from './RecentlyViewed';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import Image from 'mui-image';

import FiltersV2 from './FiltersV2';
import PercentileBar from './PercentileBar';
const BarGraph = React.lazy(() => import('./BarGraph'));

import './ResultV2.css';

const getIntFromParam = (param) => (param && !isNaN(param) ? parseInt(param) : '');

const ResultV2 = (props) => {
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState();
  const [percentile, setPercentile] = useState(null);
  const [score, setScore] = useState('');
  const scoreDebounceRef = useRef(null);
  const scoreInputRef = useRef(null);

  const rawParams = useParams();
  const navigate = useNavigate();

  const params = React.useMemo(() => {
    const p = { id: rawParams.id, name: rawParams.name };
    const parts = (rawParams['*'] || '').split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i += 2) p[parts[i]] = parts[i + 1];
    return p;
  }, [rawParams]);

  const getResultId = () => {
    if (filters.players) {
      let id = `count-${filters.players}`;
      if (filters.start) id += `-start-${filters.start}`;
      else if (filters.finish) id += `-finish-${filters.finish}`;
      else if (filters.new) id += `-new`;
      return id;
    }
    if (filters.color) return `color-${filters.color}`;
    if (filters.year) {
      let id = `year-${filters.year}`;
      if (filters.month) id += `-month-${filters.month}`;
      return id;
    }
    return 'all';
  };

  const updateHistory = (newScore) => {
    const flatParams = Object.entries(params).flat();
    flatParams.splice(2, 1);
    flatParams.splice(0, 1);
    const paramsToRemove = params.score ? 2 : 0;
    const paramsToAdd = newScore ? ['score', newScore] : [];
    const fieldIndex = flatParams.indexOf('score');
    const startIndex = fieldIndex > -1 ? fieldIndex : flatParams.length;
    flatParams.splice(startIndex, paramsToRemove, ...paramsToAdd);
    navigate(`/${flatParams.join('/')}?v2=1`);
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
    } else {
      props.loadResult(params.id, resultId);
    }
  };

  const updatePercentile = () => {
    if (!score) { setPercentile(null); return; }
    if (!result?.scores) { setPercentile(null); return; }
    const total = _.sum(_.values(result.scores));
    if (!total) { setPercentile(null); return; }
    const newPct = (_.reduce(
      result.scores,
      (acc, c, s) => acc + (parseInt(s) < score ? c : 0) + (parseInt(s) === score ? c / 0.5 : 0),
      0
    ) * 100) / total;
    setPercentile(newPct);
  };

  const setFiltersFromUrl = () => {
    setFilters({
      players: getIntFromParam(params.players),
      finish:  getIntFromParam(params.finish),
      start:   getIntFromParam(params.start),
      new:     getIntFromParam(params.new),
      color:   params.color || '',
      year:    getIntFromParam(params.year),
      month:   getIntFromParam(params.month),
    });
  };

  const findOrLoadGame = () => {
    const foundGame = props.data.loadedGames[params.id];
    if (foundGame) {
      props.setGame(foundGame);
      addRecentlyViewed(foundGame);
      fetch(`/api/record-view?id=${params.id}`).catch((e) => console.error('Failed to record game view:', e));
    } else {
      props.loadGame(params.id);
    }
  };

  // Mount
  useEffect(() => {
    if (props.data.game === null || props.data.game.id !== params.id) findOrLoadGame();
    const initialScore = getIntFromParam(params.score);
    setScore(initialScore);
    if (scoreInputRef.current && initialScore) scoreInputRef.current.value = initialScore;
  }, []);

  // Game loaded / URL params changed
  useEffect(() => {
    if (props.data.game) {
      addRecentlyViewed(props.data.game);
      setFiltersFromUrl();
    }
  }, [
    props.data.game?.id, params.id, params.score,
    params.players, params.finish, params.start,
    params.new, params.color, params.year, params.month,
  ]);

  // Filters changed → load result
  useEffect(() => {
    if (!_.isEmpty(filters)) findOrLoadResult();
  }, [filters]);

  // Results arrive from Redux
  useEffect(() => {
    if (_.isEmpty(filters)) return;
    if (props.data?.game?.results && Object.keys(props.data.game.results).length > 1) {
      setResult(props.data.game.results[getResultId()]);
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
      document.title = `Good at ${props.data.game.name}${result.id !== 'all' ? ' | ' + result.id : ''}`;
    }
  }, [props.data.game?.name, result?.id]);

  // ── Loading / error states ──
  if (result === null) {
    if (props.data.game?.totalScores === 0) {
      return (
        <Box display="flex" flexDirection="column" pt="64px" alignItems="center">
          <Box display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" p={3}>
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
          <Alert severity="info" sx={{ maxWidth: 500, mx: 3 }}>
            No plays have been recorded yet. Data is usually available within 10 minutes of a game being added.
          </Alert>
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
  const scoreLabel = result.id === 'all' ? 'scores' : `of ${game.totalScores?.toLocaleString()} scores`;

  return (
    <Fade in timeout={500}>
      <div className="rv2-page">

        <div className="rv2-header">
          <Image
            src={game.thumbnail}
            duration={0}
            wrapperStyle={{ width: 120, height: 148, flexShrink: 0 }}
            style={{ width: '100%', height: '100%', objectFit: 'scale-down', borderRadius: 8 }}
          />
          <div className="rv2-header-name">
            <div className="rv2-game-name">{game.name}</div>
            <a
              className="rv2-bgg-link"
              href={`https://boardgamegeek.com/boardgame/${game.id}`}
              target="_blank"
              rel="noreferrer"
            >
              View on boardgamegeek.com ↗
            </a>
          </div>
          <div className="rv2-header-stats">
            <div className="rv2-stats-primary">
              <div className="rv2-stat-primary-group">
                <span className="rv2-stat-big">{totalScores.toLocaleString()}</span>
                <span className="rv2-stat-big-label">{scoreLabel}</span>
              </div>
              <div className="rv2-stat-primary-group">
                <span className="rv2-stat-big">{result.mean}</span>
                <span className="rv2-stat-big-label">avg</span>
              </div>
            </div>
            <div className="rv2-stats-secondary">
              {result.stdDev !== undefined && (
                <span className="rv2-stat-sm">std dev <strong>±{result.stdDev}</strong></span>
              )}
              {result.trimmedWinPercentage !== undefined && (
                <span className="rv2-stat-sm">win % <strong>{result.trimmedWinPercentage}%</strong></span>
              )}
              {result.expectedMean !== undefined && (
                <span className="rv2-stat-sm">expected avg <strong>{result.expectedMean}</strong></span>
              )}
              {result.expectedWinPercentage !== undefined && (
                <span className="rv2-stat-sm">expected win % <strong>{result.expectedWinPercentage}%</strong></span>
              )}
            </div>
          </div>
        </div>

        <hr className="rv2-divider" />

        <FiltersV2 />

        <hr className="rv2-divider" />

        <div className="rv2-score-row">
          <span className="rv2-score-label">Score</span>
          <input
            ref={scoreInputRef}
            className="rv2-score-input"
            type="number"
            placeholder="Score"
            onChange={handleScoreInput}
          />
          <PercentileBar score={score} percentile={percentile} />
        </div>

        <React.Suspense fallback={<CircularProgress size={40} color="inherit" />}>
          <BarGraph result={result} score={score} percentile={percentile} onScoreClick={handleScoreClick} />
        </React.Suspense>

        <div className="rv2-data-source">
          data provided by{' '}
          <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer">boardgamegeek.com</a>
        </div>

      </div>
    </Fade>
  );
};

ResultV2.propTypes = {
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

export default connect(mapStateToProps, actions)(ResultV2);

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import _ from 'lodash';
import * as actions from '../store/actions';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import Image from 'mui-image';

import { useSelector } from 'react-redux';
import { computeAvgScore, computePercentile } from '../utils/scores';
import Filters from '../components/Filters';
import GameHeader from '../components/GameHeader';
import PercentileBar from '../components/PercentileBar';
import useGameResult, { getIntFromParam } from '../hooks/useGameResult';
import useUserScores from '../hooks/useUserScores';
import SaveScoreButton from '../components/SaveScoreButton';
const ScoreChart = React.lazy(() => import('../components/ScoreChart'));

import './GamePage.css';

const GamePage = (props) => {
  const [score, setScore] = useState('');
  const [percentile, setPercentile] = useState(null);
  const scoreDebounceRef = useRef(null);
  const scoreInputRef = useRef(null);

  const user = useSelector((state) => state.auth.user);
  const authLoading = useSelector((state) => state.auth.authLoading);

  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const justAdded = !!location.state?.justAdded;

  const { userScores } = useUserScores(id);

  const { filters, result, resultLoading } = useGameResult({
    id,
    searchParams,
    justAdded,
    game: props.data.game,
    loadedGames: props.data.loadedGames,
    setGame: props.setGame,
    loadGame: props.loadGame,
    loadResult: props.loadResult,
  });

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

  // Mount: initialize score from URL and focus input
  useEffect(() => {
    const initialScore = getIntFromParam(searchParams.get('score'));
    setScore(initialScore);
    if (scoreInputRef.current && initialScore) scoreInputRef.current.value = initialScore;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (!isTouch && scoreInputRef.current) scoreInputRef.current.focus();
  }, []);

  // Score or result changed → recalculate percentile
  useEffect(() => {
    if (!score || _.isEmpty(result?.scores)) { setPercentile(null); return; }
    setPercentile(computePercentile(score, result.scores));
  }, [score, result]);

  // Page title
  useEffect(() => {
    if (props.data.game && result) {
      document.title = `goodat.${props.data.game.name.toLowerCase()}`;
    }
  }, [props.data.game?.name, result?.id]);

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

    const mean = parseFloat(result.mean);
    const stdDev = parseFloat(result.stdDev);
    const skewness = stdDev
      ? Math.round((entries.reduce((sum, [s, c]) => sum + Math.pow(s - mean, 3) * c, 0) / (total * Math.pow(stdDev, 3))) * 100) / 100
      : null;

    return { min, max, mode, median: findPct(50), p10: findPct(10), p25: findPct(25), p75: findPct(75), p90: findPct(90), skewness };
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

  return (
    <Fade in timeout={500}>
      <div className="rv-page">

        <GameHeader
          game={props.data.game}
          result={result}
          derivedStats={derivedStats}
          filters={filters}
        />

        <hr className="rv-divider" />

        <Filters />

        <hr className="rv-divider" />

        <div className="rv-score-row">
          <span className="rv-score-label">Score</span>
          <div className="rv-score-input-wrap">
            <input
              ref={scoreInputRef}
              className="rv-score-input"
              type="number"
              placeholder="Score"
              onChange={handleScoreInput}
            />
            {!authLoading && (
              <SaveScoreButton
                score={score}
                gameId={id}
                gameName={props.data.game?.name || ''}
                gameThumbnail={props.data.game?.thumbnail || ''}
                percentile={percentile}
                filters={filters}
              />
            )}
          </div>
          <PercentileBar score={score} percentile={percentile} />
        </div>

        <div className={resultLoading ? 'rv-result-loading' : ''}>
          <React.Suspense fallback={<CircularProgress size={40} color="inherit" />}>
            <ScoreChart
              result={result}
              score={score}
              percentile={percentile}
              onScoreClick={handleScoreClick}
              userAvgScore={user && userScores.length ? computeAvgScore(userScores) : null}
              scoresPath={user && userScores.length ? `/scores/${id}` : null}
            />
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

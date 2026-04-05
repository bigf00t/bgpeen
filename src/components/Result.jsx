import React, { useState, useEffect } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import _ from 'lodash';
import ordinal from 'ordinal';
import * as actions from '../actions';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';

import Filters from './Filters';
const Graph = React.lazy(() => import('./Graph'));
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import Image from 'mui-image';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import FormGroup from '@mui/material/FormGroup';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import { DebounceInput } from 'react-debounce-input';

import { TwitterShareButton, TwitterIcon } from 'react-share';
import { IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

const accordionDarkSx = {
  '&.MuiAccordion-root': {
    borderTop: 'solid 1px #424242',
    backgroundImage: 'none',
    backgroundColor: '#282828',
    '&::before': { opacity: 0, height: '2px' },
    '&.Mui-expanded': { margin: 0, '&::before': { opacity: 0 } },
  },
  '& .MuiAccordionSummary-root': {
    backgroundColor: '#282828',
    '&.Mui-focusVisible': { backgroundColor: '#282828' },
  },
  '& .MuiAccordionSummary-content': { margin: 0 },
  '& .MuiAccordionDetails-root': { padding: 0 },
};

const accordionLightSx = {
  '&.MuiAccordion-root': {
    backgroundImage: 'none',
    boxShadow: 'none',
    '&::before': { opacity: 0 },
    '&.Mui-expanded': { margin: 0, '&::before': { opacity: 0 } },
  },
  '& .MuiAccordionSummary-root': {
    backgroundColor: 'background.default',
    '&.Mui-focusVisible': { backgroundColor: 'background.default' },
  },
  '& .MuiAccordionSummary-content': { margin: 0, paddingLeft: '24px' },
  '& .MuiAccordionDetails-root': { padding: 0, backgroundColor: 'background.default' },
};

const getOrdinalDesc = (percentile) => {
  if (percentile === null) {
    return '';
  }

  const position = percentile < 50 ? 'bottom' : percentile > 50 ? 'top' : 'middle';

  return `${position} ${percentile > 50 ? (100 - percentile).toFixed(2) : percentile.toFixed(2)}% (${
    percentile > 0 ? ordinal(Math.ceil(percentile)) : '0th'
  } percentile)`;
};

const getScoreTitle = (percentile) => {
  if (window.location.toString().includes('bgpeen')) {
    return `Your bgpeen is ${percentile < 50 ? 'small' : 'big'}.`;
  } else {
    return `You're ${getPercentileQuip(percentile)}`;
  }
};

const getTwitterText = (game, score, percentile) => {
  return `I just played ${game} and my score of ${score} was in the ${getOrdinalDesc(
    percentile
  )} of similar scores. I'm ${getPercentileQuip(percentile)}`;
};

// TODO: Case or switch
const getPercentileQuip = (percentile) => {
  if (Math.ceil(percentile) === 69) {
    return 'nice.';
  } else if (percentile < 1) {
    return 'quite possibly one of the worst in the world!';
  } else if (percentile < 10) {
    return 'just terrible.';
  } else if (percentile < 40) {
    return 'not very good.';
  } else if (percentile < 60) {
    return 'boringly average.';
  } else if (percentile < 90) {
    return 'actually pretty decent...';
  } else if (percentile < 99) {
    return 'legit amazing!';
  } else if (percentile >= 99) {
    return 'probably cheating :(';
  } else {
    return '';
  }
};

const Result = (props) => {
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState();
  const [percentile, setPercentile] = useState(null);
  const [score, setScore] = useState();
  const [scoreAccordionExpanded, setScoreAccordionExpanded] = useState(false);

  const rawParams = useParams();
  let navigate = useNavigate();

  // Parse named params from wildcard splat e.g. "players/4/finish/2/score/180"
  const params = React.useMemo(() => {
    const p = { id: rawParams.id, name: rawParams.name };
    const parts = (rawParams['*'] || '').split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i += 2) {
      p[parts[i]] = parts[i + 1];
    }
    return p;
  }, [rawParams]);

  const handleScoreChange = (event) => {
    setScore(getIntFromParam(event.target.value));
  };

  // Score changed
  useEffect(() => {
    if (score !== undefined && score.toString() !== params.score) {
      updateHistory();
    }
    setScoreAccordionExpanded(score !== undefined && score !== '');
  }, [score]);

  const updateHistory = () => {
    var flatParams = Object.entries(params).flat();

    // Remove id and name keys
    flatParams.splice(2, 1);
    flatParams.splice(0, 1);

    const paramsToRemove = params.score ? 2 : 0;
    const paramsToAdd = score ? ['score', score] : [];
    const fieldIndex = flatParams.indexOf('score');
    const startIndex = fieldIndex > -1 ? fieldIndex : flatParams.length;

    flatParams.splice(startIndex, paramsToRemove, ...paramsToAdd);

    navigate(`/${flatParams.join('/')}`);
  };

  const getResultId = () => {
    let resultId = `all`;

    if (filters.players) {
      resultId = `count-${filters.players}`;
      if (filters.start) {
        resultId += `-start-${filters.start}`;
      } else if (filters.finish) {
        resultId += `-finish-${filters.finish}`;
      } else if (filters.new) {
        resultId += `-new`;
      }
    } else if (filters.color) {
      resultId = `color-${filters.color}`;
    } else if (filters.year) {
      resultId = `year-${filters.year}`;
      if (filters.month) {
        resultId += `-month-${filters.month}`;
      }
    }

    // console.log(filters);
    // console.log(resultId);

    return resultId;
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
    if (!score) {
      setPercentile(null);
      return;
    }

    const total = _.sum(_.values(result.scores));
    if (!total) {
      setPercentile(null);
      return;
    }

    // Based on https://www.30secondsofcode.org/js/s/percentile
    const newPercentile =
      (_.reduce(
        result.scores,
        (result, c, s) => result + (parseInt(s) < score ? c : 0) + (parseInt(s) === score ? c / 0.5 : 0),
        0
      ) *
        100) /
      total;

    setPercentile(newPercentile);
  };

  const getGameFromUrl = () => {
    if (params.id) {
      findOrLoadGame();
    }
  };

  const findOrLoadGame = () => {
    var foundGame = props.data.loadedGames[params.id];
    if (foundGame) {
      props.setGame(foundGame);
    } else {
      props.loadGame(params.id);
    }
  };

  const setFiltersFromUrl = () => {
    setFilters({
      players: getIntFromParam(params.players),
      finish: getIntFromParam(params.finish),
      start: getIntFromParam(params.start),
      new: getIntFromParam(params.new),
      color: params.color || '',
      year: getIntFromParam(params.year),
      month: getIntFromParam(params.month),
    });
  };

  const getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
  };

  const handleScoreAccordionChange = () => () => {
    setScoreAccordionExpanded(score !== undefined && score !== '' && !scoreAccordionExpanded);
  };

  // Filters changed
  useEffect(() => {
    if (!_.isEmpty(filters)) {
      // console.log('Filters loaded');
      findOrLoadResult();
    }
  }, [filters]);

  // Result changed
  useEffect(() => {
    if (score && !_.isEmpty(result)) {
      updatePercentile();
    }
  }, [score, result]);

  // componentDidMount
  useEffect(() => {
    if (props.data.game === null || props.data.game.id !== params.id) {
      // console.log('Getting game');
      getGameFromUrl();
    }
    setScore(getIntFromParam(params.score));
  }, []);

  // Game loaded
  useEffect(() => {
    // console.log(params);
    // console.log(props.data.game);
    if (props.data.game) {
      // console.log('Game loaded');
      setFiltersFromUrl();
    }
  }, [
    props.data.game?.id,
    params.id,
    params.score,
    params.players,
    params.finish,
    params.start,
    params.new,
    params.color,
    params.year,
    params.month,
  ]);

  // Results loaded
  useEffect(() => {
    if (props.data?.game?.results && Object.keys(props.data.game.results).length > 1) {
      // console.log(props.data?.game?.results);
      // console.log('Results loaded');
      const resultId = getResultId();
      setResult(props.data.game.results[resultId]);
    }
  }, [props.data.game?.results]);

  useEffect(() => {
    if (props.data.game && result) {
      document.title = `Good at ${props.data.game.name}${result.id !== 'all' ? ' | ' + result.id : ''}`;
    }
  }, [props.data.game?.name, result?.id]);

  // Result explicitly missing (no data for this filter combo)
  if (result === null) {
    return (
      <Box component="div" height="100vh" justifyContent="center" display="flex" alignItems="center">
        <Typography variant="h5" align="center">No data available for these filters.</Typography>
      </Box>
    );
  }

  // Still loading
  if (_.isEmpty(result)) {
    return (
      <Box component="div" height="100vh" justifyContent="center" display="flex" alignItems="center">
        <CircularProgress size={60} color="inherit" />
      </Box>
    );
  }

  return (
    <Fade in={!_.isEmpty(result)} timeout={500}>
      <Box component="div" display="flex" flexDirection="column" pt={'64px'} height={'100vh'}>
        <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" p={3}>
          <Image
            src={props.data.game.thumbnail}
            duration={0}
            wrapperStyle={{ margin: '0 16px', maxWidth: 150 }}
            style={{ height: 150, width: 150, objectFit: 'scale-down' }}
          />
          <Typography variant="h2" component="h2" sx={{ mt: 2, mr: 2, mb: 0, ml: 2 }} gutterBottom align="center">
            <Link
              sx={{ color: 'action.active', textDecoration: 'none', '&:hover': { textDecoration: 'none', opacity: 0.75 } }}
              href={`https://boardgamegeek.com/boardgame/${props.data.game.id}`}
              target="_blank"
              title="View on boardgamegeek.com"
              underline="hover"
            >
              {props.data.game.name}
            </Link>
          </Typography>
        </Box>
        <Filters />
        <Accordion sx={accordionDarkSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box
              component="div"
              display="flex"
              flexWrap="wrap"
              justifyContent="center"
              alignItems="center"
              p={1}
              width={1}
            >
              <Typography m={2} component="h4" variant="h4" align="center">
                Scores: &nbsp; {result.scoreCount}
              </Typography>
              <Typography m={2} component="h4" variant="h4" align="center">
                Average: &nbsp; {result.mean}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="div"
              display="flex"
              flexWrap="wrap"
              justifyContent="center"
              alignItems="center"
              pb={1}
              width={1}
            >
              {result.expectedMean !== undefined && (
                <Typography m={2} component="h5" variant="h5" align="center">
                  Expected Average: &nbsp; {result.expectedMean} &nbsp;
                </Typography>
              )}
              {result.id !== 'all' && result.trimmedWinPercentage !== undefined && (
                <Typography m={2} component="h5" variant="h5" align="center">
                  Win Percentage: &nbsp; {result.trimmedWinPercentage}% &nbsp;
                </Typography>
              )}
              {result.expectedWinPercentage !== undefined && (
                <Typography m={2} component="h5" variant="h5" align="center">
                  Expected Win Percentage: &nbsp; {result.expectedWinPercentage}% &nbsp;
                </Typography>
              )}
              {result.trimmedTieBreakerWinCount !== undefined && (
                <Typography m={2} component="h5" variant="h5" align="center">
                  Tiebreaker Wins: &nbsp; {result.trimmedTieBreakerWinCount} &nbsp;
                </Typography>
              )}
              {result.trimmedSharedWinCount !== undefined && (
                <Typography m={2} component="h5" variant="h5" align="center">
                  Shared Wins: &nbsp; {result.trimmedSharedWinCount} &nbsp;
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
        <Accordion
          sx={accordionLightSx}
          expanded={scoreAccordionExpanded}
          onChange={handleScoreAccordionChange()}
        >
          <AccordionSummary component="div" expandIcon={score ? <ExpandMoreIcon /> : null}>
            <Box
              component="div"
              display="flex"
              flexWrap="wrap"
              justifyContent="center"
              alignItems="center"
              sx={{ p: 2, pt: 3, pb: 0, width: 1 }}
            >
              <Typography component="h5" variant="h5" align="center" m={1} ml={2} mr={2}>
                How good are you?
              </Typography>
              <FormGroup row>
                <FormControl>
                  <DebounceInput
                    element={TextField}
                    debounceTimeout={300}
                    sx={{
                      '& .MuiIconButton-root': { padding: '4px', visibility: 'hidden' },
                      '&:hover .MuiIconButton-root': { visibility: 'visible' },
                      '& .Mui-focused .MuiIconButton-root': { visibility: 'visible' },
                    }}
                    id="score"
                    name="score"
                    label="Your Score"
                    value={score}
                    style={{ maxWidth: 180 }}
                    onChange={handleScoreChange}
                    // To prevent accordion toggling
                    onClick={(event) => event.stopPropagation()}
                    InputLabelProps={{
                      sx: { '&.Mui-focused': { color: 'text.primary' } },
                    }}
                    type="search"
                    InputProps={{
                      endAdornment: score && (
                        <IconButton onClick={() => setScore('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      ),
                    }}
                  />
                </FormControl>
              </FormGroup>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {filters && score && (
              <Box
                component="div"
                justifyContent="center"
                alignItems="center"
                display="flex"
                flexWrap="wrap"
                sx={{ p: 2, pt: 4, pb: 0, width: 1 }}
              >
                <Typography component="div" align="center" sx={{ pt: 0, pr: 1, pb: 1, pl: 1 }}>
                  {` Your score of ${score} places you in the ${getOrdinalDesc(percentile)} of similar scores.`}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    position: 'relative',
                    pt: 0,
                    pr: 5,
                    pb: 1,
                    pl: 1,
                    '& button': { position: 'absolute', top: '-6px', right: '0', display: 'inline-block' },
                  }}
                >
                  Share score:
                  <TwitterShareButton
                    title={getTwitterText(props.data.game.name, score, percentile)}
                    url={window.location.href}
                  >
                    <TwitterIcon size={32} round />
                  </TwitterShareButton>
                </Typography>
                <Typography variant="h2" component="h2" width={1} sx={{ mt: 2, mr: 2, mb: 0, ml: 2 }} gutterBottom align="center">
                  {percentile !== null ? getScoreTitle(percentile) : 'None'}
                </Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
        <Box component="div" flex="1" p={2} backgroundColor={'#303030'} minHeight={600}>
          <React.Suspense fallback={<CircularProgress size={40} color="inherit" />}>
            <Graph result={result} score={score} percentile={percentile} />
          </React.Suspense>
        </Box>
        <Box component="div" p={2} backgroundColor="#282828">
          <Typography component="div" align="center">
            {'Scores provided by '}
            <Link
              sx={{ color: 'action.active', textDecoration: 'none', '&:hover': { textDecoration: 'none', opacity: 0.75 } }}
              href="https://boardgamegeek.com"
              target="_blank"
              underline="hover"
            >
              boardgamegeek.com
            </Link>
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

Result.propTypes = {
  data: PropTypes.object,
  setGame: PropTypes.func,
  loadGames: PropTypes.func,
  loadGame: PropTypes.func,
  loadResult: PropTypes.func,
};

const selectResultData = createSelector(
  (state) => state.data.game,
  (state) => state.data.loadedGames,
  (game, loadedGames) => ({ game, loadedGames })
);

const mapStateToProps = (state) => ({
  data: selectResultData(state),
});

export default connect(mapStateToProps, actions)(Result);

import React, { useState, useEffect } from 'react';
import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import _ from 'lodash';
import ordinal from 'ordinal';
import * as actions from '../actions';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CircularProgress from '@mui/material/CircularProgress';

import Filters from './Filters';
import Graph from './Graph';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Image from 'mui-image';

const styles = (theme) => ({
  paper: {
    padding: theme.spacing(2, 2, 2),
  },
  link: {
    color: theme.palette.action.active,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'none',
      opacity: 0.75,
    },
  },
  details: {
    backgroundColor: '#282828',
  },
  card: {
    margin: theme.spacing(1),
  },
  imageWrapper: {
    margin: theme.spacing(0, 2, 0, 2),
    maxWidth: 150,
    // maxHeight: 100,
  },
  image: {
    height: '150px !important',
    width: '150px !important',
    objectFit: 'scale-down !important',
  },
  title: {
    margin: theme.spacing(2, 2, 0, 2),
  },
  credit: {},
  arrow: {
    top: 2,
    position: 'relative',
  },
  progress: {
    // color: theme.palette.action.active,
  },
});

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
    return `${getPercentileQuip(percentile)}`;
  }
};

// TODO: Case or switch
const getPercentileQuip = (percentile) => {
  if (Math.ceil(percentile) === 69) {
    return 'Nice.';
  } else if (percentile < 1) {
    return "You're quite possibly one of the worst players in the world!";
  } else if (percentile < 10) {
    return "You're just terrible.";
  } else if (percentile < 40) {
    return "You're not very good.";
  } else if (percentile < 60) {
    return "You're boringly average.";
  } else if (percentile < 90) {
    return "You're actually pretty decent...";
  } else if (percentile < 99) {
    return "You're legit amazing!";
  } else if (percentile >= 99) {
    return "You're probably cheating :(";
  } else {
    return '';
  }
};

const Result = (props) => {
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState();
  const [percentile, setPercentile] = useState(null);

  let params = useParams();

  const classes = props.classes;

  const updateResult = () => {
    const newResult = props.data.game
      ? _.find(props.data.game.results, (result) => {
          return (
            (filters.players || null) === (result.playerCount || null) &&
            (filters.place || null) === (result.playerPlace || null)
          );
        })
      : null;

    setResult(newResult);
  };

  const updatePercentile = () => {
    if (!filters.score) {
      setPercentile(null);
    }

    // Based on https://www.30secondsofcode.org/js/s/percentile
    const newPercentile =
      (_.reduce(
        result.scores,
        (result, c, s) =>
          result + (parseInt(s) < filters.score ? c : 0) + (parseInt(s) === filters.score ? c / 0.5 : 0),
        0
      ) *
        100) /
      _.sum(_.values(result.scores));

    setPercentile(newPercentile);
  };

  const getGameFromUrl = () => {
    if (params.id) {
      findOrLoadGame();
    }
  };

  const findOrLoadGame = () => {
    var foundGame = props.data.loadedGames.find((game) => game.id == params.id, null);
    if (foundGame) {
      props.data.game = foundGame;
    } else {
      props.loadGame(params.id);
    }
  };

  const setFiltersFromUrl = () => {
    setFilters({
      score: getIntFromParam(params.score),
      players: getIntFromParam(params.players),
      place: getIntFromParam(params.place),
    });
  };

  const getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
  };

  // Filters changed
  useEffect(() => {
    if (!_.isEmpty(filters)) {
      updateResult();
    }
  }, [filters.players, filters.place]);

  // Result changed
  useEffect(() => {
    if (filters.score && !_.isEmpty(result)) {
      updatePercentile();
    }
  }, [filters.score, result]);

  // componentDidMount
  useEffect(() => {
    if (props.data.game === null || props.data.game.id !== params.id) {
      props.data.game = null;
      getGameFromUrl();
    }
  }, []);

  // Game loaded
  useEffect(() => {
    if (props.data.game) {
      setFiltersFromUrl();
    }
  }, [props.data.game, params]);

  // No data loaded
  if (!result) {
    return (
      <Box component="div" height="50vh" justifyContent="center" w={1} display="flex" m={4} alignItems="center">
        <CircularProgress size={60} className={classes.progress} color="inherit" />
      </Box>
    );
  }

  document.title = `Good at ${props.data.game.name}
  ${filters.score ? ' - Score ' + filters.score : ''}
  ${filters.players ? ' - ' + filters.players + ' players' : ''}
  ${filters.place ? ' - ' + filters.place + ' place' : ''}`;

  return (
    <Box component="div" m={2}>
      <Box component="div" m={4} display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
        <Image
          src={props.data.game.thumbnail}
          duration={1000}
          wrapperClassName={classes.imageWrapper}
          className={classes.image}
        />
        <Typography variant="h2" component="h2" className={classes.title} gutterBottom align="center">
          <Link
            className={classes.link}
            href={`https://boardgamegeek.com/boardgame/${props.data.game.id}`}
            target="_blank"
            title="View on boardgamegeek.com"
            underline="hover"
          >
            {props.data.game.name}
          </Link>
        </Typography>
      </Box>
      <Filters filters={filters} />
      <Typography mt={2} component="h4" variant="h4" align="center">
        {result.scoreCount} Scores - Average {result.mean}
      </Typography>
      {filters && filters.score && (
        <Box component="div" mt={2}>
          <Box component="div" mb={2} justifyContent="center" alignItems="center">
            <Typography component="div" align="center" className={classes.credit}>
              {filters.score
                ? ` Your score of ${filters.score} places you in the ${getOrdinalDesc(percentile)} of valid scores.`
                : ''}
            </Typography>
            <Typography variant="h2" component="h2" className={classes.title} gutterBottom align="center">
              {percentile !== null ? getScoreTitle(percentile) : ''}
            </Typography>
          </Box>
        </Box>
      )}
      <Box mt={2} mb={2}>
        <Graph result={result} score={filters.score} percentile={percentile}></Graph>
      </Box>
      <Box mt={2}>
        <Accordion>
          <AccordionSummary className={classes.details} expandIcon={<ExpandMore />}>
            <Typography align="center" variant="h5">
              See More Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" width={1}>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Total Plays
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {props.data.game.totalPlays}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Usable Plays
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {props.data.game.totalPlays - props.data.game.unusablePlays}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Unusable Percent
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {((props.data.game.unusablePlays / props.data.game.totalPlays) * 100).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Remaining Plays to Load
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {props.data.game.remainingPlays}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Oldest Play
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {props.data.game.oldestPlayDate}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Newest Play
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {props.data.game.newestPlayDate}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Added Date
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {Date(props.data.game.addedDate.seconds * 1000).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Valid Scores
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {result.scoreCount}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Excluded Scores
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {result.trimmedScoreCount}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Mean
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {result.mean}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Mode
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {result.mode}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Median
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {result.median}
                  </Typography>
                </CardContent>
              </Card>
              <Card className={classes.card}>
                <CardContent>
                  <Typography align="center" color="textSecondary" gutterBottom>
                    Std
                  </Typography>
                  <Typography variant="h3" component="h3" align="center">
                    {result.std}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
      <Typography component="div" align="center" className={classes.credit} mt={2}>
        {'Scores provided by '}
        <Link className={classes.link} href="https://boardgamegeek.com" target="_blank" underline="hover">
          boardgamegeek.com
        </Link>
      </Typography>
    </Box>
  );
};

Result.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  loadGames: PropTypes.func,
  loadGame: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(Result)));

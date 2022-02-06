import React, { useState, useEffect } from 'react';
import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import _ from 'lodash';
import ordinal from 'ordinal';
import * as actions from '../actions';

// import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
// import { Link as RouterLink } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMore from '@mui/icons-material/ExpandMore';
// import ArrowBack from '@mui/icons-material/ArrowBack';

import Filters from './Filters';
import Graph from './Graph';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import Image from 'material-ui-image';

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
  card: {
    margin: theme.spacing(1),
  },
  image: {
    margin: theme.spacing(0, 0, 0, 0),
    maxWidth: 100,
    maxHeight: 100,
  },
  title: {
    margin: theme.spacing(0, 0, 0, 2),
  },
  credit: {
    padding: theme.spacing(2),
  },
  arrow: {
    top: 2,
    position: 'relative',
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
  // const [players, setPlayers] = useState(null);
  // const [place, setPlace] = useState(null);
  // const [game, setGame] = useState(null);

  let params = useParams();
  // console.log(props);
  // console.log(params);
  // console.log(game);

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
    console.log(newResult);

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

    // console.log(newPercentile);
    setPercentile(newPercentile);
  };

  const setGameFromUrl = () => {
    if (params.id) {
      // console.log(props.data.games);
      const newGame = props.data.games.find((game) => game.id == params.id, null);
      // console.log(newGame);
      setOrLoadGame(newGame);
      // setGame(newGame);
    }
  };

  const setFiltersFromUrl = () => {
    // if (params.score || params.players || params.place) {
    console.log('setFiltersFromUrl');
    // console.log(params);
    // setScore(getIntFromParam(params.score));
    // setPlayers(getIntFromParam(params.players));
    // setValidPlayerPlaces(getValidPlayerPlaces());
    // setPlace(getIntFromParam(params.place));
    // }
    setFilters({
      score: getIntFromParam(params.score),
      players: getIntFromParam(params.players),
      place: getIntFromParam(params.place),
    });
  };

  const getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
  };

  const setOrLoadGame = (newGame) => {
    if (!newGame || !newGame.results) {
      // console.log('loadGame');
      props.loadGame(params.id);
    } else {
      // console.log('setGame');
      props.setGame(newGame.id);
    }
  };

  // Filters changed
  useEffect(() => {
    if (!_.isEmpty(filters)) {
      console.log(filters);
      updateResult();
    }
  }, [filters.players, filters.place]);

  // Result changed
  useEffect(() => {
    if (filters.score && !_.isEmpty(result)) {
      // console.log('updatePercentile');
      updatePercentile();
    }
  }, [filters.score, result]);

  // // Filters changed
  // useEffect(() => {
  //   // console.log('Filters changed');
  //   // console.log(filters);
  //   if (filters) {
  //     updateResult();
  //     updatePercentile();
  //   }
  // }, [filters]);

  // componentDidMount
  useEffect(() => {
    if (_.isEmpty(props.data.games)) {
      props.loadGames();
    }
  }, []);

  // Games loaded
  useEffect(() => {
    // console.log('componentDidMount');
    // console.log(props);
    // props.setGame(null);
    if (!_.isEmpty(props.data.games) && !props.data.game) {
      // console.log('Games loaded');
      setGameFromUrl();
    }
  }, [props.data.game, props.data.games]);

  // Game loaded
  useEffect(() => {
    if (props.data.game) {
      // console.log('Game loaded');
      setFiltersFromUrl();
    }
  }, [props.data.game, params]);

  // const handleFiltersChange = (filters) => {
  //   // console.log('handleFiltersChange');
  //   // console.log(filters);
  //   setFilters(filters);
  // };

  // No data loaded
  if (!result) {
    return <div />;
  }

  document.title = `Good at ${props.data.game.name}`;

  return (
    <Box component="div" m={2}>
      {/* <Paper className={classes.paper} square> */}
      {/* <Box component="div"> */}
      {/* <RouterLink className={classes.link} to="/">
        <Typography component="span" variant="h6">
          <ArrowBack fontSize="small" className={classes.arrow} /> Find another game
        </Typography>
      </RouterLink> */}
      <Box component="div" m={4} display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
        <Image
          src={props.data.game.thumbnail}
          imageStyle={{
            width: '100%',
            height: '100%',
            objectFit: 'scale-down',
          }}
          style={{ width: 100, height: 100, padding: 0 }}
          color='"none"'
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
        <Typography mt={2} ml={8} component="h4" variant="h4" align="center">
          {result.scoreCount} Scores - Average {result.mean}
        </Typography>
      </Box>
      <Filters filters={filters} />
      {/* <Route
            path="/:id/:name/:score?/:players?/:place?"
            render={(routeProps) => <Filters {...routeProps} handleChange={this.handleFiltersChange} />}
          /> */}
      {filters && filters.score && (
        <Box component="div">
          <Box component="div" mb={2} justifyContent="center" alignItems="center">
            <Typography component="div" align="center" className={classes.credit}>
              {filters.score
                ? ` Your score of ${filters.score} places you in the ${getOrdinalDesc(percentile)} of ${
                    result.scoreCount
                  } valid scores.`
                : ''}
            </Typography>
            <Typography variant="h2" component="h2" className={classes.title} gutterBottom align="center">
              {percentile !== null ? getScoreTitle(percentile) : ''}
            </Typography>
          </Box>
        </Box>
      )}
      {/* </Box> */}
      <Graph result={result} score={filters.score} percentile={percentile}></Graph>
      {/* </Paper> */}
      <Box mt={2}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography align="center" variant="h5">
              See More Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" width={1}>
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
      <Typography component="div" align="center" className={classes.credit}>
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
  setGame: PropTypes.func,
  loadGame: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(Result)));

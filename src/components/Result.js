import React, { Component } from 'react';
import { withStyles, withTheme } from '@material-ui/core/styles';
import _ from 'lodash';
import ordinal from 'ordinal';
import * as actions from '../actions';

import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';

import Filters from './Filters';
import Graph from './Graph';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withRouter, Route } from 'react-router-dom';
import Image from 'material-ui-image';

const styles = (theme) => ({
  paper: {
    padding: theme.spacing(2, 2, 2),
  },
  link: {
    color: theme.palette.action.active,
    '&:hover': {
      textDecoration: 'underline',
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
});

const getOrdinalDesc = (percentile) => {
  if (percentile === null) {
    return '';
  }

  var position = percentile < 50 ? 'bottom' : percentile > 50 ? 'top' : 'middle';

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

// TODO: Case or switch
const getPercentileQuip = (percentile) => {
  if (percentile < 1) {
    return 'quite possibly one of the worst players in the world!';
  } else if (percentile < 10) {
    return 'just terrible.';
  } else if (percentile < 45) {
    return 'not very good.';
  } else if (percentile < 55) {
    return 'boringly average.';
  } else if (Math.ceil(percentile) === 69) {
    return 'nice ;).';
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

class Result extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filters: {},
      result: {},
      percentile: null,
      players: null,
      place: null,
    };
  }

  setResult = () => {
    var result = this.props.data.game
      ? _.find(this.props.data.game.results, (result) => {
          return (
            (this.state.filters.players || null) === (result.playerCount || null) &&
            (this.state.filters.place || null) === (result.playerPlace || null)
          );
        })
      : {};

    this.setState({ result: result }, () => {
      this.setPercentile();
    });
  };

  setPercentile = () => {
    if (this.state.filters.score) {
      this.setState({
        percentile: this.getPercentile(this.state.result.scores, this.state.filters.score),
      });
    } else {
      this.setState({ percentile: null });
    }
  };

  getPercentile = (scores, score) => {
    // Based on https://www.30secondsofcode.org/js/s/percentile
    var percentile =
      (_.reduce(
        scores,
        (result, c, s) => result + (parseInt(s) < score ? c : 0) + (parseInt(s) === score ? c / 0.5 : 0),
        0
      ) *
        100) /
      _.sum(_.values(scores));
    return percentile;
  };

  setGameFromUrl = () => {
    if (this.props.match.params.id) {
      let newGame = this.props.data.games.find((game) => game.id == this.props.match.params.id, null);
      this.setOrLoadGame(newGame);
      this.setState({ game: newGame });
    }
    // else if (this.props.data.game !== null) {
    //   this.props.setGame(null);
    //   this.setState({ game: null });
    // }
  };

  setOrLoadGame = (newGame) => {
    if (!newGame.results) {
      this.props.loadGame(newGame.id);
    } else {
      this.props.setGame(newGame.id);
    }
  };

  componentDidMount() {
    this.props.setGame(null);

    if (_.isEmpty(this.props.data.games)) {
      this.props.loadGames().then(() => {
        this.setGameFromUrl();
        this.setResult();
      });
    } else {
      this.setGameFromUrl();
      this.setResult();
    }
  }

  // componentDidUpdate(prevProps) {
  //   if (this.props.data.game && prevProps.data.game && this.props.data.game.id !== prevProps.data.game.id) {
  //     this.setResult();
  //   }
  // }

  handleFiltersChange = (filters) => {
    this.setState(
      {
        filters: filters,
      },
      () => this.setResult()
    );
  };

  render() {
    const classes = this.props.classes;

    if (this.props.data.game && this.state.result) {
      return (
        <Box component="div">
          <Paper className={classes.paper} square>
            <Box component="div">
              <Box component="div" mb={2} display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
                <Image
                  src={this.props.data.game.thumbnail}
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
                  {/* {this.state.percentile !== null
                    ? getTitle(this.state.percentile)
                    : ''} */}
                  <Link
                    className={classes.link}
                    href={`https://boardgamegeek.com/boardgame/${this.props.data.game.id}`}
                    target="_blank"
                  >
                    {this.props.data.game.name}
                  </Link>
                </Typography>
              </Box>
              <Route
                path="/:id/:name/:players?/:place?/:score?"
                render={(routeProps) => <Filters {...routeProps} handleChange={this.handleFiltersChange} />}
              />
              <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" width={1}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography align="center" color="textSecondary" gutterBottom>
                      Valid Scores
                    </Typography>
                    <Typography variant="h3" component="h3" align="center">
                      {this.state.result.scoreCount}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography align="center" color="textSecondary" gutterBottom>
                      Excluded Scores
                    </Typography>
                    <Typography variant="h3" component="h3" align="center">
                      {this.state.result.trimmedScoreCount}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography align="center" color="textSecondary" gutterBottom>
                      Mean
                    </Typography>
                    <Typography variant="h3" component="h3" align="center">
                      {this.state.result.mean}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography align="center" color="textSecondary" gutterBottom>
                      Mode
                    </Typography>
                    <Typography variant="h3" component="h3" align="center">
                      {this.state.result.mode}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography align="center" color="textSecondary" gutterBottom>
                      Median
                    </Typography>
                    <Typography variant="h3" component="h3" align="center">
                      {this.state.result.median}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography align="center" color="textSecondary" gutterBottom>
                      Std
                    </Typography>
                    <Typography variant="h3" component="h3" align="center">
                      {this.state.result.std}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box component="div">
                <Box component="div" mb={2} justifyContent="center" alignItems="center">
                  <Typography component="div" align="center" className={classes.credit}>
                    {this.state.filters.score
                      ? ` Your score of ${this.state.filters.score} places you in the ${getOrdinalDesc(
                          this.state.percentile
                        )} of valid scores.`
                      : ''}
                  </Typography>
                  <Typography variant="h2" component="h2" className={classes.title} gutterBottom align="center">
                    {this.state.percentile !== null ? getScoreTitle(this.state.percentile) : ''}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Graph
              result={this.state.result}
              score={this.state.filters.score !== '' ? this.state.filters.score : null}
              percentile={this.state.percentile}
            ></Graph>
          </Paper>
          <Typography component="div" align="center" className={classes.credit}>
            {'Scores provided by '}
            <Link className={classes.link} href="https://boardgamegeek.com" target="_blank">
              boardgamegeek.com
            </Link>
          </Typography>
        </Box>
      );
    } else {
      return '';
    }
  }
}

Result.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  match: PropTypes.object,
  loadGames: PropTypes.func,
  setGame: PropTypes.func,
  loadGame: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(withRouter(Result))));

import React, { Component } from 'react';
import { withStyles, withTheme } from '@material-ui/core/styles';
import _ from 'lodash';
import ordinal from 'ordinal';

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
import { Route } from 'react-router-dom';

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
});

const getOrdinalDesc = (percentile) => {
  if (percentile === null) {
    return '';
  }

  var position =
    percentile < 50 ? 'bottom' : percentile > 50 ? 'top' : 'middle';

  return `${position} ${
    percentile > 50 ? (100 - percentile).toFixed(2) : percentile.toFixed(2)
  }% (${percentile > 0 ? ordinal(Math.ceil(percentile)) : '0th'} percentile)`;
};

const getTitle = (percentile) => {
  if (window.location.toString().includes('bgpeen')) {
    return `Your bgpeen is ${percentile < 50 ? 'small' : 'big'} in `;
  } else {
    return `You're ${getPercentileQuip(percentile)} at `;
  }
};

// TODO: Case or switch
const getPercentileQuip = (percentile) => {
  if (percentile < 1) {
    return 'quite possibly one of the worst people in the world';
  } else if (percentile < 10) {
    return 'just terrible';
  } else if (percentile < 45) {
    return 'not very good';
  } else if (percentile < 55) {
    return 'boringly average';
  } else if (Math.ceil(percentile) === 69) {
    return 'nice';
  } else if (percentile < 90) {
    return 'actually pretty decent';
  } else if (percentile < 99) {
    return 'legit amazing';
  } else if (percentile >= 99) {
    return 'probably cheating';
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
            (this.state.filters.players || null) ===
              (result.playerCount || null) &&
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
        percentile: this.getPercentile(
          this.state.result.scores,
          this.state.filters.score
        ),
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
        (result, c, s) =>
          result +
          (parseInt(s) < score ? c : 0) +
          (parseInt(s) === score ? c / 0.5 : 0),
        0
      ) *
        100) /
      _.sum(_.values(scores));
    return percentile;
  };

  componentDidMount() {
    if (this.props.data.game) {
      this.setResult();
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.data.game &&
      prevProps.data.game &&
      this.props.data.game.id !== prevProps.data.game.id
    ) {
      this.setResult();
    }
  }

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
          {/* <Filters handleChange={this.handleFiltersChange} /> */}
          {/* <Route path="/:id/:name" component={Result} /> */}
          <Route
            path="/:id/:name/:players?/:place?/:score?"
            render={(routeProps) => (
              <Filters
                {...routeProps}
                handleChange={this.handleFiltersChange}
              />
            )}
          />
          <Paper className={classes.paper} square>
            <Box component="div">
              <Box component="div" mb={2}>
                <Typography
                  variant="h3"
                  component="h2"
                  gutterBottom
                  align="center"
                >
                  {this.state.percentile !== null
                    ? getTitle(this.state.percentile)
                    : ''}
                  <Link
                    className={classes.link}
                    href={`https://boardgamegeek.com/boardgame/${this.props.data.game.id}`}
                    target="_blank"
                  >
                    {this.props.data.game.name}
                  </Link>
                </Typography>
                <Typography component="div" align="center">
                  {this.state.filters.score
                    ? ` Your score of ${
                        this.state.filters.score
                      } places you in the ${getOrdinalDesc(
                        this.state.percentile
                      )} of valid scores recorded on `
                    : 'Scores provided by '}
                  <Link
                    className={classes.link}
                    href="https://boardgamegeek.com"
                    target="_blank"
                  >
                    BoardGameGeek.com
                  </Link>
                </Typography>
              </Box>
              <Box
                component="div"
                display="flex"
                flexWrap="wrap"
                justifyContent="center"
                alignItems="center"
                width={1}
              >
                <Card className={classes.card}>
                  <CardContent>
                    <Typography
                      className={classes.title}
                      color="textSecondary"
                      gutterBottom
                    >
                      Valid Scores
                    </Typography>
                    <Typography variant="h3" component="h3">
                      {this.state.result.scoreCount}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography
                      className={classes.title}
                      color="textSecondary"
                      gutterBottom
                    >
                      Excluded Scores
                    </Typography>
                    <Typography variant="h3" component="h3">
                      {this.state.result.trimmedScoreCount}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography
                      className={classes.title}
                      color="textSecondary"
                      gutterBottom
                    >
                      Mean
                    </Typography>
                    <Typography variant="h3" component="h3">
                      {this.state.result.mean}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography
                      className={classes.title}
                      color="textSecondary"
                      gutterBottom
                    >
                      Mode
                    </Typography>
                    <Typography variant="h3" component="h3">
                      {this.state.result.mode}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography
                      className={classes.title}
                      color="textSecondary"
                      gutterBottom
                    >
                      Median
                    </Typography>
                    <Typography variant="h3" component="h3">
                      {this.state.result.median}
                    </Typography>
                  </CardContent>
                </Card>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography
                      className={classes.title}
                      color="textSecondary"
                      gutterBottom
                    >
                      Std
                    </Typography>
                    <Typography variant="h3" component="h3">
                      {this.state.result.std}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            <Graph
              result={this.state.result}
              score={
                this.state.filters.score !== ''
                  ? this.state.filters.score
                  : null
              }
              percentile={this.state.percentile}
            ></Graph>
          </Paper>
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
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps)(withStyles(styles)(withTheme(Result)));

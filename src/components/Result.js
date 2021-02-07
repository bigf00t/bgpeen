import React, { Component, Fragment } from 'react';
import { withStyles, withTheme } from '@material-ui/core/styles';
import _ from 'lodash';
import ordinal from 'ordinal';

import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Graph from './Graph';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const styles = (theme) => ({
  paper: {
    padding: theme.spacing(2, 4, 4),
  },
  link: {
    color: theme.palette.text.disabled,
  },
});

const getOrdinalDesc = (percentile) => {
  var position =
    percentile < 50 ? 'bottom' : percentile > 50 ? 'top' : 'middle';

  return `${position} ${percentile > 50 ? 100 - percentile : percentile}% (${
    percentile > 0 ? ordinal(percentile) : '0th'
  } percentile)`;
};

const getTitle = (percentile) => {
  if (window.location.toString().includes('bgpeen')) {
    return `Your bgpeen is ${percentile < 50 ? 'small' : 'big'}!`;
  } else {
    return `You're ${percentile < 50 ? 'bad' : 'good'} at game!`;
  }
};

const getPercentileQuip = (percentile) => {
  if (percentile < 10) {
    return "You're terrible!";
  } else if (percentile > 45 && percentile < 55) {
    return "You're boring.";
  } else if (percentile === 69) {
    return 'Nice.';
  } else if (percentile > 90) {
    return "You're amazing!";
  } else {
    return '';
  }
};

class Result extends Component {
  constructor(props) {
    super(props);
    this.state = {
      result: {},
      percentile: null,
      score: null,
      players: null,
      place: null,
      mean: null,
      mode: null,
      median: null,
      std: null,
    };
  }

  setResult = () => {
    var result = this.props.game
      ? _.find(this.props.game.results, (result) => {
          return (
            (this.props.filters.players || null) === (result.playerCount || null) &&
            (this.props.filters.place || null) === (result.playerPlace || null)
          );
        })
      : [];

    this.setState({ result: result }, () => {
      this.setPercentile();
      // this.setGraphData();
    });
  };

  setPercentile = () => {
    if (this.props.filters.score) {
      this.setState({
        percentile: this.getPercentile(
          this.state.result.scores,
          this.props.filters.score
        ),
      });
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
          (parseInt(s) === score ? score / 0.5 : 0),
        0
      ) *
        100) /
      _.sum(_.values(scores));
    return parseInt(percentile);
  };

  componentDidUpdate(prevProps) {
    if (
      this.props.game !== prevProps.game ||
      this.props.filters !== prevProps.filters
    ) {
      this.setResult();
    }
  }

  render() {
    const classes = this.props.classes;

    if (this.props.game && this.state.result) {
      // if (!_.isEmpty(this.state.graphData) && this.state.result) {
      return (
        <Box component="div">
          <Paper className={classes.paper} square>
            <Fragment>
              {this.state.score ? (
                <h1>{getTitle(this.state.percentile)}</h1>
              ) : (
                ''
              )}
            </Fragment>
            <p>
              There are {this.state.result.scoreCount} valid{' '}
              {this.props.filters.place
                ? `${ordinal(this.props.filters.place)} place `
                : ''}
              scores{' '}
              {this.props.filters.players
                ? ` for ${this.props.filters.players} player games of`
                : 'for'}{' '}
              {this.props.game.name}. These scores are provided by{' '}
              <Link
                className={classes.link}
                href="https://boardgamegeek.com"
                target="_blank"
              >
                BoardGameGeek
              </Link>{' '}
              and recorded by players like you!
              <br />
              {this.state.result.trimmedScoreCount} scores were excluded for
              being outliers (too many standard deviations away from the mean).
              <br />
              The mean (average) of valid scores is {this.state.mean}, the mode
              (most common) is {this.state.mode}, the median (middle) is{' '}
              {this.state.median} and the standard deviation is {this.state.std}
              .<br />
              {this.props.filters.score
                ? ` Your score of ${
                    this.props.filters.score
                  } places you in the ${getOrdinalDesc(
                    this.state.percentile
                  )} of these scores. ${getPercentileQuip(
                    this.state.percentile
                  )}`
                : ''}
            </p>
            <Graph
              result={this.state.result}
              score={this.props.filters.score}
              percentile={this.state.percentile}
            ></Graph>
          </Paper>
        </Box>
      );
    } else {
      // return (
      //     <Paper className={classes.paper}>
      //         <p>
      //             No data found. Please check your inputs and try again.
      //         </p>
      //     </Paper>
      // );
      return '';
    }
    // } else {
    //   return '';
    // }
  }
}

Result.propTypes = {
  data: PropTypes.object,
  game: PropTypes.object,
  filters: PropTypes.object,
  classes: PropTypes.object,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps)(withStyles(styles)(withTheme(Result)));

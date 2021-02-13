import React, { Component, Fragment } from 'react';
import { withStyles, withTheme } from '@material-ui/core/styles';
import _ from 'lodash';
import ordinal from 'ordinal';

import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';

import Graph from './Graph';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const styles = (theme) => ({
  paper: {
    padding: theme.spacing(2, 4, 4),
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
  } else if (percentile === 69) {
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
      result: {},
      percentile: null,
      players: null,
      place: null,
    };
  }

  setResult = () => {
    var result = this.props.game
      ? _.find(this.props.game.results, (result) => {
          return (
            (this.props.filters.players || null) ===
              (result.playerCount || null) &&
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
          (parseInt(s) === score ? score / 0.5 : 0),
        0
      ) *
        100) /
      _.sum(_.values(scores));
    return percentile;
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
            <Box component="div" display="flex" justifyContent="center">
              <Box component="div" mb={2}>
                <Typography
                  variant="h3"
                  component="h2"
                  gutterBottom
                  align="center"
                >
                  {this.state.percentile !== null ? getTitle(this.state.percentile) : ''}
                  <Link
                    className={classes.link}
                    href={`https://boardgamegeek.com/boardgame/${this.props.game.id}`}
                    target="_blank"
                  >
                    {this.props.game.name}
                  </Link>
                </Typography>
                <Typography component="div" align="center">
                  {this.props.filters.score
                    ? ` Your score of ${
                        this.props.filters.score
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
                <Box component="div" display="flex" justifyContent="center">
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
                {/* <Box component="p">
                  There are {this.state.result.scoreCount} valid{' '}
                  {this.props.filters.place
                    ? `${ordinal(this.props.filters.place)} place `
                    : ''}
                  scores{' '}
                  {this.props.filters.players
                    ? ` for ${this.props.filters.players} player games of`
                    : 'for'}{' '}
                  <Link
                    className={classes.link}
                    href={`https://boardgamegeek.com/boardgame/${this.props.game.id}`}
                    target="_blank"
                  >
                    {this.props.game.name}
                  </Link>
                  . These scores are provided by{' '}
                  <Link
                    className={classes.link}
                    href="https://boardgamegeek.com"
                    target="_blank"
                  >
                    BoardGameGeek
                  </Link>{' '}
                  and recorded by players like you!
                </Box>
                <Box component="p">
                  {this.state.result.trimmedScoreCount} scores were excluded for
                  being outliers (too many standard deviations away from the
                  mean).
                </Box>
                <Box component="p">
                  The mean (average) of valid scores is {this.state.result.mean}
                  , the mode (most common) is {this.state.result.mode}, the
                  median (middle) is {this.state.result.median} and the standard
                  deviation is {this.state.result.std}.
                </Box>
                <Box component="p">
                  {this.props.filters.score
                    ? ` Your score of ${
                        this.props.filters.score
                      } places you in the ${getOrdinalDesc(
                        this.state.percentile
                      )} of these scores. ${getPercentileQuip(
                        this.state.percentile
                      )}`
                    : ''}
                </Box> */}
              </Box>
            </Box>
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

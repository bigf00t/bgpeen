import React, { Component, Fragment } from 'react';
import { withStyles } from '@material-ui/core/styles';
import _ from 'lodash';
import ordinal from 'ordinal';

import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Graph from './Graph';

const styles = theme => ({
    paper: {
        padding: theme.spacing(2, 4, 4),
    },
    link: {
        color: theme.palette.text.disabled,
    },
  });

const getOrdinalDesc = (percentile) => {
  var position = percentile < 50 ? "bottom" : percentile > 50 ? "top" : "middle";

  return `${position} ${percentile > 50 ? 100 - percentile : percentile}% (${percentile > 0 ? ordinal(percentile) : "0th"} percentile)`;
}

const getTitle = (percentile) => {
  if (window.location.toString().includes('bgpeen')) {
    return `Your bgpeen is ${percentile < 50 ? 'small': 'big'}!`
  } else {
    return `You're ${percentile < 50 ? 'bad': 'good'} at game!`;
  }
}

class MeasureResult extends Component {
    render () {
        const classes = this.props.classes;

        if (this.props.open) {
            if (!_.isEmpty(this.props.graphData) && this.props.result) {
                return (
                  <Box component="div">
                    <Paper className={classes.paper} square>
                      <Fragment>{this.props.score ? <h1>{getTitle(this.props.percentile)}</h1> : ""}</Fragment>
                      <p>
                          There are {this.props.result.scoreCount} valid {this.props.place ? `${ordinal(this.props.place)} place ` : ''} 
                          scores {this.props.players ? ` for ${this.props.players} player games of` : 'for'} {this.props.gameName}. These scores are provided by <Link className={classes.link} href="https://boardgamegeek.com" target="_blank">BoardGameGeek</Link> and recorded by players like you!<br/>
                          {this.props.result.trimmedScoreCount} scores were excluded for being outliers (too many standard deviations away from the mean).<br/>
                          The mean (average) of valid scores is {this.props.result.mean}, the mode (most common) is {this.props.result.mode}, the median (middle) is {this.props.result.median} and the standard deviation is {this.props.result.std}.<br/>
                          {this.props.score ? ` Your score of ${this.props.score} places you in the ${getOrdinalDesc(this.props.percentile)} of these scores. ${getPercentileQuip(this.props.percentile)}` : ""}
                      </p>
                      <Graph 
                        data={this.props.graphData}
                        score={this.props.score}
                        percentile={this.props.percentile}
                        mean={this.props.result.mean}
                        std={this.props.result.std}>
                      </Graph>
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
                return "";
            }
        } else {
            return "";
        }
    }
}

const getPercentileQuip = (percentile) => {
  if (percentile < 10) {
    return "You're terrible!";
  } else if (percentile > 45 && percentile < 55) {
    return "You're boring.";
  } else if (percentile === 69) {
    return "Nice.";
  } else if (percentile > 90) {
    return "You're amazing!";
  } else {
    return "";
  }
}

export default withStyles(styles)(MeasureResult);
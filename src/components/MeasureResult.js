import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import _ from 'lodash';
import ordinal from 'ordinal';

import Paper from '@material-ui/core/Paper';
import Graph from './Graph';

const styles = theme => ({
    paper: {
        padding: theme.spacing(2, 4, 4),
    },
  });

const getOrdinalDesc = (percentile) => {
  var position = percentile < 50 ? "bottom" : percentile > 50 ? "top" : "middle";

  return `${position} ${percentile > 50 ? 100 - percentile : percentile}% (${percentile > 0 ? ordinal(percentile) : "0th"} percentile)`;
}

class MeasureResult extends Component {
    render () {
        const classes = this.props.classes;

        if (this.props.open) {
            if (!_.isEmpty(this.props.graphData)) {
                return (
                    <Paper className={classes.paper}>
                        <h3>
                            Your score compared to other {this.props.place ? `${ordinal(this.props.place)} place` : ''} scores 
                            in {this.props.players ? `${this.props.players} player` : ''} games of {this.props.gameName}. 
                        </h3>
                        <p>
                            There are {this.props.result.scoreCount} valid scores for {this.props.gameName} with the same place(s) and player count(s).<br/>
                            {this.props.result.trimmedScoreCount} scores were excluded for being outliers (too many standard deviations away from the mean).<br/>
                            The mean (average) of valid scores is {this.props.result.mean}, the mode (most common) is {this.props.result.mode}, the median (middle) is {this.props.result.median} and the standard deviation is {this.props.result.std}.<br/>
                            {this.props.score ? ` Your score of ${this.props.score} places you in the ${getOrdinalDesc(this.props.percentile)} of these scores. ${getPercentileQuip(this.props.percentile)}` : ""}
                        </p>
                        <Graph data={this.props.graphData} score={this.props.score} percentile={this.props.percentile}></Graph>
                    </Paper>
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
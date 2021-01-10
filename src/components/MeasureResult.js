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
                            Your score compared to other {this.props.places.length > 0 ? `${_.map(this.props.places, (place) => {return ordinal(place)}).join(", ")} place` : ''} scores 
                            in {this.props.players.length > 0 ? `${this.props.players.join(", ")} player` : ''} games of {this.props.gameName}
                        </h3>
                        <p>
                            There are {this.props.scoreCount} recorded scores for {this.props.gameName} with the same place(s) and player count(s), with a mean (average) value of {this.props.mean}.<br/>
                            The mode is {this.props.mode}, the median is {this.props.median} and the standard deviation is {this.props.std}.<br/>
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
  } else if (percentile == 69) {
    return "Nice.";
  } else if (percentile > 90) {
    return "You're amazing!";
  } else {
    return "";
  }
}

export default withStyles(styles)(MeasureResult);
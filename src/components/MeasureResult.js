import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import _ from 'lodash';

import Paper from '@material-ui/core/Paper';
import Graph from './Graph';

var ordinal = require('ordinal');

const styles = theme => ({
    paper: {
        padding: theme.spacing(2, 4, 4),
    },
  });

const getOrdinal = (percentile) => {
  if (percentile) {
    return percentile ? ordinal(percentile) : 'N/A';
  }
}

class MeasureResult extends Component {
    render () {
        const classes = this.props.classes;

        if (this.props.open) {
            if (!_.isEmpty(this.props.graphData)) {
                return (
                    <Paper className={classes.paper}>
                        <h3>
                            Your score compared to other {ordinal(parseInt(this.props.place))} place scores in {this.props.players.join(",")} player games of {this.props.gameName}
                        </h3>
                        <p>
                            There are {this.props.scoreCount} recorded scores for {this.props.gameName} with the same place(s) and player count(s), with an average value of {this.props.average}.<br/>
                            {this.props.score ? ` Your score of ${this.props.score} places you in the ${getOrdinal(this.props.percentile)} percentile of these scores. ${getPercentileQuip(this.props.percentile)}` : ""}
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
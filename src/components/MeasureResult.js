import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import _ from 'lodash';

import Paper from '@material-ui/core/Paper';
import VerticalBar from './VerticalBar';

var ordinal = require('ordinal');

const styles = theme => ({
    paper: {
        // position: 'absolute',
        // maxWidth: 400,
        // backgroundColor: theme.palette.background.paper,
        // border: '2px solid #000',
        // boxShadow: theme.shadows[5],
        padding: theme.spacing(2, 4, 4),
        // outline: 'none',
        // top: `50%`,
        // left: `50%`,
        // transform: `translate(-50%, -50%)`,
    },
  });

class MeasureResult extends Component {
    render () {
        const classes = this.props.classes;

        if (this.props.open) {
            if (this.props.graphData != null) {
                return (
                    <Paper className={classes.paper}>
                        <h3>
                            Showing scores for {this.props.game.name} with Player Count {this.props.players} and Position {this.props.position}
                        </h3>
                        <p>
                            The average for the current player count and position is {this.props.average}.
                            {this.props.score ? " Your score was " + this.props.score + "." : ""}
                            {this.props.percentile ? " This is in the " + ordinal(this.props.percentile) + " percentile for the current player count and position." : ""}
                            {/* {this.props.score ? "Your score was" + this.props.score + "." : "You didn't enter a score."}
                            {this.props.average ? "The average score for" + this.props.game.name + " is " + this.props.average + "." : ""}
                            <br />
                            {parseInt(this.props.score) > this.props.average ? "You're amazing!" : "You're terrible!"} */}
                        </p>
                        <VerticalBar data={this.props.graphData}></VerticalBar>
                    </Paper>
                );
            } else {
                return (
                    <Paper className={classes.paper}>
                        <p>
                            No data found. Please check your inputs and try again.
                        </p>
                    </Paper>
                );
            }
        } else {
            return "";
        }
    }
}

const mapStateToProps = ({data}) => {
  return { data }
}

export default withStyles(styles)(MeasureResult);
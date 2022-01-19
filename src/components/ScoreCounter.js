import React, { Component } from 'react';

import * as actions from '../actions';

import { connect } from 'react-redux';
import _ from 'lodash';

import { withStyles, withTheme } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import FlipNumbers from 'react-flip-numbers';

const styles = (theme) => ({
  counter: {
    margin: theme.spacing(1),
  },
});

const numberStyle = {
  width: 30,
  height: 50,
  fontSize: '2rem',
  borderRadius: '6px',
  marginLeft: '0.3rem',
  marginTop: '0.3rem',
  background: 'rgba(0, 0, 0, 0.75)',
};

class ScoreCounter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      totalScores: 0,
      totalGames: 0,
    };
  }

  componentDidMount() {
    this.props.loadGames().then(() => {
      var totalScores = _.reduce(this.props.data.games, (sum, game) => sum + game.totalScores, 0);
      this.setState({ totalScores: totalScores, totalGames: this.props.data.games.length });
    });
  }

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" width={1} mt={5}>
        <Typography variant="h4" component="h4" align="center">
          Now serving
        </Typography>
        <Box component="div" className={classes.counter}>
          <FlipNumbers
            height={60}
            width={42}
            color="white"
            background=""
            play
            numbers={`${this.state.totalScores}`}
            duration="2"
            numberStyle={numberStyle}
          />
        </Box>
        <Typography variant="h4" component="h4" align="center" mt={2}>
          scores for
        </Typography>
        <Box component="div" className={classes.counter}>
          <FlipNumbers
            height={60}
            width={42}
            color="white"
            background=""
            play
            numbers={`${this.state.totalGames}`}
            duration="2"
            numberStyle={numberStyle}
          />
        </Box>
        <Typography variant="h4" component="h4" align="center" mt={2}>
          games and counting!
        </Typography>
      </Box>
    );
  }
}

ScoreCounter.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  loadGames: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(withRouter(ScoreCounter))));

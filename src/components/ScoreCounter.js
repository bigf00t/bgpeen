import React, { useState, useEffect } from 'react';

import * as actions from '../actions';

import { connect } from 'react-redux';
import _ from 'lodash';

import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import Typography from '@mui/material/Typography';
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

const nonNumberStyle = {
  width: 20,
  height: 60,
  fontSize: '2rem',
  borderRadius: '6px',
  marginRight: '0.2rem',
  paddingTop: '0.6rem',
  paddingLeft: '0.4rem',
  background: 'rgba(0, 0, 0, 0.75)',
};

const ScoreCounter = (props) => {
  const [totalScores, setTotalScores] = useState(null);
  const [totalGames, setTotalGames] = useState(null);
  const [scoreValue, setScoreValue] = useState(null);
  const [gameValue, setGameValue] = useState(null);

  const classes = props.classes;

  useEffect(() => {
    if (props.data.gameNames.length > 0 && !(totalScores && totalGames)) {
      const newTotalScores = _.reduce(
        props.data.gameNames,
        (sum, game) => sum + (game.totalScores || 0),
        0
      ).toLocaleString();
      const newTotalGames = props.data.gameNames.length.toLocaleString();
      setTotalScores(newTotalScores);
      setTotalGames(newTotalGames);
      setScoreValue('0'.repeat(newTotalScores.length));
      setGameValue('0'.repeat(newTotalGames.length));
    }
  }, [props.data.gameNames]);

  useEffect(() => {
    if (totalScores && totalGames) {
      setScoreValue(totalScores);
      setGameValue(totalGames);
    }
  }, [totalScores, totalGames]);

  if (!(totalScores && totalGames)) {
    return <div />;
  }

  return (
    <Box component="div">
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
            numbers={scoreValue}
            duration="2"
            numberStyle={numberStyle}
            nonNumberStyle={nonNumberStyle}
          />
        </Box>
        <Typography variant="h4" component="h4" align="center">
          scores for
        </Typography>
        <Box component="div" className={classes.counter}>
          <FlipNumbers
            height={60}
            width={42}
            color="white"
            background=""
            play
            numbers={gameValue}
            duration="2"
            numberStyle={numberStyle}
            nonNumberStyle={nonNumberStyle}
          />
        </Box>
        <Typography variant="h4" component="h4" align="center">
          games and counting!
        </Typography>
      </Box>
    </Box>
  );
};

ScoreCounter.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(ScoreCounter)));

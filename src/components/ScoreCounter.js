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
  container: {
    backgroundColor: '#282828',
    minHeight: 82,
    '& h4': {
      fontSize: '1.5rem',
      lineHeight: '60px',
    },
  },
  counter: {
    margin: theme.spacing(1),
  },
});

const numberStyle = {
  width: 24,
  height: 40,
  fontSize: '1.5rem',
  borderRadius: '4px',
  marginLeft: '0.3rem',
  marginTop: '0.3rem',
  background: 'rgba(0, 0, 0, 0.75)',
};

const nonNumberStyle = {
  width: 26,
  height: 48,
  fontSize: '1.5rem',
  borderRadius: '4px',
  marginRight: '0.2rem',
  paddingTop: '0.6rem',
  paddingLeft: '0.6rem',
  background: 'rgba(0, 0, 0, 0.75)',
};

const ScoreCounter = (props) => {
  const [totalScores, setTotalScores] = useState(null);
  const [totalGames, setTotalGames] = useState(null);
  const [scoreValue, setScoreValue] = useState('0'.repeat(12));
  const [gameValue, setGameValue] = useState('0'.repeat(4));

  const classes = props.classes;

  useEffect(() => {
    if (props.data.games.length > 0 && !(totalScores && totalGames)) {
      const newTotalScores = _.reduce(
        props.data.games,
        (sum, game) => sum + (game.totalScores || 0),
        0
      ).toLocaleString();
      const newTotalGames = props.data.games.length.toLocaleString();
      setTotalScores(newTotalScores);
      setTotalGames(newTotalGames);
      setScoreValue('0'.repeat(newTotalScores.length));
      setGameValue('0'.repeat(newTotalGames.length));
    }
  }, [props.data.games]);

  useEffect(() => {
    if (totalScores && totalGames) {
      setScoreValue(totalScores);
      setGameValue(totalGames);
    }
  }, [totalScores, totalGames]);

  if (scoreValue == '0'.repeat(12)) {
    return null;
  }

  return (
    <Box component="div" className={classes.container} width={1} elevation={2} p={1}>
      {totalScores && totalGames && (
        <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
          <Typography variant="h4" component="h4" align="center">
            Now serving
          </Typography>
          <Box component="div" className={classes.counter}>
            <FlipNumbers
              height={50}
              width={36}
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
              height={50}
              width={36}
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
            games
          </Typography>
          <Typography variant="h4" component="h4" align="center">
            &nbsp;...and counting!
          </Typography>
        </Box>
      )}
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

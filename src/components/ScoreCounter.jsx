import React, { useState, useEffect } from 'react';

import * as actions from '../actions';

import { connect } from 'react-redux';

import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import Typography from '@mui/material/Typography';
import FlipNumbers from 'react-flip-numbers';

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
  width: 8,
  height: 48,
  fontSize: '1.5rem',
  borderRadius: '4px',
  marginRight: '0.2rem',
  paddingTop: '0.6rem',
  paddingLeft: '0.15rem',
  background: 'none',
};

const ScoreCounter = (props) => {
  const [scoreValue, setScoreValue] = useState('0,000,000');
  const [gameValue, setGameValue] = useState('000');

  useEffect(() => {
    if (!props.scoreStats) {
      props.loadScoreStats();
    }
  }, []);

  useEffect(() => {
    if (props.scoreStats) {
      setScoreValue(props.scoreStats.totalScores.toLocaleString());
      setGameValue(props.scoreStats.totalGames.toLocaleString());
    }
  }, [props.scoreStats]);

  return (
    <Box
      component="div"
      sx={{ backgroundColor: '#282828', minHeight: 82, '& h4': { fontSize: '1.5rem', lineHeight: '60px' } }}
      width={1}
      elevation={2}
      p={1}
    >
      <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
        <Typography variant="h4" component="h4" align="center">
          Now serving
        </Typography>
        <Box component="div" sx={{ m: 1 }}>
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
        <Box component="div" sx={{ m: 1 }}>
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
    </Box>
  );
};

ScoreCounter.propTypes = {
  scoreStats: PropTypes.object,
  loadScoreStats: PropTypes.func,
};

const mapStateToProps = (state) => ({
  scoreStats: state.data.scoreStats,
});

export default connect(mapStateToProps, actions)(ScoreCounter);

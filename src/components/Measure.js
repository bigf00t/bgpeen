import React, { useEffect } from 'react';
import ScoreCounter from './ScoreCounter';
import SelectGame from './SelectGame';
import PopularGames from './PopularGames';
import * as actions from '../actions';
import { connect } from 'react-redux';
import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

const styles = () => ({
  root: {},
});

const Measure = (props) => {
  const classes = props.classes;
  document.title = 'Good at Games';

  // Game changed
  useEffect(() => {
    // console.log(props.data.game);
    props.setGame(null);
  }, []);

  return (
    <Box component="div" className={classes.root}>
      <SelectGame />
      <ScoreCounter />
      <PopularGames />
    </Box>
  );
};

Measure.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  setGame: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(Measure)));

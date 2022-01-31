import React from 'react';
import ScoreCounter from './ScoreCounter';
import SelectGame from './SelectGame';
import PopularGames from './PopularGames';
import * as actions from '../actions';
import { connect } from 'react-redux';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';

const styles = () => ({
  root: {},
});

const Measure = (props) => {
  const classes = props.classes;
  document.title = 'Good at Games';

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
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(Measure)));

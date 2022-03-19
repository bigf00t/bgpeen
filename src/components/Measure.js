import React from 'react';
import ScoreCounter from './ScoreCounter';
import SelectGame from './SelectGame';
import PopularGames from './PopularGames';
import NewestGames from './RecentlyAddedGames';
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

  return (
    <Box component="div" className={classes.root}>
      <Box component="div" m={4}>
        <SelectGame />
      </Box>
      <ScoreCounter />
      <Box component="div" m={4}>
        <PopularGames />
      </Box>
      <Box component="div" m={4}>
        <NewestGames />
      </Box>
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

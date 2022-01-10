import React, { Component } from 'react';
import SelectGame from './SelectGame';
import Result from './Result';
import * as actions from '../actions';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';

const styles = () => ({
  root: {},
});

class Measure extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  // componentDidMount() {
  //   this.props.loadGames();
  // }

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div" className={classes.root}>
        <Route path="/:id?/:name?" component={SelectGame} />
        <Route path="/:id/:name" component={Result} />
      </Box>
    );
  }
}

Measure.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(
  mapStateToProps,
  actions
)(withStyles(styles)(withTheme(Measure)));

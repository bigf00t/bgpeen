import React, { Component } from 'react';
import SelectGame from './SelectGame';
import Result from './Result';
// import AlertDialog from './AlertDialog';
import * as actions from '../actions';
import { connect } from 'react-redux';
import { withStyles, withTheme } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';
import Filters from './Filters';

const styles = () => ({
  root: {},
});

class Measure extends Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null,
      filters: {},
    };
  }

  componentDidMount() {
    this.props.fetchGames();
  }

  handleGameChange = (game) => {
    this.setState({ game: game });
  };

  handleFiltersChange = (players, score, place) => {
    this.setState({
      filters: {
        players: players,
        score: score,
        place: place,
      },
    });
  };

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div" className={classes.root}>
        <SelectGame handleChange={this.handleGameChange} />
        <Filters
          game={this.state.game}
          handleChange={this.handleFiltersChange}
        />
        <Result game={this.state.game} filters={this.state.filters} />
        {/* <AlertDialog
          title={this.state.errorTitle}
          content={this.state.errorMessage}
          open={this.state.errorOpen}
          setOpen={this.setErrorOpen}
        /> */}
      </Box>
    );
  }
}

Measure.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  fetchGames: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(
  mapStateToProps,
  actions
)(withStyles(styles)(withTheme(Measure)));

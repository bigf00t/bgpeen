import React, { Component } from 'react';

import * as actions from '../actions';
import { db } from '../fire';

import { connect } from 'react-redux';
import _ from 'lodash';

import { withStyles, withTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import Autocomplete from '@material-ui/lab/Autocomplete';
import PropTypes from 'prop-types';
import { Button } from '@material-ui/core';

const styles = (theme) => ({
  button: {
    marginTop: theme.spacing(1),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 150,
    height: 60,
  },
  formGroup: {
    margin: theme.spacing(2),
    justifyContent: 'center',
  },
  message: {
    margin: theme.spacing(2),
    textAlign: 'center',
  },
});
class SelectGame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null,
      added: false,
    };
  }

  handleGameChange = (event, newGame) => {
    this.setState({ game: newGame });
    if (newGame) {
      if (!newGame.id) {
        this.setState({ added: false });
        this.props.handleChange(null);
      } else if (!newGame.results) {
        this.props.fetchGameResults(newGame.id).then(() => {
          let loadedGame = _.find(
            this.props.data.games,
            (game) => game.id === newGame.id
          );
          this.props.handleChange(loadedGame);
        });
      } else {
        this.props.handleChange(newGame);
      }
    }
  };

  handleAddClick = () => {
    db.collection('searches')
      .add({
        name: this.state.game,
      })
      .then(() => {
        this.setState({ added: true });
      });
  };

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div">
        <FormGroup row className={classes.formGroup}>
          <FormControl className={classes.formControl}>
            <Autocomplete
              freeSolo
              autoHighlight
              autoSelect
              blurOnSelect
              id="game"
              name="game"
              value={this.state.game}
              onChange={this.handleGameChange}
              options={this.props.data.games}
              getOptionLabel={(option) => option.name || option}
              style={{ width: 400 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Click to select a game or start typing!"
                  label="Game"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              )}
            />
          </FormControl>
          {!this.state.game || this.state.game.id ? (
            ''
          ) : (
            <FormControl className={classes.formControl}>
              <Button
                className={classes.button}
                variant="contained"
                color="primary"
                disabled={this.state.added}
                onClick={this.handleAddClick}
              >
                {this.state.added ? 'Added!' : 'Add Game'}
              </Button>
            </FormControl>
          )}
        </FormGroup>
        {this.state.added ? (
          <Box component="div" className={classes.message}>
            Game has been added to the queue, but it could take up to 10 minutes
            for the data to be available. <br />
            Please wait and refresh in a little while. Thanks!
          </Box>
        ) : (
          ''
        )}
      </Box>
    );
  }
}

SelectGame.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  fetchGameResults: PropTypes.func,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(
  mapStateToProps,
  actions
)(withStyles(styles)(withTheme(SelectGame)));

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
import { withRouter } from 'react-router-dom';

const styles = (theme) => ({
  button: {
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  formControl: {
    maxWidth: 330,
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

const getGameSlug = (game) => {
  return game.name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
};

class SelectGame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null,
      added: false,
    };
  }

  handleGameChange = (event, newGame) => {
    // console.log(newGame);
    this.setState({ game: newGame });
    if (newGame) {
      if (!newGame.id) {
        this.setState({ added: false });
        this.props.setGame(null);
      } else {
        this.setOrLoadGame(newGame);
        this.props.history.push({
          pathname: `/${newGame.id}/${getGameSlug(newGame)}`,
        });
      }
    }
  };

  setOrLoadGame = (newGame) => {
    if (!newGame.results) {
      this.props.loadGame(newGame.id);
    } else {
      this.props.setGame(newGame.id);
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

  setGameFromUrl = () => {
    if (this.props.match.params.id) {
      let newGame = this.props.data.games.find(
        (game) => game.id == this.props.match.params.id,
        null
      );
      this.setOrLoadGame(newGame);
      this.setState({ game: newGame });
    } else if (this.props.data.game !== null) {
      this.props.setGame(null);
      this.setState({ game: null });
    }
  };

  componentDidMount() {
    this.props.loadGames().then(() => this.setGameFromUrl());
  }

  componentDidUpdate(prevProps) {
    if (this.props.location !== prevProps.location) {
      this.setState({ added: false });
      this.setGameFromUrl();
    }
  }

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div">
        <FormGroup row className={classes.formGroup}>
          <FormControl className={classes.formControl} fullWidth>
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
              fullWidth
              getOptionLabel={(option) => option.name || option}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select a game or start typing!"
                  label="Game"
                  fullWidth
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
  history: PropTypes.object,
  location: PropTypes.object,
  match: PropTypes.object,
  loadGames: PropTypes.func,
  loadGame: PropTypes.func,
  setGame: PropTypes.func,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(
  mapStateToProps,
  actions
)(withStyles(styles)(withTheme(withRouter(SelectGame))));

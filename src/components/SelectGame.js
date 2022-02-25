import React, { Component } from 'react';

import * as actions from '../actions';
import { db } from '../fire';

import { connect } from 'react-redux';

import { withStyles, withTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import Autocomplete from '@material-ui/lab/Autocomplete';
import PropTypes from 'prop-types';
import { Button } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';

import { getGameSlug } from '../utils';

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

class SelectGame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null,
      gameText: null,
      added: false,
    };
  }

  handleGameTextChange = (event) => {
    if (!this.state.game) {
      this.setState({ gameText: event.target.value });
      // console.log(event.target.value);
    }
  };

  handleGameBlur = () => {
    this.setState({ game: this.state.gameText, added: false });
    this.props.setGame(null);
  };

  handleGameChange = (event, newGame) => {
    this.setState({ game: newGame });
    if (newGame) {
      this.props.history.push({
        pathname: `/${newGame.id}/${getGameSlug(newGame)}`,
      });
    }
  };

  handleAddClick = () => {
    db.collection('searches')
      .add({
        name: this.state.game,
      })
      .then(() => {
        this.setState({ added: true, game: null, gameText: null });
      });
  };

  componentDidMount() {
    this.props.loadGames();
  }

  componentDidUpdate(prevProps) {
    if (this.props.location !== prevProps.location) {
      this.setState({ added: false });
    }
  }

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div" mt={5}>
        <Typography variant="h4" component="h4" align="center">
          Find a Game
        </Typography>
        <FormGroup row className={classes.formGroup}>
          <FormControl className={classes.formControl} fullWidth>
            <Autocomplete
              freeSolo
              autoHighlight
              // autoSelect
              blurOnSelect
              id="game"
              name="game"
              value={this.state.game}
              onChange={this.handleGameChange}
              onBlur={this.handleGameBlur}
              options={this.props.data.games}
              fullWidth
              getOptionLabel={(option) => option.name || option}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Start typing..."
                  // label="Game"
                  onChange={this.handleGameTextChange}
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
                Add Game
                {/* {this.state.added ? 'Added!' : 'Add Game'} */}
              </Button>
            </FormControl>
          )}
        </FormGroup>
        {this.state.added ? (
          <Box component="div" className={classes.message}>
            Game has been added to the queue, but it could take up to 10 minutes for score data to be available. <br />
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
  loadGames: PropTypes.func,
  loadGame: PropTypes.func,
  setGame: PropTypes.func,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(withRouter(SelectGame))));

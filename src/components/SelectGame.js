import React, { Component } from 'react';

import * as actions from '../actions';

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
  root: {},
  select: {},
  textField: {},
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
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

class SelectGame extends Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null,
    };
  }

  handleGameChange = (event, newGame) => {
    this.setState({ game: newGame });
    if (newGame) {
      if (!newGame.id) {
        console.log(newGame);
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

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div" className={classes.root}>
        <FormGroup row className={classes.formGroup}>
          {/* <FormControl variant="outlined" className={classes.formControl}>
                        <GameSelect game={this.state.game} data={this.getSortedGames()} handleGameChange={this.handleGameChange} />
                    </FormControl> */}
          {/* <FormControl className={classes.formControl}>
                        <InputLabel id="game-label">Game</InputLabel>
                        <Select
                            labelid="game-label"
                            id="game"
                            name="game"
                            value={this.state.game}
                            onChange={this.handleGameChange}
                        >
                        {this.props.data.games.length > 0 ? this.props.data.games.map((game) => (
                            <MenuItem value={game} key={game.id}>{game.name}</MenuItem>
                        )) : ''}
                        </Select>
                    </FormControl> */}
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
              style={{ width: 300 }}
              renderInput={(params) => <TextField {...params} label="Game" />}
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
              >
                Add Game
              </Button>
            </FormControl>
          )}
        </FormGroup>
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

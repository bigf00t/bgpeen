import React, { Component } from 'react';

import _ from 'lodash';
import ordinal from 'ordinal';
import { DebounceInput } from 'react-debounce-input';

import { withStyles, withTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';

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
  selectEmpty: {},
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

class Filters extends Component {
  constructor(props) {
    super(props);
    this.state = {
      score: '',
      place: '',
      players: '',
      validPlayerPlaces: [],
    };
  }

  handleScoreChange = (event) => {
    this.setState({ score: event.target.value }, () => {
      this.props.handleChange(
        this.state.players,
        this.state.score,
        this.state.place
      );
    });
  };

  handlePlayersChange = (event) => {
    this.setState({ players: event.target.value }, () => {
      var validPlayerPlaces = this.getValidPlayerPlaces();

      if (
        this.state.place !== '' &&
        validPlayerPlaces.indexOf(this.state.place) === -1
      ) {
        this.setState({ place: '' }, () => {
          this.props.handleChange(
            this.state.players,
            this.state.score,
            this.state.place
          );
        });
      } else {
        this.props.handleChange(
          this.state.players,
          this.state.score,
          this.state.place
        );
      }

      this.setState({ validPlayerPlaces: validPlayerPlaces });
    });
  };

  getValidPlayerPlaces = () => {
    return this.props.game && this.state.players !== ''
      ? _.range(1, this.state.players + 1)
      : [];
  };

  handlePlaceChange = (event) => {
    this.setState({ place: event.target.value }, () => {
      this.props.handleChange(
        this.state.players,
        this.state.score,
        this.state.place
      );
    });
  };

  componentDidUpdate(prevProps) {
    if (this.props.game !== prevProps.game) {
      this.setState({ players: '', score: '', place: '' }, () => {
        this.props.handleChange('', '', '');
      });
    }
  }

  render() {
    const classes = this.props.classes;

    if (this.props.game) {
      return (
        <Box component="div" className={classes.root}>
          <FormGroup row className={classes.formGroup}>
            <FormControl className={classes.formControl}>
              <InputLabel id="players-label" shrink={true}>
                Players
              </InputLabel>
              <Select
                labelid="players-label"
                id="players"
                name="players"
                // multiple
                value={this.state.players}
                onChange={this.handlePlayersChange}
                displayEmpty
                MenuProps={MenuProps}
              >
                <MenuItem key="" value="">
                  Any
                </MenuItem>
                {this.props.game.playerCounts
                  ? this.props.game.playerCounts.map((count) => (
                      <MenuItem key={count} value={count}>
                        {count}
                      </MenuItem>
                    ))
                  : ''}
              </Select>
            </FormControl>
            <FormControl className={classes.formControl}>
              <DebounceInput
                element={TextField}
                debounceTimeout={300}
                className={classes.textField}
                id="score"
                name="score"
                label="Your Score"
                value={this.state.score}
                onChange={this.handleScoreChange}
              />
            </FormControl>
            <FormControl className={classes.formControl}>
              <InputLabel id="place-label" shrink={true}>
                Place
              </InputLabel>
              <Select
                labelid="place-label"
                id="place"
                name="place"
                value={this.state.place}
                onChange={this.handlePlaceChange}
                input={<Input />}
                displayEmpty
                MenuProps={MenuProps}
              >
                <MenuItem key="" value="">
                  Any
                </MenuItem>
                {this.state.validPlayerPlaces.map((count) => (
                  <MenuItem key={count} value={count}>
                    {ordinal(count)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormGroup>
        </Box>
      );
    } else {
      return '';
    }
  }
}

Filters.propTypes = {
  game: PropTypes.object,
  classes: PropTypes.object,
  handleChange: PropTypes.func,
};

export default withStyles(styles)(withTheme(Filters));

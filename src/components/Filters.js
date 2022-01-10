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
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';

const styles = (theme) => ({
  root: {},
  select: {},
  textField: {},
  button: {
    marginTop: theme.spacing(1),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 100,
    height: 60,
  },
  selectEmpty: {},
  formGroup: {
    // margin: theme.spacing(2),
    marginTop: theme.spacing(-2),
    justifyContent: 'center',
  },
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
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
    this.setState({ score: this.getIntFromParam(event.target.value) }, () => {
      this.setHistory();
      this.sendFiltersUpdate();
    });
  };

  handlePlayersChange = (event) => {
    this.setState({ players: event.target.value }, () => {
      var validPlayerPlaces = this.getValidPlayerPlaces();

      if (
        this.state.place &&
        validPlayerPlaces.indexOf(this.state.place) === -1
      ) {
        this.setState({ place: '' }, () => {
          this.setHistory();
          this.sendFiltersUpdate();
        });
      } else {
        this.setHistory();
        this.sendFiltersUpdate();
      }

      this.setState({ validPlayerPlaces: validPlayerPlaces });
    });
  };

  getValidPlayerPlaces = () => {
    return this.props.data.game && this.state.players
      ? _.range(1, this.state.players + 1)
      : [];
  };

  handlePlaceChange = (event) => {
    this.setState({ place: event.target.value }, () => {
      this.setHistory();
      this.sendFiltersUpdate();
    });
  };

  setHistory = () => {
    let params = [
      this.props.match.params.id,
      this.props.match.params.name,
      this.state.players !== '' ? this.state.players : 'any',
      this.state.place !== '' ? this.state.place : 'any',
      this.state.score || '',
    ];
    this.props.history.push({
      pathname: `/${params.join('/')}`,
    });
  };

  setFiltersFromUrl = () => {
    this.setState(
      {
        players: this.getIntFromParam(this.props.match.params.players),
        score: this.getIntFromParam(this.props.match.params.score),
      },
      () => {
        this.setState(
          { validPlayerPlaces: this.getValidPlayerPlaces() },
          () => {
            this.setState(
              {
                place: this.getIntFromParam(this.props.match.params.place),
              },
              () => this.sendFiltersUpdate()
            );
          }
        );
      }
    );
  };

  getIntFromParam = (param) => {
    return !isNaN(param) && param !== '' ? parseInt(param) : '';
  };

  sendFiltersUpdate = () => {
    this.props.handleChange({
      players: this.state.players,
      place: this.state.place,
      score: this.state.score,
    });
  };

  componentDidMount() {
    this.setFiltersFromUrl();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.data.game &&
      this.props.data.game.id !== prevProps.data.game.id
    ) {
      this.setState({ players: '', place: '', score: '' }, () => {
        this.sendFiltersUpdate();
      });
    }
  }

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div" className={classes.root}>
        <FormGroup row className={classes.formGroup}>
          <FormControl className={classes.formControl}>
            <DebounceInput
              element={TextField}
              debounceTimeout={300}
              className={classes.textField}
              id="score"
              name="score"
              label="Your Score"
              value={this.state.score}
              style={{ maxWidth: 100 }}
              onChange={this.handleScoreChange}
            />
          </FormControl>
          <FormControl className={classes.formControl}>
            <InputLabel id="players-label" shrink={true}>
              Players
            </InputLabel>
            <Select
              labelid="players-label"
              id="players"
              name="players"
              value={this.state.players}
              onChange={this.handlePlayersChange}
              displayEmpty
              MenuProps={MenuProps}
            >
              <MenuItem key="" value="">
                Any
              </MenuItem>
              {this.props.data.game.playerCounts
                ? this.props.data.game.playerCounts.map((count) => (
                    <MenuItem key={count} value={count}>
                      {count}
                    </MenuItem>
                  ))
                : ''}
            </Select>
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
  }
}

Filters.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  match: PropTypes.object,
  history: PropTypes.object,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps)(
  withStyles(styles)(withTheme(withRouter(Filters)))
);

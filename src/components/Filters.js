import React, { Component } from 'react';

import _ from 'lodash';
import ordinal from 'ordinal';
import { DebounceInput } from 'react-debounce-input';

import { withStyles, withTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import Autocomplete from '@material-ui/lab/Autocomplete';

const styles = (theme) => ({
  root: {},
  select: {},
  textField: {},
  button: {
    marginTop: theme.spacing(1),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 160,
    height: 60,
  },
  selectEmpty: {},
  formGroup: {
    // margin: theme.spacing(2),
    marginTop: theme.spacing(-2),
    justifyContent: 'center',
  },
  floatingLabelFocusStyle: {
    '&.Mui-focused': {
      color: theme.palette.text.primary,
    },
  },
});

class Filters extends Component {
  constructor(props) {
    super(props);
  }

  state = {
    score: '',
    place: null,
    players: null,
    validPlayerPlaces: [],
    playersHighlightValue: '',
    placeHighlightValue: '',
  };

  handleScoreChange = (event) => {
    this.setState({ score: this.getIntFromParam(event.target.value) }, () => {
      this.setHistory();
      this.sendFiltersUpdate();
    });
  };

  handlePlayersChange = (event, newPlayers) => {
    if (!newPlayers) {
      setTimeout(() => {
        document.activeElement.blur();
      }, 0);
    }
    this.setState({ players: newPlayers }, () => {
      var validPlayerPlaces = this.getValidPlayerPlaces();

      if (this.state.place && validPlayerPlaces.indexOf(this.state.place) === -1) {
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

  handlePlayersHighlightChange = (event, option, reason) => {
    this.setState({ playersHighlightValue: option });
  };

  getValidPlayerPlaces = () => {
    return this.props.data.game && this.state.players ? _.range(1, this.state.players + 1) : [];
  };

  handlePlaceChange = (event, newPlace) => {
    if (!newPlace) {
      setTimeout(() => {
        document.activeElement.blur();
      }, 0);
    }
    this.setState({ place: newPlace }, () => {
      this.setHistory();
      this.sendFiltersUpdate();
    });
  };

  handlePlaceHighlightChange = (event, option, reason) => {
    this.setState({ placeHighlightValue: option });
  };

  setHistory = () => {
    let params = [
      this.props.match.params.id,
      this.props.match.params.name,
      this.state.score || '-',
      this.state.players || '-',
      this.state.place || '-',
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
        this.setState({ validPlayerPlaces: this.getValidPlayerPlaces() }, () => {
          this.setState(
            {
              place: this.getIntFromParam(this.props.match.params.place),
            },
            () => this.sendFiltersUpdate()
          );
        });
      }
    );
  };

  getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
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
    if (this.props.data.game && this.props.data.game.id !== prevProps.data.game.id) {
      this.setState({ players: '', place: '', score: '' }, () => {
        this.sendFiltersUpdate();
      });
    }
  }

  render() {
    const classes = this.props.classes;

    const handlePlayersKeyDown = (event) => {
      switch (event.key) {
        case 'Tab': {
          if (this.state.playersHighlightValue) {
            this.handlePlayersChange(event, this.state.playersHighlightValue);
          }
          break;
        }
        default:
      }
    };

    const handlePlaceKeyDown = (event) => {
      switch (event.key) {
        case 'Tab': {
          if (this.state.placeHighlightValue) {
            this.handlePlaceChange(event, this.state.placeHighlightValue);
          }
          break;
        }
        default:
      }
    };

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
              style={{ maxWidth: 160 }}
              onChange={this.handleScoreChange}
              InputLabelProps={{
                className: classes.floatingLabelFocusStyle,
              }}
            />
          </FormControl>
          <span>{this.state.players == undefined}</span>
          <FormControl className={classes.formControl}>
            {/* <InputLabel id="players-label">Your Player Count</InputLabel> */}
            <Autocomplete
              // freeSolo
              autoHighlight
              // autoSelect
              blurOnSelect
              disableClearable={this.state.players == ''}
              id="players"
              // name="players"
              value={this.state.players || null}
              // inputValue={this.state.playersInputValue}
              onChange={this.handlePlayersChange}
              // onBlur={this.handlePlayersBlur}
              onHighlightChange={this.handlePlayersHighlightChange}
              // onInputChange={(event, newInputValue) => this.setState({ playersInputValue: newInputValue })}
              options={this.props.data.game.playerCounts}
              fullWidth
              getOptionLabel={(count) => (count ? String(count) : '')}
              renderInput={(params) => {
                params.inputProps.onKeyDown = handlePlayersKeyDown;
                return (
                  <TextField
                    {...params}
                    label="Your Player Count"
                    // placeholder="Your Player Count"
                    // label="Game"
                    fullWidth
                    labelid="players-label"
                    InputLabelProps={{
                      className: classes.floatingLabelFocusStyle,
                    }}
                  />
                );
              }}
            />
            {/* <Select
              labelid="players-label"
              id="players"
              name="players"
              value={this.state.players}
              onChange={this.handlePlayersChange}
              // displayEmpty
              MenuProps={MenuProps}
            >
              {/* <MenuItem key="" value="">
              Any
              </MenuItem>
              {this.props.data.game.playerCounts
                ? this.props.data.game.playerCounts.map((count) => (
                    <MenuItem key={count} value={count}>
                      {count}
                    </MenuItem>
                  ))
                : ''}
            </Select> */}
          </FormControl>
          <FormControl className={classes.formControl}>
            {/* <InputLabel id="place-label">Your Finish</InputLabel> */}
            <Autocomplete
              // freeSolo
              autoHighlight
              // autoSelect
              blurOnSelect
              disableClearable={this.state.place == ''}
              id="place"
              name="place"
              value={this.state.place || null}
              onChange={this.handlePlaceChange}
              onHighlightChange={this.handlePlaceHighlightChange}
              // inputValue={this.state.playersInputValue}
              // onInputChange={(event, newInputValue) => this.setState({ playersInputValue: newInputValue })}
              options={this.state.validPlayerPlaces}
              fullWidth
              getOptionLabel={(count) => (count ? ordinal(count) : '')}
              disabled={!this.state.players}
              renderInput={(params) => {
                params.inputProps.onKeyDown = handlePlaceKeyDown;
                return (
                  <TextField
                    {...params}
                    label="Your Finish Place"
                    // placeholder="Your Player Count"
                    // label="Game"
                    fullWidth
                    labelid="place-label"
                    InputLabelProps={{
                      className: classes.floatingLabelFocusStyle,
                    }}
                  />
                );
              }}
            />
            {/* <Select
              labelid="place-label"
              id="place"
              name="place"
              value={this.state.place}
              onChange={this.handlePlaceChange}
              // input={<Input />}
              // displayEmpty
              MenuProps={MenuProps}
              disabled={this.state.players == ''}
            >
              {/* <MenuItem key="" value="">
                Any
              </MenuItem>
              {this.state.validPlayerPlaces.map((count) => (
                <MenuItem key={count} value={count}>
                  {ordinal(count)}
                </MenuItem>
              ))}
            </Select> */}
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

export default connect(mapStateToProps)(withStyles(styles)(withTheme(withRouter(Filters))));

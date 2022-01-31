import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import _ from 'lodash';
import ordinal from 'ordinal';
import { DebounceInput } from 'react-debounce-input';

import { withStyles, withTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';
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

const Filters = (props) => {
  const [score, setScore] = useState('');
  const [place, setPlace] = useState(null);
  const [players, setPlayers] = useState(null);
  const [validPlayerPlaces, setValidPlayerPlaces] = useState([]);
  const [playersHighlightValue, setPlayersHighlightValue] = useState('');
  const [placeHighlightValue, setPlaceHighlightValue] = useState('');

  let params = useParams();
  let navigate = useNavigate();

  const classes = props.classes;

  // Dropdowns changed
  useEffect(() => {
    if (score || place || players) {
      setHistory();
      sendFiltersUpdate();
    }
  }, [score, place, players]);

  // Players changed
  useEffect(() => {
    const validPlayerPlaces = getValidPlayerPlaces();

    if (place && validPlayerPlaces.indexOf(place) === -1) {
      setPlace('');
    }
    console.log(validPlayerPlaces);
    setValidPlayerPlaces(validPlayerPlaces);
  }, [players]);

  const handleScoreChange = (event) => {
    setScore(getIntFromParam(event.target.value));
  };

  const handlePlayersChange = (event, newPlayers) => {
    if (!newPlayers) {
      setTimeout(() => {
        document.activeElement.blur();
      }, 0);
    }
    setPlayers(newPlayers);
  };

  const handlePlayersHighlightChange = (event, option) => {
    setPlayersHighlightValue(option);
  };

  const getValidPlayerPlaces = () => {
    return props.data.game && players ? _.range(1, players + 1) : [];
  };

  const handlePlaceChange = (event, newPlace) => {
    if (!newPlace) {
      setTimeout(() => {
        document.activeElement.blur();
      }, 0);
    }
    setPlace(newPlace);
  };

  const handlePlaceHighlightChange = (event, option) => {
    setPlaceHighlightValue(option);
  };

  const setHistory = () => {
    const urlParams = [params.id, params.name, score || '-', players || '-', place || '-'];
    navigate(`/${urlParams.join('/')}`);
  };

  const setFiltersFromUrl = () => {
    setPlayers(getIntFromParam(params.players));
    setScore(getIntFromParam(params.score));
    setValidPlayerPlaces(getValidPlayerPlaces());
    setPlace(getIntFromParam(params.place));
    sendFiltersUpdate();
  };

  const getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
  };

  const sendFiltersUpdate = () => {
    props.handleChange({
      players: players,
      place: place,
      score: score,
    });
  };

  // componentDidMount
  useEffect(() => {
    setFiltersFromUrl();
  }, []);

  // componentDidUpdate game
  useEffect(() => {
    setPlayers(getIntFromParam(params.players));
    setScore(getIntFromParam(params.score));
    setValidPlayerPlaces(getValidPlayerPlaces());
    setPlace(getIntFromParam(params.place));
    sendFiltersUpdate();
    // if (props.data.game && props.data.game.id !== prevProps.data.game.id) {
    //   setState({ players: '', place: '', score: '' }, () => {
    //     sendFiltersUpdate();
    //   });
    // }
  }, [props.data.game]);

  const handlePlayersKeyDown = (event) => {
    switch (event.key) {
      case 'Tab': {
        if (playersHighlightValue) {
          handlePlayersChange(event, playersHighlightValue);
        }
        break;
      }
      default:
    }
  };

  const handlePlaceKeyDown = (event) => {
    switch (event.key) {
      case 'Tab': {
        if (placeHighlightValue) {
          handlePlaceChange(event, placeHighlightValue);
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
            value={score}
            style={{ maxWidth: 160 }}
            onChange={handleScoreChange}
            InputLabelProps={{
              className: classes.floatingLabelFocusStyle,
            }}
          />
        </FormControl>
        <span>{players == undefined}</span>
        <FormControl className={classes.formControl}>
          {/* <InputLabel id="players-label">Your Player Count</InputLabel> */}
          <Autocomplete
            // freeSolo
            autoHighlight
            // autoSelect
            blurOnSelect
            disableClearable={players == ''}
            id="players"
            // name="players"
            value={players || null}
            // inputValue={playersInputValue}
            onChange={handlePlayersChange}
            // onBlur={handlePlayersBlur}
            onHighlightChange={handlePlayersHighlightChange}
            options={props.data.game.playerCounts}
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
            value={players}
            onChange={handlePlayersChange}
            // displayEmpty
            MenuProps={MenuProps}
          >
            {/* <MenuItem key="" value="">
            Any
            </MenuItem>
            {props.data.game.playerCounts
              ? props.data.game.playerCounts.map((count) => (
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
            disableClearable={place == ''}
            id="place"
            name="place"
            value={place || null}
            onChange={handlePlaceChange}
            onHighlightChange={handlePlaceHighlightChange}
            // inputValue={playersInputValue}
            options={validPlayerPlaces}
            fullWidth
            getOptionLabel={(count) => (count ? ordinal(count) : '')}
            disabled={!players}
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
        </FormControl>
      </FormGroup>
    </Box>
  );
};

Filters.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps)(withStyles(styles)(withTheme(Filters)));

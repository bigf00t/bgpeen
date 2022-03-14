import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import _ from 'lodash';
import ordinal from 'ordinal';
import { DebounceInput } from 'react-debounce-input';

import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';

const styles = (theme) => ({
  root: {},
  select: {},
  textField: {},
  button: {
    marginTop: theme.spacing(1),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 180,
    height: 60,
  },
  selectEmpty: {},
  formGroup: {
    // margin: theme.spacing(2),
    // marginTop: theme.spacing(-2),
    justifyContent: 'center',
  },
  floatingLabelFocusStyle: {
    '&.Mui-focused': {
      color: theme.palette.text.primary,
    },
  },
});

const Filters = (props) => {
  const [score, setScore] = useState();
  const [place, setPlace] = useState();
  const [players, setPlayers] = useState();
  const [validPlayerPlaces, setValidPlayerPlaces] = useState([]);
  const [playersHighlightValue, setPlayersHighlightValue] = useState('');
  const [placeHighlightValue, setPlaceHighlightValue] = useState('');

  let params = useParams();
  let navigate = useNavigate();

  const classes = props.classes;

  // Dropdowns changed
  useEffect(() => {
    // console.log(params);
    // console.log(players);
    // console.log(!params.score);
    if (filtersChanged()) {
      updateHistory();
      // sendFiltersUpdate();
    }
    // else if (!params.score || score || players || place) {
    //   // sendFiltersUpdate();
    // }
  }, [score, place, players]);

  const filtersChanged = () => {
    // console.log(players);
    // console.log((score || '-') !== params.score);
    // console.log((players || '-') !== params.players);
    // console.log((place || '-') !== params.place);
    return (
      (score !== undefined && (score || '-') !== (parseInt(params.score) || '-')) ||
      (players !== undefined && (players || '-') !== (parseInt(params.players) || '-')) ||
      (place !== undefined && (place || '-') !== (parseInt(params.place) || '-'))
    );
  };

  // Players changed
  useEffect(() => {
    const validPlayerPlaces = getValidPlayerPlaces();

    if (place && validPlayerPlaces.indexOf(place) === -1) {
      setPlace('');
    }
    // console.log(validPlayerPlaces);
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

  const updateHistory = () => {
    var urlParams = [params.id, params.name];
    if (score || players || place) {
      urlParams = urlParams.concat([score || '-', players || '-', place || '-']);
    }
    // console.log('navigate: ' + `/${urlParams.join('/')}`);
    navigate(`/${urlParams.join('/')}`);
  };

  // const setFiltersFromUrl = () => {
  //   // if (params.score || params.players || params.place) {
  //   // console.log('setFiltersFromUrl');
  //   // console.log(params);
  //   setScore(getIntFromParam(params.score));
  //   setPlayers(getIntFromParam(params.players));
  //   setValidPlayerPlaces(getValidPlayerPlaces());
  //   setPlace(getIntFromParam(params.place));
  //   // }
  // };

  const getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
  };

  // const sendFiltersUpdate = () => {
  //   // console.log('sendFiltersUpdate');
  //   props.handleChange({
  //     players: players === '' ? null : players,
  //     place: place === '' ? null : place,
  //     score: score === '' ? null : score,
  //   });
  // };

  // componentDidMount
  useEffect(() => {
    // console.log(params);
    // setFiltersFromUrl();
    setScore(props.filters.score);
    setPlayers(props.filters.players);
    setValidPlayerPlaces(getValidPlayerPlaces());
    setPlace(props.filters.place);
  }, []);

  // // componentDidUpdate game
  // useEffect(() => {
  //   if (props.data.game) {
  //     setPlayers(getIntFromParam(params.players));
  //     setScore(getIntFromParam(params.score));
  //     setValidPlayerPlaces(getValidPlayerPlaces());
  //     setPlace(getIntFromParam(params.place));
  //     // sendFiltersUpdate();
  //     // if (props.data.game && props.data.game.id !== prevProps.data.game.id) {
  //     //   setState({ players: '', place: '', score: '' }, () => {
  //     //     sendFiltersUpdate();
  //     //   });
  //     // }
  //   }
  // }, [props.data.game]);

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
    <Box component="div" m={2} display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
      <Typography component="h5" variant="h5" align="center" mr={1}>
        How good are you?
      </Typography>
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
            style={{ maxWidth: 180 }}
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
            getOptionLabel={(count) => (count ? count.toString() : '')}
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
  filters: PropTypes.object,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps)(withStyles(styles)(withTheme(Filters)));

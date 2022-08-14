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
  root: {
    backgroundColor: '#282828',
    // 
    // margin: theme.spacing(0, -2),
  },
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
    if (filtersChanged()) {
      updateHistory();
    }
  }, [score, place, players]);

  const filtersChanged = () => {
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
    if (score || players) {
      urlParams = urlParams.concat([score || '-', players || '-', players ? place || '-' : '-']);
    }
    navigate(`/${urlParams.join('/')}`);
  };

  const getIntFromParam = (param) => {
    return param && !isNaN(param) ? parseInt(param) : '';
  };

  // componentDidMount
  useEffect(() => {
    setScore(props.filters.score);
    setPlayers(props.filters.players);
    setValidPlayerPlaces(getValidPlayerPlaces());
    setPlace(props.filters.place);
  }, []);

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
    <Box
      className={classes.root}
      component="div"
      display="flex"
      flexWrap="wrap"
      justifyContent="center"
      alignItems="center"
    >
      <Typography component="h5" variant="h5" align="center" m={1}>
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
          <Autocomplete
            autoHighlight
            blurOnSelect
            disableClearable={players == ''}
            id="players"
            value={players || null}
            onChange={handlePlayersChange}
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
                  fullWidth
                  labelid="players-label"
                  InputLabelProps={{
                    className: classes.floatingLabelFocusStyle,
                  }}
                />
              );
            }}
          />
        </FormControl>
        <FormControl className={classes.formControl}>
          <Autocomplete
            autoHighlight
            blurOnSelect
            disableClearable={place == ''}
            id="place"
            name="place"
            value={place || null}
            onChange={handlePlaceChange}
            onHighlightChange={handlePlaceHighlightChange}
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

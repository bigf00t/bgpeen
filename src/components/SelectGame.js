import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { collection, addDoc } from 'firebase/firestore';
import * as actions from '../actions';
import { db } from '../fire';

import { connect } from 'react-redux';

import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import Typography from '@mui/material/Typography';

import { getGameSlug } from '../utils';

const styles = (theme) => ({
  button: {
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(2),
  },
  formControl: {
    maxWidth: 330,
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

const SelectGame = (props) => {
  const [game, setGame] = useState(null);
  const [gameText, setGameText] = useState(null);
  const [added, setAdded] = useState(false);
  const [gameHighlightValue, setGameHighlightValue] = useState('');

  let navigate = useNavigate();

  const classes = props.classes;

  const handleGameHighlightChange = (event, option) => {
    setGameHighlightValue(option);
  };

  const handleGameTextChange = (event) => {
    if (!game) {
      setGameText(event.target.value);
    }
  };

  const handleGameBlur = () => {
    setGame(gameText);
    setAdded(false);
  };

  const handleGameKeyDown = (event) => {
    switch (event.key) {
      case 'Tab': {
        if (gameHighlightValue) {
          handleGameChange(event, gameHighlightValue);
        }
        break;
      }
      default:
    }
  };

  const handleGameChange = (event, newGame) => {
    setGame(newGame);
    if (newGame && newGame.id) {
      navigate(`/${newGame.id}/${getGameSlug(newGame)}`);
    }
  };

  const handleGameInputChange = (event, newInputValue) => {
    if (newInputValue === '') {
      setGameText('');
    }
  };

  const handleAddClick = async () => {
    // TODO: Should be action?
    await addDoc(collection(db, 'searches'), {
      name: gameText,
    });

    setGame(null);
    setGameText(null);
    setAdded(true);
  };

  // componentDidMount
  useEffect(() => {
    if (props.data.gameNames.length == 0) {
      props.loadGameNames();
    }
  }, []);

  // componentDidUpdate game
  useEffect(() => {
    setAdded(false);
  }, [props.location]);

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
            blurOnSelect
            id="game"
            name="game"
            value={game}
            onChange={handleGameChange}
            onInputChange={handleGameInputChange}
            onHighlightChange={handleGameHighlightChange}
            onBlur={handleGameBlur}
            options={props.data.gameNames}
            fullWidth
            getOptionLabel={(option) => option.name || option}
            renderInput={(params) => {
              params.inputProps.onKeyDown = handleGameKeyDown;
              return (
                <TextField
                  {...params}
                  placeholder="Start typing..."
                  onChange={handleGameTextChange}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              );
            }}
          />
        </FormControl>
        {!game || game.id ? (
          ''
        ) : (
          <FormControl className={classes.formControl}>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              disabled={added}
              onClick={handleAddClick}
            >
              Add Game
            </Button>
          </FormControl>
        )}
      </FormGroup>
      {added ? (
        <Box component="div" className={classes.message}>
          Game has been added to the queue, but it could take up to 10 minutes for score data to be available. <br />
          Please wait and refresh in a little while. Thanks!
        </Box>
      ) : (
        ''
      )}
    </Box>
  );
};

SelectGame.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  location: PropTypes.object,
  loadGameNames: PropTypes.func,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(SelectGame)));

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
  const [game, setGame] = useState('');
  const [gameText, setGameText] = useState('');
  const [addedGame, setAddedGame] = useState('');
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
    setAddedGame('');
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
    const blacklist = ['munchkin', 'fluxx', 'cards against humanity'];
    if (blacklist.some((b) => gameText.toLowerCase().includes(b))) {
      alert('Never in a million years.');
      return;
    }
    await addDoc(collection(db, 'searches'), {
      term: gameText,
      completed: false,
      date: new Date(),
    });

    setAddedGame(gameText);
    setGame('');
    setGameText('');
  };

  // componentDidMount
  useEffect(() => {
    if (props.data.games.length == 0) {
      props.loadGames();
    }
  }, []);

  // componentDidUpdate game
  useEffect(() => {
    setAddedGame('');
  }, [props.location]);

  return (
    <Box component="div">
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
            options={props.data.games}
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
        {gameText && !gameHighlightValue && !addedGame ? (
          <FormControl className={classes.formControl}>
            <Button className={classes.button} variant="contained" color="primary" onClick={handleAddClick}>
              Add Game
            </Button>
          </FormControl>
        ) : (
          ''
        )}
      </FormGroup>
      {gameText && !gameHighlightValue && !addedGame ? (
        <Box component="div" className={classes.message}>
          No games were found matching your search term. <br />
          Enter the exact name (including punctuation) or BGG ID of a game and press Add Game.
        </Box>
      ) : (
        ''
      )}
      {addedGame ? (
        <Box component="div" className={classes.message}>
          {addedGame} has been added to the queue, but it could take up to 10 minutes for the data to be available.{' '}
          <br />
          Please wait and refresh the site in a little while. Thanks!
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
  loadGames: PropTypes.func,
  handleChange: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(SelectGame)));

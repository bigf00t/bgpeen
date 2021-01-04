import React, { Component } from 'react';

import MeasureResult from './MeasureResult';
import GameSelect from './GameSelect';
import {connect} from 'react-redux';
import _ from 'lodash';
import * as actions from '../actions';
import { withStyles } from '@material-ui/core/styles';

import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import { relative } from 'path';
import { Checkbox } from '@material-ui/core';

const styles = theme => ({
    root: {
        position: 'relative',
        margin: theme.spacing(10),
        textAlign: 'center',
        with: '100%'
    },
    select: {
        
    },
    textField: {

    },
    button: {
        marginTop: theme.spacing(1),
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 150,
        height: 60
    },
    selectEmpty: {
        
    },
});

class MeasureForm extends Component {
    constructor(props) {    
        super(props);
        this.state = {
            game: {},
            stats: {},
            id: null,
            score: "",
            open: false,
            players: "",
            winner: false
        };
    }

    getGames = () => {
        return _.sortBy(_.map(this.props.data, (game, id) => {
            return {
                id: id, 
                ...game
            };
          }), ['name'], ['desc']);
    }

    toggle = () => {
        this.setState({open: !this.state.open});
    }

    measure = () => {
        // Does this game already exist in our database
        if (!this.state.game.id) {
            // If not, let's add it
            fetch("http://localhost:5001/bgpeen-1fc16/us-central1/addGame", {
            //fetch("https://us-central1-bgpeen-1fc16.cloudfunctions.net/addGame", {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    // 'Content-Type': 'application/json',
                },
                body: this.state.game.name
            })
            .then((response) => {
                // console.log(response);
                return response.json();
            })
            .then((json) => {
                // console.log(json);
                this.state.game = json;
                this.toggle();
                // TODO: Maybe don't call this everytime?
                // this.props.fetchGames();
            })
            .catch((error) => {
                console.log("Request failed", error);
            });
        } else {
            // If yes, let's look for new plays
            fetch("http://localhost:5001/bgpeen-1fc16/us-central1/getGameStats", {
            // fetch("http://localhost:5001/bgpeen-1fc16/us-central1/markForUpdate", {
            //fetch("https://us-central1-bgpeen-1fc16.cloudfunctions.net/addGame", {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game: this.state.game.id,
                    count: this.state.players,
                    winner: this.state.winner
                })
            })
            .then((response) => {
                // console.log(response);
                return response.json();
            })
            .then((json) => {
                // console.log(json);
                this.state.stats = json;
                console.log(this.state.stats);
            })
            .catch((error) => {
                console.log("Request failed", error);
            });
            this.toggle();
        }
    }

    handleChange = (event) => {
        this.setState({[event.target.name]: event.target.value});
    }

    handleCheckedChange = (event) => {
        this.setState({[event.target.name]: event.target.checked});
    }

    handleGameChange = (newGame) => {
        if (newGame) {
            this.setState({game: newGame});
        }
    }

    render() {
        const classes = this.props.classes;

        return (
                <form className={classes.root}>
                        <FormControl variant="outlined" className={classes.formControl}>
                            {/* <InputLabel 
                                htmlFor="game"
                                className={classes.inputLabel}>Game</InputLabel>
                            <Select 
                                className={classes.select}
                                value={this.state.game}
                                onChange={this.handleChange}
                                input={<OutlinedInput labelWidth={20} name="game" id="game" />}>
                                {this.renderGames()}
                            </Select> */}
                            <GameSelect games={this.getGames()} handleGameChange={this.handleGameChange} />
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <InputLabel 
                                htmlFor="players"
                                className={classes.inputLabel}>Players</InputLabel>
                            <Select 
                                className={classes.select}
                                id="players"
                                name="players"
                                value={this.state.players}
                                onChange={this.handleChange}>
                                    <MenuItem value="1">1</MenuItem>
                                    <MenuItem value="2">2</MenuItem>
                                    <MenuItem value="3">3</MenuItem>
                                    <MenuItem value="4">4</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel className={classes.formControl}
                            control={
                            <Checkbox
                                checked={this.state.winner}
                                onChange={this.handleCheckedChange}
                                id="winner"
                                name="winner"
                                color="primary"
                            />
                            }
                            label="Winning Scores Only"
                            labelPlacement="start"
                        />
                        <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="score" 
                                name="score" 
                                label="Your Score"
                                value={this.state.score}
                                onChange={this.handleChange}
                                // variant="outlined" 
                                />
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <Button 
                                className={classes.button}
                                variant="contained" 
                                color="primary" 
                                onClick={this.measure}>
                                Measure!
                            </Button>
                        </FormControl>
                    <MeasureResult 
                        open={this.state.open} 
                        game={this.state.game} 
                        stats={this.state.stats} 
                        score={this.state.score}
                        handleClose={this.toggle}
                    />
                </form>
        );
    }

    componentWillMount() {
      this.props.fetchGames();
    }
}

const mapStateToProps = ({data}) => {
  return { data }
}

export default connect(mapStateToProps, actions)(withStyles(styles)(MeasureForm));
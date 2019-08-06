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
import FormControl from '@material-ui/core/FormControl';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import { relative } from 'path';

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
            id: null,
            score: "",
            open: false,
            average: 0
        };
    }

    renderGames = () => {
        return _.map(this.props.data, (game, id) => {
            return <MenuItem key={id} value={game.name}>{game.name}</MenuItem >;
          });
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
        if (!this.state.game.id) {
            // fetch("http://localhost:5001/bgpeen-1fc16/us-central1/addGame", {
            fetch("https://us-central1-bgpeen-1fc16.cloudfunctions.net/addGame", {
                method: "POST",
                headers: {
                    // 'Access-Control-Allow-Origin': '*',
                    // 'Content-Type': 'application/json'
                },
                body: this.state.game.name
            })
            .then(function(responseBody){
                // TODO
                console.log(responseBody);
            })
            .catch(function(error) {
                console.log("Request failed", error);
            });
        } else {
            this.toggle();
        }
    }

    handleChange = (event) => {
        this.setState({[event.target.name]: event.target.value});
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
                        <TextField 
                            className={classes.textField}
                            id="score" 
                            name="score" 
                            label="Score"
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
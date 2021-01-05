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
        margin: theme.spacing(4),
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
    formGroup: {
        marginBottom: theme.spacing(4),
        justifyContent: 'center',
    }
});

class MeasureForm extends Component {
    constructor(props) {    
        super(props);
        // this.state = {
        //     game: {},
        //     id: null,
        //     score: "",
        //     open: false,
        //     players: "",
        //     position: "",
        //     average: 0,
        //     graphData: {}
        // };
        this.state = {
            game: {},
            id: null,
            score: "50",
            open: false,
            players: "4",
            position: "1",
            average: 0,
            percentile: 0,
            graphData: {}
        };
    }

    getGames = () => {
        return _.sortBy(this.props.data, ['name'], ['desc']);
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
                // this.toggle();
                // TODO: Maybe don't call this everytime?
                // this.props.fetchGames();
            })
            .catch((error) => {
                console.log("Request failed", error);
            });
        } else {
            // // If yes, let's look for new plays
            // fetch("http://localhost:5001/bgpeen-1fc16/us-central1/getGameStats", {
            // // fetch("http://localhost:5001/bgpeen-1fc16/us-central1/markForUpdate", {
            // //fetch("https://us-central1-bgpeen-1fc16.cloudfunctions.net/addGame", {
            //     method: 'POST',
            //     mode: 'cors',
            //     headers: {
            //         'Access-Control-Allow-Origin': '*',
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         game: this.state.game.id,
            //         count: this.state.players,
            //         winner: this.state.winner
            //     })
            // })
            // .then((response) => {
            //     // console.log(response);
            //     return response.json();
            // })
            // .then((json) => {
            //     // console.log(json);
            //     this.state.stats = json;
            //     console.log(this.state.stats);
            // })
            // .catch((error) => {
            //     console.log("Request failed", error);
            // });
        }

        this.setState({average: this.getAverage()});
        this.setState({percentile: this.getPercentile()});
        this.setState({graphData: this.getGraphData()});
        this.setState({open: true});
    }

    handleChange = (event) => {
        this.setState({[event.target.name]: event.target.value});
    }

    handleGameChange = (newGame) => {
        if (newGame) {
            this.setState({game: newGame});
        }
    }

    getExplodedScores = () => {
        // TODO: Extend to work with multiple players and positions
        // TODO: Don't re-evaluate as often
        var explodedScores = 
        _.chain(this.state.game.scores)
        .filter(score => {
            return score.playerCount == this.state.players && score.playerPosition == this.state.position;
        })
        .reduce((result, score) => {
            return _.merge(result, score.scores);
        }, {})
        .reduce((result, count, score) => {
            result.push(_.fill(Array(count), parseInt(score)));
            return result;
        }, [])
        .flatten()
        .value();

        console.log(explodedScores);

        return explodedScores;
    }

    getAverage = () => {
        var explodedScores = this.getExplodedScores();

        if (explodedScores.length == 0) {
            return null;
        }

        return parseInt(_.mean(explodedScores));
    }

    getPercentile = () => {
        if (! this.state.score) {
            return null;
        }

        var score = this.state.score;
        var explodedScores = this.getExplodedScores();

        if (explodedScores.length == 0) {
            return null;
        }

        // Based on https://www.30secondsofcode.org/js/s/percentile
        var percentile = (100 * _.reduce(explodedScores, 
            (result, value) => result + (value < score ? 1 : 0) + (value === score ? 0.5 : 0), 0)
            ) / explodedScores.length;

        return parseInt(percentile);
    }

    getGraphData = () => {
        // TODO: Extend to work with multiple players and positions
        // TODO: Don't re-evaluate as often
        var mergedScores = 
        _.chain(this.state.game.scores)
        .filter(score => {
            return score.playerCount == this.state.players && score.playerPosition == this.state.position;
        })
        .reduce((result, score) => {
            return _.merge(result, score.scores);
        }, {})
        .value();

        console.log(mergedScores);
        console.log(_.keys(mergedScores));
        if (_.keys(mergedScores).length == 0) {
            return null;
        }

        // console.log(mergedScores);
        // console.log(_.keys(mergedScores));
        // 'rgba(255, 99, 132, 1)'
        
        if (this.state.score) {
            // Add our score if it doesn't exist
            mergedScores[this.state.score] = mergedScores[this.state.score] ? mergedScores[this.state.score] : 1;
        }

        var labels = _.keys(mergedScores);
        var allData = _.values(mergedScores);
        
        if (this.state.score) {
            // Add our score if it doesn't exist
            allData[labels.indexOf(this.state.score)] = 0;
            var yourData = _.fill(Array(labels.length), 0);
            yourData[labels.indexOf(this.state.score)] = mergedScores[this.state.score];
        }

        var graphData = {
            labels: labels,
            datasets: [
            {
                data: allData,
                label: ["All Scores"],
                backgroundColor: 'rgba(63, 81, 181, 0.5)',
                borderColor: 'rgba(63, 81, 181, 1)',
                borderWidth: 1,
            },
            {
                data: yourData,
                label: ["Your Score"],
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
            },
        ]
        };

        // console.log(graphData);

        return graphData;
    }

    render() {
        const classes = this.props.classes;

        return (
                <form className={classes.root}>
                    <FormGroup row className={classes.formGroup}>
                        <FormControl variant="outlined" className={classes.formControl}>
                            <GameSelect games={this.getGames()} handleGameChange={this.handleGameChange} />
                        </FormControl>
                        {/* <FormControl className={classes.formControl}>
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
                        <FormControl className={classes.formControl}>
                            <InputLabel 
                                htmlFor="position"
                                className={classes.inputLabel}>Your Position</InputLabel>
                            <Select 
                                className={classes.select}
                                id="position"
                                name="position"
                                value={this.state.position}
                                onChange={this.handleChange}>
                                    <MenuItem value="1">1st</MenuItem>
                                    <MenuItem value="2">2nd</MenuItem>
                                    <MenuItem value="3">3rd</MenuItem>
                                    <MenuItem value="4">4th</MenuItem>
                            </Select>
                        </FormControl> */}
                        <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="players" 
                                name="players" 
                                label="Player Count"
                                value={this.state.players}
                                onChange={this.handleChange}
                                // variant="outlined" 
                                />
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="position" 
                                name="position" 
                                label="Your Position"
                                value={this.state.position}
                                onChange={this.handleChange}
                                // variant="outlined" 
                                />
                        </FormControl>
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
                    </FormGroup>
                    <MeasureResult 
                        open={this.state.open}
                        game={this.state.game}
                        score={this.state.score}
                        position={this.state.position}
                        players={this.state.players}
                        average={this.state.average}
                        percentile={this.state.percentile}
                        graphData={this.state.graphData}
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
import React, { Component, Fragment } from 'react';

import MeasureResult from './MeasureResult';
import GameSelect from './GameSelect';
import AlertDialog from './AlertDialog';
import * as actions from '../actions';

import {connect} from 'react-redux';
import _ from 'lodash';

import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemText from '@material-ui/core/ListItemText';
import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';

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

const allPlayerCounts = [1, 2, 3, 4];

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

class MeasureForm extends Component {
    constructor(props) {  
        super(props);
        this.state = {
            game: {},
            gameId: {},
            score: "",
            place: "1",
            players: [2],
            resultOpen: true,
            average: 0,
            percentile: 0,
            graphData: {},
            errorOpen: false,
            errorTitle: "",
            errorMessage: "",
            scoreCount: 0,
            loading: true
        };
    }

    handleChange = (event) => {
        this.setState({[event.target.name]: event.target.value}, () => {
            this.setResults();
        });
    }

    showError = (title, message) => {
        this.setState({errorTitle: title});
        this.setState({errorMessage: message});
        this.setErrorOpen(true);
    }

    setErrorOpen = (open) => {
        this.setState({errorOpen: open});
    }

    getFilteredScores = () => {
        // TODO: Extend to work with multiple players and positions
        return _(this.state.game.scoreGroups)
            .filter(group => {
                return this.state.players.indexOf(group.playerCount) > -1 && group.playerPosition == this.state.place;
            })
            .reduce((result, group) => {
                return _.mergeWith(result, group.scores, (val1, val2) => {
                    return (val1 || 0) + val2;
                });
            }, {});
    }

    setResults = () => {
        // TODO: Extend to work with multiple players and positions
        // TODO: Don't re-evaluate as often
        var mergedScores = this.getFilteredScores();

        if (_.keys(mergedScores).length == 0) {
            return null;
        }

        var scoreData = _.reduce(mergedScores, (r, v, k) => { 
            r.push({x: parseInt(k), y: v});
            return r;
        }, []);

        // console.log(result);
        // console.log(data);

        var graphData = {
            datasets: [
                {
                    data: scoreData,
                    label: ["Score"],
                    // color: 'rgba(63, 81, 181, 1)',
                    backgroundColor: 'rgba(63, 81, 181, 0.25)',
                    borderColor: 'rgba(63, 81, 181, 0.5)',
                    pointBackgroundColor: 'rgba(63, 81, 181, 1)',
                    // borderWidth: 1,
                    fill: true,
                    // showLine: false,
                    // lineWidth: 0.5,
                    spanGaps: false,
                    lineTension: 0,
                    // cubicInterpolationMode: 'monotone',
                    // steppedLine: true,
                    // trendlineLinear: {
                    //     style: "rgba(255,105,180, .8)",
                    //     lineStyle: "solid",
                    //     width: 2
                    // }
                },
            ]
        };
        
        var explodedScores = _.chain(mergedScores)
        .reduce((result, count, score) => {
            result.push(_.fill(Array(count), parseInt(score)));
            return result;
        }, [])
        .flatten()
        .value();
        
        this.setState({average: this.getAverage(explodedScores)});
        this.setState({percentile: this.getPercentile(explodedScores)});
        this.setState({scoreCount: explodedScores.length});

        this.setState({graphData: graphData});
    }

    getAverage = (scores) => {
        return parseInt(_.mean(scores));
    }

    getPercentile = (scores) => {
        if (! this.state.score) {
            return null;
        }

        var score = this.state.score;

        // Based on https://www.30secondsofcode.org/js/s/percentile
        var percentile = (100 * _.reduce(scores, 
            (result, value) => result + (value < score ? 1 : 0) + (value === score ? 0.5 : 0), 0)
            ) / scores.length;

        return parseInt(percentile);
    }

    getPlayerCountsInData = () => {
        return _(this.state.game.scoreGroups)
        .map((group) => {
            return group.playerCount;
        })
        .uniq()
        .sort()
        .value();
    }

    componentDidMount() {
        this.props.fetchGames().then(() => {
            if (this.props.data) {
                this.setState({game: this.props.data[0]}, () => {
                    this.setResults();
                });
            }
        });
    }

    render() {
        const classes = this.props.classes;

        return (
                <form className={classes.root} onSubmit={this.handleSubmit}>
                    <FormGroup row className={classes.formGroup}>
                        {/* <FormControl variant="outlined" className={classes.formControl}>
                            <GameSelect game={this.state.game} data={this.getSortedGames()} handleGameChange={this.handleGameChange} />
                        </FormControl> */}
                        <FormControl className={classes.formControl}>
                            <InputLabel id="game-label">Game</InputLabel>
                            <Select
                                labelid="game-label"
                                id="game"
                                name="game"
                                value={this.state.game}
                                onChange={this.handleChange}
                            >
                            {this.props.data.length > 0 ? this.props.data.map((game) => (
                                <MenuItem value={game} key={game.id}>{game.name}</MenuItem>
                            )) : ''}
                            </Select>
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="score" 
                                name="score" 
                                label="Your Score"
                                value={this.state.score}
                                onChange={this.handleChange}
                                />
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="place" 
                                name="place" 
                                label="Your Place"
                                value={this.state.place}
                                onChange={this.handleChange}
                                />
                        </FormControl>
                        {/* <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="players" 
                                name="players" 
                                label="Number of Players"
                                value={this.state.players}
                                onChange={this.handleChange}
                                />
                        </FormControl> */}
                        <FormControl className={classes.formControl}>
                            <InputLabel id="players-label">Players</InputLabel>
                            <Select
                                labelid="players-label"
                                id="players"
                                name="players" 
                                multiple
                                value={this.state.players}
                                onChange={this.handleChange}
                                input={<Input />}
                                renderValue={(selected) => selected.join(', ')}
                                MenuProps={MenuProps}
                            >
                            {this.getPlayerCountsInData().map((count) => (
                                <MenuItem key={count} value={count}>
                                    <Checkbox checked={this.state.players.indexOf(count) > -1} />
                                    <ListItemText primary={count} />
                                </MenuItem>
                            ))}
                            </Select>
                        </FormControl>
                        {/* <FormControl className={classes.formControl}>
                            <Button 
                                className={classes.button}
                                variant="contained" 
                                color="primary" 
                                type="submit">
                                Measure!
                            </Button>
                        </FormControl> */}
                    </FormGroup>
                    <MeasureResult 
                        open={this.state.resultOpen}
                        gameName={this.state.game?.name}
                        score={this.state.score}
                        place={this.state.place}
                        players={this.state.players}
                        average={this.state.average}
                        percentile={this.state.percentile}
                        graphData={this.state.graphData}
                        scoreCount={this.state.scoreCount}
                    />
                    <AlertDialog 
                        title={this.state.errorTitle}
                        content={this.state.errorMessage}
                        open={this.state.errorOpen}
                        setOpen={this.setErrorOpen}
                    />
                </form>
        );
    }
}

const mapStateToProps = ({data}) => {
  return { data }
}

export default connect(mapStateToProps, actions)(withStyles(styles)(MeasureForm));
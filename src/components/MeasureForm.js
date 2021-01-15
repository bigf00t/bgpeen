import React, { Component } from 'react';

import MeasureResult from './MeasureResult';
import AlertDialog from './AlertDialog';
import * as actions from '../actions';

import {connect} from 'react-redux';
import _ from 'lodash';
import ordinal from 'ordinal';
import {DebounceInput} from 'react-debounce-input';

import { withStyles, withTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';

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
            place: "",
            players: "",
            resultOpen: true,
            errorOpen: false,
            errorTitle: "",
            errorMessage: "",
            validPlayerPlaces: [],
            result: {},
            graphData: []
        };
    }

    handleScoreChange = (event) => {
        this.setState({[event.target.name]: event.target.value}, () => {
            this.setPercentile();
        });
    }

    handlePlayersChange = (event) => {
        this.setState({[event.target.name]: event.target.value}, () => {
            var validPlayerPlaces = this.getValidPlayerPlaces();

            if (this.state.place !== "" && validPlayerPlaces.indexOf(this.state.place) === -1) {
                this.setState({place: ""}, () => {
                    this.setResult();
                });
            } else {
                this.setResult();
            }

            this.setState({validPlayerPlaces: validPlayerPlaces});
        });
    }

    getValidPlayerPlaces = () => {
        return this.state.game && this.state.players !== "" ? _.range(1, this.state.players + 1) : [];
    }

    handlePlaceChange = (event) => {
        this.setState({[event.target.name]: event.target.value}, () => {
            this.setResult();
        });
    }
    
    // TODO: Must be a better way to do this
    handleGameChange = (event) => {
        this.setState({score: ""});
        this.setState({[event.target.name]: event.target.value}, () => {
            this.setState({players: ""}, () => {
                this.setState({place: ""}, () => {
                    this.getGameAndSetResults(this.state.game.id);
                });
            });
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

    setPercentile = () => {
        if (this.state.score) {
            this.setState({percentile: this.getPercentile(this.state.result.scores, this.state.score)});
        }
    }

    getPercentile = (scores, score) => {
        // Based on https://www.30secondsofcode.org/js/s/percentile
        var percentile = (_.reduce(scores, 
            (result, c, s) => result + (parseInt(s) < score ? c : 0) + (parseInt(s) === score ? (score / 0.5) : 0), 0)
            * 100) / _.sum(_.values(scores));
        return parseInt(percentile);
    }

    setResult = () => {
        var result = this.state.game ? _.find(this.state.game.results, result => {
                return (this.state.players === (result.playerCount || "")) && (this.state.place === (result.playerPlace || ""));
            }) : [];

        this.setState({result: result}, () => {
            this.setPercentile();
            this.setGraphData();
        });
    }

    setGraphData = () => {
        if (!this.state.result) {
            return
        }

        var graphPoints =_.reduce(this.state.result.scores, (points, count, score) => { 
            return points.concat([{x: parseInt(score), y: count}]);
        }, []);

        var graphData = {
            datasets: [
                {
                    data: graphPoints,
                    label: ["Scores"],
                    // color: 'rgba(63, 81, 181, 1)',
                    // backgroundColor: 'rgba(63, 81, 181, 0.25)',
                    // borderColor: 'rgba(63, 81, 181, 0.5)',
                    // pointBackgroundColor: 'rgba(63, 81, 181, 1)',
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
        this.setState({graphData: graphData});
    }

    getGameAndSetResults = (gameId) => {
        var loadedGame = _.find(this.props.data.games, (game) => game.id === gameId);
        if (loadedGame.results) {
            this.setState({game: loadedGame}, () => this.setResult());
        } else {
            this.props.fetchGame(gameId).then(() => {
                // console.log(this.props.data.games);
                loadedGame = _.find(this.props.data.games, (game) => game.id === gameId);
                this.setState({game: loadedGame}, () => this.setResult());
            });
        }
    };

    componentDidMount() {
        this.props.fetchGames().then(() => {
            if (this.props.data.games) {
                this.getGameAndSetResults(this.props.data.games[0].id);
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
                            onChange={this.handleGameChange}
                        >
                        {this.props.data.games.length > 0 ? this.props.data.games.map((game) => (
                            <MenuItem value={game} key={game.id}>{game.name}</MenuItem>
                        )) : ''}
                        </Select>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="players-label" shrink={true}>Players</InputLabel>
                        <Select
                            labelid="players-label"
                            id="players"
                            name="players"
                            // multiple
                            value={this.state.players}
                            onChange={this.handlePlayersChange}
                            displayEmpty
                            MenuProps={MenuProps}
                        >
                        <MenuItem key="" value="">Any</MenuItem>
                        {this.state.game.playerCounts ? this.state.game.playerCounts.map((count) => (
                            <MenuItem key={count} value={count}>{count}</MenuItem>
                        )) : ""}
                        </Select>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <DebounceInput
                            element={TextField}
                            debounceTimeout={300}
                            className={classes.textField}
                            id="score" 
                            name="score" 
                            label="Your Score"
                            value={this.state.score}
                            onChange={this.handleScoreChange} />
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="place-label" shrink={true}>Place</InputLabel>
                        <Select
                            labelid="place-label"
                            id="place"
                            name="place" 
                            value={this.state.place}
                            onChange={this.handlePlaceChange}
                            input={<Input />}
                            displayEmpty
                            MenuProps={MenuProps}
                        >
                            <MenuItem key="" value="">Any</MenuItem>
                        {this.state.validPlayerPlaces.map((count) => (
                            <MenuItem key={count} value={count}>{ordinal(count)}</MenuItem>
                        ))}
                        </Select>
                    </FormControl>
                </FormGroup>
                <MeasureResult 
                    open={this.state.resultOpen}
                    gameName={this.state.game?.name}
                    score={this.state.score}
                    place={this.state.place}
                    players={this.state.players}
                    result={this.state.result}
                    graphData={this.state.graphData}
                    percentile={this.state.percentile}
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

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(MeasureForm)));
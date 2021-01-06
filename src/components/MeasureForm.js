import React, { Component, Fragment } from 'react';

import MeasureResult from './MeasureResult';
import GameSelect from './GameSelect';
import {connect} from 'react-redux';
import _ from 'lodash';
import * as actions from '../actions';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import AlertDialog from './AlertDialog';

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
        this.state = {
            game: {},
            score: "",
            resultOpen: false,
            players: "",
            position: "",
            average: 0,
            percentile: 0,
            graphData: {},
            errorOpen: false,
            errorTitle: "",
            errorMessage: "",
            scoreCount: 0,
        };
    }

    getGames = () => {
        return _.sortBy(this.props.data, ['name'], ['desc']);
    }

    handleSubmit = (e) => {
        e.preventDefault();
        // Does this game already exist in our database
        if (!this.state.game.name) {
            this.showError("Um", "Are you even trying?");
        } else if (!this.state.game.id) {
            // TODO: Consider adding to newgames?
            this.showError("Oops!", <Fragment>Sorry dawg, I don't have any stats for <strong>{this.state.game.name}</strong>. I've added it to the list, though, so check back soon!</Fragment>);
        } else {
            // TODO: Consider flagging for update?
            // TODO: Pull into function
            this.setState({graphData: this.getGraphData()});
            this.setState({resultOpen: true});
            this.setStats();
        }
    }

    handleChange = (event) => {
        this.setState({resultOpen: false});
        this.setState({[event.target.name]: event.target.value});
    }

    handleGameChange = (newGame) => {
        if (newGame) {
            this.setState({resultOpen: false});
            this.setState({game: newGame});
        }
    }

    showError = (title, message) => {
        this.setState({errorTitle: title});
        this.setState({errorMessage: message});
        this.setErrorOpen(true);
    }

    setErrorOpen = (open) => {
        this.setState({errorOpen: open});
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

        return explodedScores;
    }

    setStats = () => {
        var scores = this.getExplodedScores();

        if (scores.length == 0) {
            return;
        }
        
        this.setState({average: this.getAverage(scores)});
        this.setState({percentile: this.getPercentile(scores)});
        this.setState({scoreCount: scores.length});
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

        if (_.keys(mergedScores).length == 0) {
            return null;
        }
        
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
                    label: ["Scores"],
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

        return graphData;
    }

    render() {
        const classes = this.props.classes;

        return (
                <form className={classes.root} onSubmit={this.handleSubmit}>
                    <FormGroup row className={classes.formGroup}>
                        <FormControl variant="outlined" className={classes.formControl}>
                            <GameSelect games={this.getGames()} handleGameChange={this.handleGameChange} />
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
                                id="position" 
                                name="position" 
                                label="Your Place"
                                value={this.state.position}
                                onChange={this.handleChange}
                                />
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <TextField 
                                className={classes.textField}
                                id="players" 
                                name="players" 
                                label="Number of Players"
                                value={this.state.players}
                                onChange={this.handleChange}
                                />
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <Button 
                                className={classes.button}
                                variant="contained" 
                                color="primary" 
                                type="submit">
                                Measure!
                            </Button>
                        </FormControl>
                    </FormGroup>
                    <MeasureResult 
                        open={this.state.resultOpen}
                        gameName={this.state.game.name}
                        score={this.state.score}
                        position={this.state.position}
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

    componentWillMount() {
      this.props.fetchGames();
    }
}

const mapStateToProps = ({data}) => {
  return { data }
}

export default connect(mapStateToProps, actions)(withStyles(styles)(MeasureForm));
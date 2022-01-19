import React, { Component } from 'react';

import * as actions from '../actions';

import { connect } from 'react-redux';
import _ from 'lodash';

import { withStyles, withTheme } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import PropTypes from 'prop-types';
import { withRouter, Link } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardMedia from '@material-ui/core/CardMedia';

import { getGameSlug } from '../utils';

const styles = (theme) => ({
  card: {
    margin: theme.spacing(1),
  },
});

class PopularGames extends Component {
  constructor(props) {
    super(props);
    this.state = {
      popularGames: null,
    };
  }

  componentDidMount() {
    this.props.loadGames().then(() => {
      var popularGames = _.orderBy(this.props.data.games, 'popularity', 'desc');
      this.setState({ popularGames: _.take(popularGames, 10) });
    });
  }

  render() {
    const classes = this.props.classes;

    return (
      <Box component="div">
        {this.state.popularGames ? (
          <Box component="div" mt={5}>
            <Typography variant="h4" component="h4" align="center">
              Popular Games
            </Typography>
            <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" width={1}>
              {this.state.popularGames.map((game) => (
                <Card key={game.id} className={classes.card}>
                  <CardActionArea
                    component={Link}
                    to={`/${game.id}/${getGameSlug(game)}`}
                    title={`${game.name}-${game.popularity}`}
                  >
                    <CardMedia component="img" image={game.thumbnail} alt={game.name} />
                    <Box
                      sx={{
                        position: 'absolute',
                        height: '100%',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        bgcolor: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        padding: '10px',
                        textAlign: 'center',
                        opacity: 0,
                        transition: '0.3s',
                        '&:hover': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          padding: '10px',
                        }}
                      >
                        <Typography variant="body2">Scores</Typography>
                        <Typography variant="h5">{game.totalScores}</Typography>
                      </Box>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          padding: '10px',
                        }}
                      >
                        <Typography variant="body2">Average</Typography>
                        <Typography variant="h5">{game.mean}</Typography>
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Box>
        ) : (
          ''
        )}
      </Box>
    );
  }
}

PopularGames.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  loadGames: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(withRouter(PopularGames))));

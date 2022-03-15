import React, { useEffect } from 'react';

import * as actions from '../actions';

import { connect } from 'react-redux';

import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardMedia from '@mui/material/CardMedia';

import { getGameSlug } from '../utils';

const styles = (theme) => ({
  card: {
    margin: theme.spacing(1),
  },
});

const PopularGames = (props) => {
  const classes = props.classes;

  // componentDidMount
  useEffect(() => {
    if (props.data.popularGames.length == 0) {
      props.loadPopularGames();
    }
  }, []);

  if (props.data.popularGames.length === 0) {
    return <div />;
  }

  return (
    <Box component="div">
      <Box component="div" mt={5}>
        <Typography variant="h4" component="h4" align="center">
          Most Popular Games
        </Typography>
        <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" width={1}>
          {props.data.popularGames.map((game) => (
            <Card key={game.id} className={classes.card}>
              <CardActionArea
                component={Link}
                to={`/${game.id}/${getGameSlug(game)}`}
                title={`${game.name} - ${game.popularity}`}
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
    </Box>
  );
};

PopularGames.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  loadPopularGames: PropTypes.func,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(PopularGames)));

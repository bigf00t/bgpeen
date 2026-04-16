import React, { useEffect } from 'react';

import * as actions from '../actions';

import { connect } from 'react-redux';

import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardMedia from '@mui/material/CardMedia';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';

import { getGameSlug } from '../utils';

const TopGames = (props) => {
  useEffect(() => {
    if (props.topGames.length === 0) {
      props.loadTopGames(props.field);
    }
  }, []);

  const handleMouseEnter = (gameId) => {
    if (!props.loadedGames[gameId]) {
      props.prefetchGame(gameId);
    }
  };

  return (
    <Box component="div" width={1}>
      <Box component="div">
        <Typography variant="h4" component="h4" align="center">
          {props.title}
        </Typography>
        {props.topGames.length === 0 ? (
          <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
            <Box component="div" justifyContent="center" display="flex" alignItems="center" minHeight="150px" m={1}>
              <CircularProgress size={40} color="inherit" m={1} />
            </Box>
          </Box>
        ) : (
          <Fade in timeout={500}>
            <Box
              component="div"
              display="flex"
              flexWrap="wrap"
              justifyContent="center"
              alignItems="center"
            >
              {props.topGames.map((game) => (
                <Card key={game.id} sx={{ m: 1 }} onMouseEnter={() => handleMouseEnter(game.id)}>
                  <CardActionArea
                    component={Link}
                    to={`/${game.id}/${getGameSlug(game)}`}
                    title={`${game.name} - ${game[props.field] instanceof Date ? game[props.field].toLocaleDateString() : game[props.field]}`}
                  >
                    <CardMedia component="img" image={game.thumbnail} alt={game.name} loading="lazy" />
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
          </Fade>
        )}
      </Box>
    </Box>
  );
};

TopGames.propTypes = {
  topGames: PropTypes.array,
  loadedGames: PropTypes.object,
  title: PropTypes.string,
  field: PropTypes.string,
  loadTopGames: PropTypes.func,
  prefetchGame: PropTypes.func,
};

const mapStateToProps = (state, ownProps) => ({
  topGames: state.data.topGames[ownProps.field] || [],
  loadedGames: state.data.loadedGames,
});

export default connect(mapStateToProps, actions)(TopGames);

import React, { useState, useEffect } from 'react';

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
import CircularProgress from '@mui/material/CircularProgress';

import { getGameSlug } from '../utils';
import _ from 'lodash';

const styles = (theme) => ({
  card: {
    margin: theme.spacing(1),
  },
});

const TopGames = (props) => {
  const [topGames, setTopGames] = useState([]);

  const classes = props.classes;

  // componentDidMount
  useEffect(() => {
    if (props.data.games.length > 0) {
      setTopGames(_.orderBy(props.data.games, props.field, 'desc').slice(0, 10));
    }
  }, [props.data.games]);

  return (
    <Box component="div" width={1}>
      <Box component="div">
        <Typography variant="h4" component="h4" align="center">
          {props.title}
        </Typography>
        {topGames.length > 0 && (
          <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
            {topGames.map((game) => (
              <Card key={game.id} className={classes.card}>
                <CardActionArea
                  component={Link}
                  to={`/${game.id}/${getGameSlug(game)}`}
                  title={`${game.name} - ${game[props.field]}`}
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
        )}
        {topGames.length == 0 && (
          <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center">
            <Box component="div" justifyContent="center" display="flex" alignItems="center" minHeight="150px">
              <CircularProgress size={40} className={classes.progress} color="inherit" m={1} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

TopGames.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  title: PropTypes.string,
  field: PropTypes.string,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps, actions)(withStyles(styles)(withTheme(TopGames)));

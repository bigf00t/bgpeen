import React from 'react';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { Link } from 'react-router-dom';
import { withStyles, withTheme } from '@material-ui/core/styles';
import PropTypes from 'prop-types';

const styles = () => ({
  logo: {
    textDecoration: 'none',
    '&:hover': {
      opacity: 0.75,
    },
    '& span': {
      verticalAlign: 'top',
    },
  },
  twitter: {
    textDecoration: 'none',
    '&:hover': {
      opacity: 0.75,
    },
  },
});

const Menu = (props) => {
  const classes = props.classes;

  return (
    <AppBar position="static" color="default" display="flex">
      <Toolbar>
        <Box display="flex" flexGrow={1}>
          <Link className={classes.logo} to="/">
            <Typography component="span" variant="h4" color="textPrimary">
              {window.location.toString().includes('bgpeen') ? 'bgpeen' : 'goodat.games'}
            </Typography>
            <Typography component="span" variant="subtitle2" color="textPrimary">
              &nbsp;beta
            </Typography>
          </Link>
        </Box>
        <a className={classes.twitter} href="https://twitter.com/GoodAtDotGames" target="_blank" rel="noreferrer">
          <Typography component="span" color="textSecondary">
            @GoodAtDotGames
          </Typography>
        </a>
      </Toolbar>
    </AppBar>
  );
};

Menu.propTypes = {
  classes: PropTypes.object,
};

export default withStyles(styles)(withTheme(Menu));

import React from 'react';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';
import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import PropTypes from 'prop-types';

const styles = () => ({
  appbar: {
    backgroundColor: '#050505',
  },
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
    <AppBar className={classes.appbar} position="relative" enableColorOnDark={true} display="flex" elevation={3}>
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

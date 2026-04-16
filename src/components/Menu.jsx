import React from 'react';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';

const Menu = () => {
  return (
    <AppBar sx={{ backgroundColor: '#050505' }} position="absolute" enableColorOnDark={true} display="flex" elevation={3}>
      <Toolbar>
        <Box display="flex" flexGrow={1}>
          <Link
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { opacity: 0.75 }, '& span': { verticalAlign: 'top' } }}
          >
            <Typography component="span" variant="h4" color="textPrimary">
              {window.location.toString().includes('bgpeen') ? 'bgpeen' : 'goodat.games'}
            </Typography>
            <Typography component="span" variant="subtitle2" color="textPrimary">
              &nbsp;beta
            </Typography>
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;

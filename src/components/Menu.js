import React, { Component } from 'react';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

class Menu extends Component {
    render() {
        return (
        <AppBar position="static" color="default">
            <Toolbar>
            <Typography variant="h5" color="inherit">
                {window.location.toString().includes('bgpeen') ? "bgpeen" : "goodat.games"}
            </Typography>
            <Typography variant="subtitle2" color="inherit">
                &nbsp;beta
            </Typography>
            </Toolbar>
        </AppBar>
        );
    }
}
  
export default Menu;
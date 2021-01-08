import React, { Component } from 'react';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

import logo from '../assets/images/logo2.svg';

const styles = theme => ({
    logo: {
        marginRight: theme.spacing(0),
        height: '2rem'
    },
    h5: {
        fontSize: "2rem",
    },
    subtitle: {

    }
});

class Menu extends Component {
    render() {
        const classes = this.props.classes;

        return (
            <AppBar position="static" color="default">
                <Toolbar>
                    <img className={classes.logo} src={logo} alt="Pawn" title="Sometimes a pawn is just a pawn" />
                    <Typography className={classes.h5} variant="h5" color="inherit">
                        bgpeen
                    </Typography>
                    <Typography className={classes.subtitle} variant="subtitle2" color="inherit">
                        &nbsp;beta
                    </Typography>
                </Toolbar>
            </AppBar>
        );
    }
}
  
export default withStyles(styles)(Menu);
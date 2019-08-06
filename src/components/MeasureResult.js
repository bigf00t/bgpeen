import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';

import Modal from '@material-ui/core/Modal';

const styles = theme => ({
    modal: {
        position: 'absolute',
        maxWidth: 400,
        backgroundColor: theme.palette.background.paper,
        border: '2px solid #000',
        boxShadow: theme.shadows[5],
        padding: theme.spacing(2, 4, 4),
        outline: 'none',
        top: `50%`,
        left: `50%`,
        transform: `translate(-50%, -50%)`,
    },
  });

class MeasureResult extends Component {
    render () {
        return (
            <Modal
                open={this.props.open}
                onClose={this.props.handleClose}>
                <div className={this.props.classes.modal}>
                    <p id="simple-modal-description">
                        Your score was {this.props.score}, but the average score for {this.props.game.name} is {this.props.game.average}.<br />
                        {this.props.score > this.props.game.average ? "You're amazing" : "You're terrible!"}
                    </p>
                </div>
            </Modal>
        );
    }
}

const mapStateToProps = ({data}) => {
  return { data }
}

export default withStyles(styles)(MeasureResult);
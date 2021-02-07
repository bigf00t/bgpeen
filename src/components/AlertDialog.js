import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';

export default function AlertDialog(props) {
  const handleClose = () => {
    setOpen(false);
  };

  const { title, content, open, setOpen } = props;

  return (
    <div>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            color="primary"
            variant="contained"
            autoFocus
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

AlertDialog.propTypes = {
  title: PropTypes.string,
  content: PropTypes.string,
  open: PropTypes.bool,
  setOpen: PropTypes.func,
};

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import _ from 'lodash';
import ordinal from 'ordinal';

import withStyles from '@mui/styles/withStyles';
import withTheme from '@mui/styles/withTheme';
import FormGroup from '@mui/material/FormGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import FilterDropdown from './FilterDropdown';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const styles = () => ({
  accordion: {
    '&.MuiAccordion-root': {
      backgroundImage: 'none',
      '&.Mui-expanded': {
        margin: 0,
        '&::before': {
          opacity: 1,
        },
      },
    },
    '& .MuiAccordionSummary-root': {
      '&.Mui-focusVisible': {
        backgroundColor: 'inherit',
      },
    },
    '& .MuiAccordionSummary-content': {
      margin: 0,
    },
    '& .MuiAccordionDetails-root': {
      padding: 0,
    },
  },
});

const Filters = (props) => {
  const [validPlayerPlaces, setValidPlayerPlaces] = useState([]);

  let params = useParams();

  const classes = props.classes;

  // Players changed
  useEffect(() => {
    const newValidPlayerPlaces = getValidPlayerPlaces();

    setValidPlayerPlaces(newValidPlayerPlaces);
  }, [params.players]);

  const getValidPlayerPlaces = () => {
    return params.players ? _.range(1, parseInt(params.players) + 1).map((finish) => finish.toString()) : [];
  };

  // componentDidMount
  useEffect(() => {
    setValidPlayerPlaces(getValidPlayerPlaces());
  }, []);

  return (
    <Accordion className={classes.accordion}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" p={1} width={1}>
          <Typography component="h5" variant="h5" align="center" m={1} mr={2}>
            Filter scores by
          </Typography>
          <FormGroup row className={classes.formGroup}>
            <FilterDropdown
              field="players"
              dependentFilters={['start', 'finish']}
              clearsFilters={['color', 'year', 'month']}
              label="Player Count"
              options={props.data.game.playerCounts.split(',')}
              paramIndex={2}
            />
            <FilterDropdown
              field="start"
              enabledByFilter="players"
              clearsFilters={['finish']}
              label="Start Place"
              options={validPlayerPlaces}
              optionLabelFormat={(count) => (count ? ordinal(parseInt(count)) : '')}
              paramIndex={4}
            />
            <FilterDropdown
              field="finish"
              enabledByFilter="players"
              clearsFilters={['start']}
              label="Finish Place"
              options={validPlayerPlaces}
              optionLabelFormat={(count) => (count ? ordinal(parseInt(count)) : '')}
              paramIndex={4}
            />
          </FormGroup>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          component="div"
          display="flex"
          flexWrap="wrap"
          justifyContent="center"
          alignItems="center"
          p={1}
          pt={0}
          width={1}
        >
          <FormGroup row className={classes.formGroup}>
            {/* TODO: Implement real options */}
            {/* TODO: Implement isNew filter */}
            <FilterDropdown
              field="color"
              clearsFilters={['players', 'start', 'finish', 'year', 'month']}
              label="Player Color"
              options={['red', 'blue', 'green']}
              paramIndex={2}
            />
            <FilterDropdown
              field="year"
              dependentFilters={['month']}
              clearsFilters={['players', 'start', 'finish', 'color']}
              label="Play Year"
              options={['2022', '2021', '2020']}
              paramIndex={2}
            />
            <FilterDropdown
              field="month"
              enabledByFilter="year"
              label="Play Month"
              options={['June', 'July', 'August']}
              paramIndex={4}
            />
          </FormGroup>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

Filters.propTypes = {
  data: PropTypes.object,
  classes: PropTypes.object,
  filters: PropTypes.object,
};

const mapStateToProps = ({ data }) => {
  return { data };
};

export default connect(mapStateToProps)(withStyles(styles)(withTheme(Filters)));

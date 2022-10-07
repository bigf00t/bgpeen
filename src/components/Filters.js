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
      '&::before': {
        opacity: 0,
      },
      '&.Mui-expanded': {
        margin: 0,
        '&::before': {
          opacity: 0,
        },
      },
    },
    '& .MuiAccordionSummary-root': {
      // backgroundColor: theme.palette.background.default,
      '&.Mui-focusVisible': {
        backgroundColor: 'inherit',
      },
    },
    '& .MuiAccordionSummary-content': {
      margin: 0,
      paddingLeft: '24px',
    },
    '& .MuiAccordionDetails-root': {
      padding: 0,
      // backgroundColor: theme.palette.background.default,
    },
  },
});

const Filters = (props) => {
  const [validPlayerPlaces, setValidPlayerPlaces] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [colors, setColors] = useState([]);

  let params = useParams();

  const classes = props.classes;

  // Players changed
  useEffect(() => {
    setValidPlayerPlaces(getValidPlayerPlaces());
  }, [params.players]);

  // Year changed
  useEffect(() => {
    setMonths(getMonths());
  }, [params.year]);

  const getValidPlayerPlaces = () => {
    return params.players ? _.range(1, parseInt(params.players) + 1).map((finish) => finish.toString()) : [];
  };

  const getYears = () => {
    return _.uniq(props.data.game.months.map((month) => month.split('-')[0]));
  };

  const getMonths = () => {
    let months = props.data.game.months
      .filter((month) => month.split('-')[0] == params.year)
      .map((month) => month.split('-')[1]);

    months.sort((a, b) => parseInt(a) - parseInt(b));

    return months;
  };

  const getColors = () => {
    return props.data.game.colors.map((color) => color.trim().toLowerCase().replace(/ /g, '-').replace(/[.']/g, ''));
  };

  const toMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);

    return date.toLocaleString('en-US', {
      month: 'long',
    });
  };

  // componentDidMount
  useEffect(() => {
    setValidPlayerPlaces(getValidPlayerPlaces());
    setYears(getYears());
    setColors(getColors());
  }, []);

  return (
    <Accordion className={classes.accordion}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box component="div" display="flex" flexWrap="wrap" justifyContent="center" alignItems="center" p={1} width={1}>
          <Typography component="h5" variant="h5" align="right" m={1} pr={2} width="180px">
            Filter scores by
          </Typography>
          <FormGroup row className={classes.formGroup} display="block">
            <FilterDropdown
              field="players"
              dependentFilters={['start', 'finish', 'new']}
              clearsFilters={['start', 'finish', 'new', 'color', 'year', 'month']}
              label="Player Count"
              options={props.data.game.playerCounts.split(',')}
              paramIndex={2}
            />
            <FilterDropdown
              field="finish"
              enabledByFilter="players"
              clearsFilters={['start', 'new']}
              label="Finish Place"
              options={validPlayerPlaces}
              optionLabelFormat={(option) => (option ? ordinal(parseInt(option)) : '')}
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
            <FilterDropdown
              field="start"
              enabledByFilter="players"
              clearsFilters={['finish', 'new']}
              label="Start Place"
              options={validPlayerPlaces}
              optionLabelFormat={(option) => (option ? ordinal(parseInt(option)) : '')}
              paramIndex={4}
            />
            <FilterDropdown
              field="new"
              enabledByFilter="players"
              clearsFilters={['start', 'finish']}
              label="New Player"
              options={['1']}
              optionLabelFormat={(option) => (option == '1' ? 'Yes' : 'No')}
              paramIndex={4}
            />
            <FilterDropdown
              field="color"
              clearsFilters={['players', 'start', 'finish', 'year', 'month']}
              label="Player Color"
              options={colors}
              optionLabelFormat={(option) => _.startCase(option)}
              paramIndex={2}
            />
            <FilterDropdown
              field="year"
              dependentFilters={['month']}
              clearsFilters={['month', 'players', 'start', 'finish', 'color']}
              label="Play Year"
              options={years}
              paramIndex={2}
            />
            <FilterDropdown
              field="month"
              enabledByFilter="year"
              label="Play Month"
              options={months}
              optionLabelFormat={(option) => toMonthName(option)}
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

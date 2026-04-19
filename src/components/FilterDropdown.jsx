import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import PropTypes from 'prop-types';
import Autocomplete from '@mui/material/Autocomplete';

const FilterDropdown = (props) => {
  const [value, setValue] = useState();
  const [highlightValue, setHighlightValue] = useState('');

  const rawParams = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const params = useMemo(() => {
    const p = { id: rawParams.id, name: rawParams.name };
    const parts = (rawParams['*'] || '').split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i += 2) {
      p[parts[i]] = parts[i + 1];
    }
    return p;
  }, [rawParams]);

  const handleValueChange = (event, newValue) => {
    if (!newValue) {
      setTimeout(() => {
        document.activeElement.blur();
      }, 0);
    }
    setValue(newValue);
  };

  const handleHighlightChange = (event, option) => {
    setHighlightValue(option);
  };

  const updateHistory = useCallback(() => {
    var flatParams = Object.entries(params).flat();

    // Remove id and name keys
    flatParams.splice(2, 1);
    flatParams.splice(0, 1);

    const paramsToRemove = params[props.field] ? 2 : 0;
    const paramsToAdd = value ? [props.field, value] : [];
    const fieldIndex = flatParams.indexOf(props.field);
    const startIndex = fieldIndex > -1 ? fieldIndex : props.paramIndex;

    flatParams.splice(startIndex, paramsToRemove, ...paramsToAdd);

    let fieldsToRemove = [];

    // Remove dependent fields from url params
    if (paramsToAdd.length == 0) {
      fieldsToRemove = fieldsToRemove.concat(props.dependentFilters || []);
    }

    // Remove exclusive fields from url params
    if (paramsToAdd.length > 0) {
      fieldsToRemove = fieldsToRemove.concat(props.clearsFilters || []);
    }

    for (const field of fieldsToRemove) {
      const fieldIndex = flatParams.indexOf(field);
      if (fieldIndex > -1) {
        flatParams.splice(fieldIndex, 2);
      }
    }

    const qs = searchParams.toString();
    navigate(`/${flatParams.join('/')}${qs ? `?${qs}` : ''}`);
  }, [params, value, props.field, props.paramIndex, props.dependentFilters, props.clearsFilters, navigate, searchParams]);

  const updateHistoryRef = useRef(updateHistory);
  useEffect(() => {
    updateHistoryRef.current = updateHistory;
  }, [updateHistory]);

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Tab': {
        if (highlightValue) {
          handleValueChange(event, highlightValue);
        }
        break;
      }
      default:
    }
  };

  const isDisabled = () => {
    return (
      props.enabledByFilter !== undefined && !params[props.enabledByFilter] //||
      // (props.clearsFilters !== undefined &&
      //   props.clearsFilters.some((field) => params[field] !== undefined))
    );
  };

  // componentDidMount
  useEffect(() => {
    setValue(params[props.field]);
  }, []);

  // Param value changed
  useEffect(() => {
    if (params[props.field] !== value) {
      setValue(params[props.field]);
    }
  }, [params[props.field]]);

  // Dropdown value changed
  useEffect(() => {
    if (value !== undefined && (value || '').toString() !== (params[props.field] || '')) {
      updateHistoryRef.current();
    }
  }, [value]);

  return (
    <FormControl
      sx={{ m: 1, minWidth: 180, height: 60, flex: 3 }}
      // To prevent accordion toggling
      onClick={(event) => event.stopPropagation()}
    >
      <Autocomplete
        autoHighlight
        blurOnSelect
        disableClearable={value == ''}
        id={props.field}
        value={value ? value.toString() : null}
        onChange={handleValueChange}
        onHighlightChange={handleHighlightChange}
        options={props.options}
        fullWidth
        getOptionLabel={(option) => (props.optionLabelFormat ? props.optionLabelFormat(option) : option)}
        disabled={isDisabled()}
        renderInput={(params) => {
          params.inputProps.onKeyDown = handleKeyDown;
          params.inputProps.onClick = (event) => event.stopPropagation();
          return (
            <TextField
              {...params}
              label={props.label}
              fullWidth
              labelid={`${props.field}-label`}
              InputLabelProps={{
                sx: { '&.Mui-focused': { color: 'text.primary' } },
              }}
            />
          );
        }}
      />
    </FormControl>
  );
};

FilterDropdown.propTypes = {
  field: PropTypes.string,
  dependentFilters: PropTypes.array,
  enabledByFilter: PropTypes.string,
  clearsFilters: PropTypes.array,
  label: PropTypes.string,
  options: PropTypes.array,
  optionLabelFormat: PropTypes.func,
  paramIndex: PropTypes.number,
};

export default FilterDropdown;

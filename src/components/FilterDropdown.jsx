import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import PropTypes from 'prop-types';
import Autocomplete from '@mui/material/Autocomplete';

const FilterDropdown = (props) => {
  const [value, setValue] = useState();
  const [highlightValue, setHighlightValue] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const handleValueChange = (event, newValue) => {
    if (!newValue) setTimeout(() => document.activeElement.blur(), 0);
    setValue(newValue);
  };

  const handleHighlightChange = (event, option) => setHighlightValue(option);

  const updateSearchParams = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(props.field, value);
        (props.clearsFilters || []).forEach((f) => next.delete(f));
      } else {
        next.delete(props.field);
        (props.dependentFilters || []).forEach((f) => next.delete(f));
      }
      return next;
    });
  }, [value, props.field, props.dependentFilters, props.clearsFilters, setSearchParams]);

  const updateSearchParamsRef = useRef(updateSearchParams);
  useEffect(() => { updateSearchParamsRef.current = updateSearchParams; }, [updateSearchParams]);

  const handleKeyDown = (event) => {
    if (event.key === 'Tab' && highlightValue) handleValueChange(event, highlightValue);
  };

  const isDisabled = () => props.enabledByFilter && !searchParams.get(props.enabledByFilter);

  // Mount
  useEffect(() => {
    setValue(searchParams.get(props.field) || undefined);
  }, []);

  // Param changed externally
  useEffect(() => {
    const paramVal = searchParams.get(props.field) || undefined;
    if (paramVal !== value) setValue(paramVal);
  }, [searchParams.get(props.field)]);

  // Value changed by user
  useEffect(() => {
    if (value !== undefined && (value || '') !== (searchParams.get(props.field) || '')) {
      updateSearchParamsRef.current();
    }
  }, [value]);

  return (
    <FormControl
      sx={{ m: 1, minWidth: 180, height: 60, flex: 3 }}
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
        getOptionLabel={(option) => (props.optionLabelFormat ? props.optionLabelFormat(option) : String(option))}
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
};

export default FilterDropdown;

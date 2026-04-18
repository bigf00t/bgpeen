import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import _ from 'lodash';
import ordinal from 'ordinal';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import FilterDropdown from './FilterDropdown';

const FiltersV2 = ({ data }) => {
  const [validPlayerPlaces, setValidPlayerPlaces] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [colors, setColors] = useState([]);
  const advInnerRef = useRef(null);

  const rawParams = useParams();
  const params = React.useMemo(() => {
    const p = { id: rawParams.id, name: rawParams.name };
    const parts = (rawParams['*'] || '').split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i += 2) p[parts[i]] = parts[i + 1];
    return p;
  }, [rawParams]);

  useEffect(() => { setValidPlayerPlaces(getValidPlayerPlaces()); }, [params.players]);
  useEffect(() => { setMonths(getMonths()); }, [params.year]);

  const getValidPlayerPlaces = () =>
    params.players ? _.range(1, parseInt(params.players) + 1).map((f) => f.toString()) : [];

  const getYears = () => _.uniq((data.months || []).map((m) => m.split('-')[0]));

  const getMonths = () => {
    const ms = (data.months || [])
      .filter((m) => m.split('-')[0] == params.year)
      .map((m) => m.split('-')[1]);
    ms.sort((a, b) => parseInt(a) - parseInt(b));
    return ms;
  };

  const getColors = () =>
    (data.colors || []).map((c) => c.trim().toLowerCase().replace(/ /g, '-').replace(/[.']/g, ''));

  useEffect(() => {
    if (!data) return;
    setValidPlayerPlaces(getValidPlayerPlaces());
    setYears(getYears());
    setColors(getColors());
  }, []);

  useEffect(() => {
    const el = advInnerRef.current;
    if (!el) return;
    const onScroll = () => {
      const atEnd = el.scrollLeft + el.offsetWidth >= el.scrollWidth - 2;
      el.classList.toggle('scrolled-end', atEnd);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const toMonthName = (monthNumber) => {
    const d = new Date();
    d.setMonth(monthNumber - 1);
    return d.toLocaleString('en-US', { month: 'long' });
  };

  return (
    <div className="rv2-filters-section">
      <div className="rv2-primary-filters">
        <span className="rv2-filters-label">Filter by</span>
        <FilterDropdown
          field="players"
          dependentFilters={['start', 'finish', 'new']}
          clearsFilters={['start', 'finish', 'new', 'color', 'year', 'month']}
          label="Player Count"
          options={data.playerCounts || []}
          paramIndex={2}
        />
        <FilterDropdown
          field="finish"
          enabledByFilter="players"
          clearsFilters={['start', 'new']}
          label="Finish Place"
          options={validPlayerPlaces}
          optionLabelFormat={(o) => (o ? ordinal(parseInt(o)) : '')}
          paramIndex={4}
        />
      </div>
      <div className="rv2-advanced-filters">
        <span className="rv2-filters-label">Advanced</span>
        <div className="rv2-advanced-filters-inner" ref={advInnerRef}>
          <FilterDropdown
            field="start"
            enabledByFilter="players"
            clearsFilters={['finish', 'new']}
            label="Start Place"
            options={validPlayerPlaces}
            optionLabelFormat={(o) => (o ? ordinal(parseInt(o)) : '')}
            paramIndex={4}
          />
          <FilterDropdown
            field="new"
            enabledByFilter="players"
            clearsFilters={['start', 'finish']}
            label="New Player"
            options={['1']}
            optionLabelFormat={(o) => (o == '1' ? 'Yes' : 'No')}
            paramIndex={4}
          />
          <FilterDropdown
            field="color"
            clearsFilters={['players', 'start', 'finish', 'year', 'month']}
            label="Player Color"
            options={colors}
            optionLabelFormat={(o) => _.startCase(o)}
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
            optionLabelFormat={(o) => toMonthName(o)}
            paramIndex={4}
          />
        </div>
      </div>
    </div>
  );
};

FiltersV2.propTypes = { data: PropTypes.object };

const mapStateToProps = ({ data }) => ({ data: data.game });

export default connect(mapStateToProps)(FiltersV2);

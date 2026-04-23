import React, { useEffect } from 'react';
import SelectGame from './SelectGame';
import TopGames from './TopGames';
import RecentlyViewed from './RecentlyViewed';
import './Measure.css';

const Measure = () => {
  useEffect(() => {
    document.title = 'goodat.games';
  }, []);

  return (
    <div className="measure-layout">
      <div className="measure-top">
        <SelectGame />
      </div>
      <hr className="measure-divider" />
      <RecentlyViewed />
      <div className="measure-section">
        <TopGames />
      </div>
    </div>
  );
};

export default Measure;

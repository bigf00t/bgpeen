import React, { useEffect } from 'react';
import GameSearch from '../components/GameSearch';
import TopGames from '../components/TopGames';
import RecentlyViewed from '../components/RecentlyViewed';
import './Home.css';

const Home = () => {
  useEffect(() => {
    document.title = 'goodat.games';
  }, []);

  return (
    <div className="measure-layout">
      <div className="measure-top">
        <GameSearch />
      </div>
      <hr className="measure-divider" />
      <RecentlyViewed />
      <div className="measure-section">
        <TopGames />
      </div>
    </div>
  );
};

export default Home;

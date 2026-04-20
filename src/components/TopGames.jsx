import React, { useEffect, useState, useRef } from 'react';
import * as actions from '../actions';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getGameSlug } from '../utils';

const fmtCount = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

const TABS = [
  { key: 'popularity', label: 'Popular All Time', short: 'Top' },
  { key: 'addedDate',  label: 'Recently Added',   short: 'New' },
];

const SkeletonGrid = () => (
  <div className="game-grid">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="game-card-skeleton">
        <div className="sk-img" />
        <div className="sk-name" />
        <div className="sk-count" />
      </div>
    ))}
  </div>
);

const TopGames = (props) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const sectionRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    TABS.forEach(({ key }) => {
      if (!props.topGames[key] || props.topGames[key].length === 0) {
        props.loadTopGames(key);
      }
    });
  }, []);

  const switchTab = (index) => {
    if (index === activeTab) return;
    setShowSkeleton(true);
    setActiveTab(index);
    if (sectionRef.current) sectionRef.current.closest('.measure-section')?.scrollTo(0, 0);
    setTimeout(() => setShowSkeleton(false), 350);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && activeTab < TABS.length - 1) switchTab(activeTab + 1);
      if (dx > 0 && activeTab > 0) switchTab(activeTab - 1);
    }
  };

  const currentKey = TABS[activeTab].key;
  const games = props.topGames[currentKey] || [];
  const loading = games.length === 0;

  const handleMouseEnter = (gameId) => {
    if (!props.loadedGames[gameId]) props.prefetchGame(gameId);
  };

  return (
    <div
      ref={sectionRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="home-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            className={`home-tab${i === activeTab ? ' home-tab--active' : ''}`}
            onClick={() => switchTab(i)}
          >
            <span className="tab-full">{tab.label}</span>
            <span className="tab-short">{tab.short}</span>
          </button>
        ))}
        <button className="home-tab home-tab--disabled" disabled title="Coming soon">
          <span className="tab-full">Popular This Month</span>
          <span className="tab-short">Hot</span>
        </button>
      </div>

      {showSkeleton || loading ? (
        <SkeletonGrid />
      ) : (
        <div className="game-grid">
          {games.map((game, i) => (
            <Link
              key={game.id}
              className="game-card"
              to={`/${game.id}/${getGameSlug(game)}`}
              title={game.name}
              onMouseEnter={() => handleMouseEnter(game.id)}
            >
              {i < 3 && <span className="hot-badge">🔥 #{i + 1}</span>}
              <img
                className="game-card-img"
                src={game.thumbnail}
                alt={game.name}
                loading="lazy"
              />
              <div className="game-card-info">
                <div className="game-card-name">{game.name}</div>
                <div className="game-card-stats">
                  <span className="game-card-stat--primary">{fmtCount(game.totalScores)}</span>
                  <span className="game-card-stat"> scores</span>
                  <span className="game-card-sep">·</span>
                  <span className="game-card-stat">avg </span>
                  <span className="game-card-stat--primary">{typeof game.mean === 'number' ? Math.round(game.mean) : game.mean}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

TopGames.propTypes = {
  topGames: PropTypes.object,
  loadedGames: PropTypes.object,
  loadTopGames: PropTypes.func,
  prefetchGame: PropTypes.func,
};

const mapStateToProps = (state) => ({
  topGames: state.data.topGames,
  loadedGames: state.data.loadedGames,
});

export default connect(mapStateToProps, actions)(TopGames);

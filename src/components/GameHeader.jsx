import React, { useState } from 'react';
import Image from 'mui-image';
import PropTypes from 'prop-types';

const GameHeader = ({ game, result, derivedStats, filters }) => {
  const [showMoreStats, setShowMoreStats] = useState(false);

  const totalScores = result.scoreCount ?? 0;
  const scoreLabel = result.id === 'all' ? 'scores' : `scores of ${game.totalScores?.toLocaleString()}`;

  return (
    <div className="rv-header">
      <div className="rv-thumb-wrap">
        <Image
          src={game.thumbnail}
          duration={0}
          wrapperStyle={{ width: '100%', height: '100%' }}
          style={{ width: '100%', height: '100%', objectFit: 'scale-down', borderRadius: 8 }}
        />
      </div>
      <div className="rv-header-name">
        <div className="rv-game-name">{game.name}</div>
        <a
          className="rv-bgg-link"
          href={`https://boardgamegeek.com/boardgame/${game.id}`}
          target="_blank"
          rel="noreferrer"
        >
          View on boardgamegeek.com ↗
        </a>
      </div>
      <div className="rv-header-stats">
        <div className="rv-stats-primary">
          <div className="rv-stat-primary-group">
            <span className="rv-stat-big">{totalScores.toLocaleString()}</span>
            <span className="rv-stat-big-label">{scoreLabel}</span>
          </div>
          <div className="rv-stat-primary-group">
            <span className="rv-stat-big">{result.mean}</span>
            <span className="rv-stat-big-label">avg</span>
          </div>
        </div>
        <div className="rv-stats-secondary">
          {result.stdDev !== undefined && (
            <span className="rv-stat-sm">std dev <strong>±{result.stdDev}</strong></span>
          )}
          {derivedStats && (<>
            <span className="rv-stat-sm">median <strong>{derivedStats.median}</strong></span>
            <span className="rv-stat-sm">mode <strong>{derivedStats.mode}</strong></span>
            <span className="rv-stat-sm">min <strong>{derivedStats.min}</strong> · max <strong>{derivedStats.max}</strong></span>
            {derivedStats.skewness !== null && (
              <span className="rv-stat-sm">skew <strong>{derivedStats.skewness}</strong></span>
            )}
          </>)}
        </div>
        {showMoreStats && (
          <div className="rv-stats-extra">
            {derivedStats && (
              <div className="rv-stats-extra-row">
                <span className="rv-stat-sm">p10 <strong>{derivedStats.p10}</strong> · p25 <strong>{derivedStats.p25}</strong> · p75 <strong>{derivedStats.p75}</strong> · p90 <strong>{derivedStats.p90}</strong></span>
              </div>
            )}
            {((filters.players && result.trimmedWinPercentage !== undefined) || result.expectedMean !== undefined) && (
              <div className="rv-stats-extra-row">
                {filters.players && result.trimmedWinPercentage !== undefined && (
                  <span className="rv-stat-sm">win % <strong>{result.trimmedWinPercentage}%</strong></span>
                )}
                {result.expectedMean !== undefined && (
                  <span className="rv-stat-sm">expected avg <strong>{result.expectedMean}</strong></span>
                )}
                {filters.players && result.expectedWinPercentage !== undefined && (
                  <span className="rv-stat-sm">expected win % <strong>{result.expectedWinPercentage}%</strong></span>
                )}
              </div>
            )}
          </div>
        )}
        {derivedStats && (
          <button
            className={`rv-stddev-toggle rv-stats-more-toggle${showMoreStats ? ' rv-stddev-toggle--on' : ''}`}
            onClick={() => setShowMoreStats((v) => !v)}
          >
            {showMoreStats ? 'less ▲' : 'more ▼'}
          </button>
        )}
      </div>
    </div>
  );
};

GameHeader.propTypes = {
  game: PropTypes.object.isRequired,
  result: PropTypes.object.isRequired,
  derivedStats: PropTypes.object,
  filters: PropTypes.object.isRequired,
};

export default GameHeader;

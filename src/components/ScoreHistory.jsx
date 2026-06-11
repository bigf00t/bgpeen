import React from 'react';
import PropTypes from 'prop-types';
import { computePercentile, formatPercentileLabel } from '../utils/scores';

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return '';
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const ScoreHistory = ({ userScores, result }) => {
  if (!userScores.length) return null;

  return (
    <div className="rv-score-history">
      <p className="rv-score-history-title">Your scores</p>
      <ul className="rv-score-history-list">
        {userScores.map((entry) => {
          const pct = result?.scores ? computePercentile(entry.score, result.scores) : null;
          return (
            <li key={entry.id} className="rv-score-history-item">
              <span className="rv-score-history-score">{entry.score}</span>
              <span className="rv-score-history-date">{formatDate(entry.date)}</span>
              {pct !== null && (
                <span className="rv-score-history-pct">
                  {formatPercentileLabel(pct)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

ScoreHistory.propTypes = {
  userScores: PropTypes.array.isRequired,
  result: PropTypes.object,
};

export default ScoreHistory;

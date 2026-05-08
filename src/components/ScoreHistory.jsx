import React from 'react';
import PropTypes from 'prop-types';

const computePercentile = (score, resultScores) => {
  const total = Object.values(resultScores).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const pct = (Object.entries(resultScores).reduce((acc, [k, c]) => {
    const ki = parseInt(k);
    return acc + (ki < score ? c : 0) + (ki === score ? c * 0.5 : 0);
  }, 0) * 100) / total;
  return Math.round(pct);
};

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
                  {pct >= 50 ? `Better than ${pct}%` : `Worse than ${100 - pct}%`}
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

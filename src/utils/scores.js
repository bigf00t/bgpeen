export const getResultIdFromFilters = (filters) => {
  if (!filters) return 'all';
  if (filters.players) {
    let rid = `count-${filters.players}`;
    if (filters.start) rid += `-start-${filters.start}`;
    else if (filters.finish) rid += `-finish-${filters.finish}`;
    else if (filters.new) rid += `-new`;
    return rid;
  }
  if (filters.color) return `color-${filters.color}`;
  if (filters.year) {
    let rid = `year-${filters.year}`;
    if (filters.month) rid += `-month-${filters.month}`;
    return rid;
  }
  return 'all';
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const formatFilters = (filters) => {
  if (!filters || !Object.keys(filters).length) return null;
  const parts = [];
  if (filters.players) parts.push(`players: ${filters.players}`);
  if (filters.finish) parts.push(`finish: ${filters.finish}`);
  else if (filters.start) parts.push(`start: ${filters.start}`);
  else if (filters.new) parts.push('new');
  if (filters.color) parts.push(`color: ${filters.color}`);
  if (filters.year) parts.push(`year: ${filters.year}`);
  if (filters.month) parts.push(`month: ${MONTHS[filters.month - 1]}`);
  return parts.join(', ') || null;
};

export const computeAvgScore = (scores) =>
  scores.length ? Math.round(scores.reduce((s, e) => s + e.score, 0) / scores.length) : null;

export const formatPercentileLabel = (pct, { ofPlayers = false } = {}) => {
  const suffix = ofPlayers ? '% of players' : '%';
  return pct >= 50 ? `better than ${pct}${suffix}` : `worse than ${100 - pct}${suffix}`;
};

export const computePercentile = (score, resultScores) => {
  const total = Object.values(resultScores).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const pct = (Object.entries(resultScores).reduce((acc, [k, c]) => {
    const ki = parseInt(k);
    return acc + (ki < score ? c : 0) + (ki === score ? c * 0.5 : 0);
  }, 0) * 100) / total;
  return Math.min(99, Math.max(1, Math.round(pct)));
};

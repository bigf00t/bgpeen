const { initializeApp } = require('firebase-admin/app');
const { mockGoogleCloudFirestore } = require('firestore-jest-mock');

mockGoogleCloudFirestore({
  database: {
    games: [{ id: '1', name: 'Test Game', totalScores: 0, _collections: { results: [] } }],
    details: [{ id: '1', minplayers: 2, maxplayers: 4, yearpublished: 2015 }],
  },
});
initializeApp();

const {
  getExplodedScores,
  getStats,
  combineScores,
  removeOutlierScores,
  getOutlierScores,
  calculateNewOutliers,
  addStatsToResult,
  getGameType,
  getValidPlays,
  getColorKey,
  getKeysFromResult,
  getResultsWithExpected,
  filterResults,
  getKeyedResultsFromPlayerResults,
  getPlayerResultsFromPlays,
  getCombinedResults,
} = require('../update_results')._test;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePlay = (overrides = {}) => ({
  id: 'play-1',
  date: '2020-06-15',
  incomplete: '0',
  playerCount: 2,
  players: [
    { score: '100', win: '1', color: 'red', new: '0', startposition: '1' },
    { score: '80', win: '0', color: 'blue', new: '0', startposition: '2' },
  ],
  ...overrides,
});

const details = { minplayers: 2, maxplayers: 4, yearpublished: 2015 };

// ---------------------------------------------------------------------------
// getExplodedScores
// ---------------------------------------------------------------------------

describe('getExplodedScores', () => {
  test('expands a distribution into a flat array', () => {
    const result = getExplodedScores({ 100: 3, 50: 2 });
    expect(result).toHaveLength(5);
    expect(result.filter((s) => s === 100)).toHaveLength(3);
    expect(result.filter((s) => s === 50)).toHaveLength(2);
  });

  test('empty distribution → empty array', () => {
    expect(getExplodedScores({})).toEqual([]);
  });

  test('single score', () => {
    expect(getExplodedScores({ 75: 1 })).toEqual([75]);
  });

  test('score keys are parsed as integers', () => {
    const result = getExplodedScores({ '42': 2 });
    expect(result).toEqual([42, 42]);
    expect(typeof result[0]).toBe('number');
  });

  test('zero count → contributes nothing', () => {
    expect(getExplodedScores({ 100: 0 })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('getStats', () => {
  test('empty array → empty object', () => {
    expect(getStats([])).toEqual({});
  });

  test('known distribution: [10, 20, 30, 40, 50]', () => {
    // mean = 30, median = 30
    // std (sample) = sqrt(250) ≈ 15.81
    // mode = 10 (all equal frequency, mathjs returns first)
    // mad = median of [20,10,0,10,20] = 10
    const result = getStats([10, 20, 30, 40, 50]);
    expect(result.mean).toBe('30.00');
    expect(result.median).toBe(30);
    expect(parseFloat(result.std)).toBeCloseTo(15.81, 1);
    expect(result.mad).toBe(10);
  });

  test('all equal values → std=0, mad=0', () => {
    const result = getStats([5, 5, 5, 5]);
    expect(result.mean).toBe('5.00');
    expect(result.std).toBe('0.00');
    expect(result.median).toBe(5);
    expect(result.mode).toBe(5);
    expect(result.mad).toBe(0);
  });

  test('single value → std=0', () => {
    const result = getStats([42]);
    expect(result.mean).toBe('42.00');
    expect(result.std).toBe('0.00');
    expect(result.median).toBe(42);
    expect(result.mode).toBe(42);
  });

  test('mean is rounded to 2 decimal places', () => {
    // [1, 2] → mean = 1.5
    const result = getStats([1, 2]);
    expect(result.mean).toBe('1.50');
  });

  test('mode is the most frequent value', () => {
    // [1, 2, 2, 3] → mode = 2
    const result = getStats([1, 2, 2, 3]);
    expect(result.mode).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// combineScores
// ---------------------------------------------------------------------------

describe('combineScores', () => {
  test('merges non-overlapping distributions', () => {
    expect(combineScores({ 100: 3 }, { 80: 2 })).toEqual({ 100: 3, 80: 2 });
  });

  test('sums overlapping scores', () => {
    expect(combineScores({ 100: 3, 80: 2 }, { 100: 1, 90: 4 })).toEqual({ 100: 4, 80: 2, 90: 4 });
  });

  test('newScores undefined → returns existingScores unchanged', () => {
    expect(combineScores({ 100: 3 }, undefined)).toEqual({ 100: 3 });
  });

  test('existingScores undefined → uses newScores', () => {
    expect(combineScores(undefined, { 100: 3 })).toEqual({ 100: 3 });
  });

  test('both empty → empty', () => {
    expect(combineScores({}, {})).toEqual({});
  });

  test('does not remove NaN key (that is getCombinedResults responsibility)', () => {
    const result = combineScores({ NaN: 2 }, { 100: 1 });
    expect(result['NaN']).toBe(2);
    expect(result[100]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removeOutlierScores / getOutlierScores
// ---------------------------------------------------------------------------

describe('removeOutlierScores', () => {
  test('removes scores in outliers list', () => {
    const result = removeOutlierScores({ 100: 3, 500: 1, 80: 2 }, [500]);
    expect(result).toEqual({ 100: 3, 80: 2 });
    expect(result[500]).toBeUndefined();
  });

  test('no outliers → unchanged', () => {
    expect(removeOutlierScores({ 100: 3, 80: 2 }, [])).toEqual({ 100: 3, 80: 2 });
  });

  test('all scores are outliers → empty', () => {
    expect(removeOutlierScores({ 100: 3 }, [100])).toEqual({});
  });
});

describe('getOutlierScores', () => {
  test('returns only outlier scores', () => {
    expect(getOutlierScores({ 100: 3, 500: 1, 80: 2 }, [500])).toEqual({ 500: 1 });
  });

  test('no outliers → empty', () => {
    expect(getOutlierScores({ 100: 3 }, [])).toEqual({});
  });

  test('removeOutlierScores and getOutlierScores are exact inverses (union = original)', () => {
    const scores = { 100: 3, 500: 1, 80: 2 };
    const outliers = [500];
    const kept = removeOutlierScores(scores, outliers);
    const removed = getOutlierScores(scores, outliers);
    const union = { ...kept, ...removed };
    expect(union).toEqual(scores);
  });
});

// ---------------------------------------------------------------------------
// calculateNewOutliers
// ---------------------------------------------------------------------------

describe('calculateNewOutliers', () => {
  test('no outliers in tight distribution', () => {
    // All scores within a narrow band — nothing should be flagged
    const result = { scores: { 100: 5, 105: 5, 110: 5, 115: 5, 120: 5 }, outlierScores: {} };
    const outliers = calculateNewOutliers(result);
    expect(outliers).toEqual([]);
  });

  test('detects extreme right outlier', () => {
    // 50 scores clustered around 100–120, one extreme at 500
    const scores = { 100: 10, 105: 10, 110: 10, 115: 10, 120: 10, 500: 1 };
    const outliers = calculateNewOutliers({ scores, outlierScores: {} });
    expect(outliers).toContain(500);
    expect(outliers).not.toContain(100);
  });

  test('detects extreme left outlier', () => {
    // Mirror: one extreme low value
    const scores = { 1: 1, 100: 10, 105: 10, 110: 10, 115: 10, 120: 10 };
    const outliers = calculateNewOutliers({ scores, outlierScores: {} });
    expect(outliers).toContain(1);
    expect(outliers).not.toContain(120);
  });

  test('old outliers are re-included before recalculating', () => {
    // Scores without 500, but 500 is in outlierScores
    // Re-including it should still flag it
    const scores = { 100: 10, 105: 10, 110: 10, 115: 10, 120: 10 };
    const outlierScores = { 500: 1 };
    const outliers = calculateNewOutliers({ scores, outlierScores });
    expect(outliers).toContain(500);
  });

  test('returns unique outlier values only', () => {
    // Even if the extreme score appears multiple times, each value appears once in the result
    const scores = { 100: 10, 110: 10, 120: 10, 500: 5 };
    const outliers = calculateNewOutliers({ scores, outlierScores: {} });
    const unique = [...new Set(outliers)];
    expect(outliers).toEqual(unique);
  });
});

// ---------------------------------------------------------------------------
// addStatsToResult
// ---------------------------------------------------------------------------

describe('addStatsToResult', () => {
  test('win percentage excludes outlier scores', () => {
    // 3 wins at 100, 1 win at 500 (outlier) → winPct = 3/5 × 100 = 60%
    const result = {
      scores: { 100: 3, 80: 2, 500: 1 },
      wins: { 100: 2, 80: 1, 500: 1 },
      tieBreakerWins: {},
      sharedWins: {},
    };
    const out = addStatsToResult(result, [500]);
    expect(out.scoreCount).toBe(5);
    expect(out.trimmedWinCount).toBe(3);
    expect(out.trimmedWinPercentage).toBe('60.00');
  });

  test('scoreCount reflects non-outlier scores only', () => {
    const result = {
      scores: { 100: 4, 9999: 2 },
      wins: { 100: 2 },
      tieBreakerWins: {},
      sharedWins: {},
    };
    const out = addStatsToResult(result, [9999]);
    expect(out.scoreCount).toBe(4);
    expect(out.outlierScoreCount).toBe(2);
  });

  test('no outliers → full score count retained', () => {
    const result = {
      scores: { 100: 3, 80: 2 },
      wins: { 100: 2 },
      tieBreakerWins: {},
      sharedWins: {},
    };
    const out = addStatsToResult(result, []);
    expect(out.scoreCount).toBe(5);
    expect(out.outlierScoreCount).toBe(0);
  });

  test('mean is calculated on non-outlier scores', () => {
    // [100,100,100,80,80] → mean = 460/5 = 92.00
    const result = {
      scores: { 100: 3, 80: 2, 500: 1 },
      wins: {},
      tieBreakerWins: {},
      sharedWins: {},
    };
    const out = addStatsToResult(result, [500]);
    expect(out.mean).toBe('92.00');
  });

  test('empty scores after outlier removal → no stats', () => {
    const result = {
      scores: { 500: 1 },
      wins: {},
      tieBreakerWins: {},
      sharedWins: {},
    };
    const out = addStatsToResult(result, [500]);
    expect(out.mean).toBeUndefined();
    expect(out.scoreCount).toBe(0);
  });

  test('outlierScores stored on result', () => {
    const result = {
      scores: { 100: 3, 500: 1 },
      wins: {},
      tieBreakerWins: {},
      sharedWins: {},
    };
    const out = addStatsToResult(result, [500]);
    expect(out.outlierScores).toEqual({ 500: 1 });
  });
});

// ---------------------------------------------------------------------------
// getGameType
// ---------------------------------------------------------------------------

describe('getGameType', () => {
  const makeGamePlay = (players) => ({ players });

  test('all players win every play → co-op', () => {
    const plays = [
      makeGamePlay([{ win: '1' }, { win: '1' }]),
      makeGamePlay([{ win: '1' }, { win: '1' }]),
      makeGamePlay([{ win: '1' }, { win: '1' }]),
    ];
    expect(getGameType(plays)).toBe('co-op');
  });

  test('87.5% all-win plays (7/8) → co-op (> 80%)', () => {
    const allWin = Array(7).fill(makeGamePlay([{ win: '1' }, { win: '1' }]));
    const notAllWin = [makeGamePlay([{ win: '1' }, { win: '0' }])];
    expect(getGameType(allWin.concat(notAllWin))).toBe('co-op');
  });

  test('exactly 80% all-win plays → NOT co-op (must be strictly > 80)', () => {
    // parseInt(80%) = 80, NOT > 80
    const allWin = Array(4).fill(makeGamePlay([{ win: '1' }, { win: '1' }]));
    const notAllWin = Array(1).fill(makeGamePlay([{ win: '1' }, { win: '0' }]));
    // 4/5 = 80% → parseInt = 80 → NOT > 80
    const result = getGameType(allWin.concat(notAllWin));
    expect(result).not.toBe('co-op');
  });

  test('lowest scorer wins > 25% → lowest-wins', () => {
    const plays = [
      makeGamePlay([{ score: '10', win: '1' }, { score: '20', win: '0' }]), // lowest wins
      makeGamePlay([{ score: '10', win: '1' }, { score: '20', win: '0' }]), // lowest wins
      makeGamePlay([{ score: '20', win: '1' }, { score: '10', win: '0' }]), // highest wins
      makeGamePlay([{ score: '20', win: '1' }, { score: '10', win: '0' }]), // highest wins
    ];
    // 2/4 = 50% → parseInt = 50 > 25 → lowest-wins
    expect(getGameType(plays)).toBe('lowest-wins');
  });

  test('exactly 25% lowest-wins → NOT lowest-wins (must be strictly > 25)', () => {
    const lowest = [makeGamePlay([{ score: '10', win: '1' }, { score: '20', win: '0' }])];
    const highest = Array(3).fill(makeGamePlay([{ score: '20', win: '1' }, { score: '10', win: '0' }]));
    // 1/4 = 25% → parseInt = 25 → NOT > 25
    expect(getGameType(lowest.concat(highest))).toBe('highest-wins');
  });

  test('no plays with wins → defaults to highest-wins', () => {
    const plays = [makeGamePlay([{ score: '100', win: '0' }, { score: '80', win: '0' }])];
    expect(getGameType(plays)).toBe('highest-wins');
  });

  test('highest scorer always wins → highest-wins', () => {
    const plays = [
      makeGamePlay([{ score: '100', win: '1' }, { score: '80', win: '0' }]),
      makeGamePlay([{ score: '120', win: '1' }, { score: '90', win: '0' }]),
    ];
    expect(getGameType(plays)).toBe('highest-wins');
  });
});

// ---------------------------------------------------------------------------
// getValidPlays
// ---------------------------------------------------------------------------

describe('getValidPlays', () => {
  test('complete play with valid scores → included', () => {
    const play = makePlay();
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(1);
  });

  test('incomplete play → excluded', () => {
    const play = makePlay({ incomplete: '1' });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('too few players → excluded', () => {
    // minplayers = 2, playerCount = 1
    const play = makePlay({
      playerCount: 1,
      players: [{ score: '100', win: '1', color: 'red', new: '0', startposition: '1' }],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('too many players → excluded', () => {
    // maxplayers = 4, playerCount = 5
    const play = makePlay({ playerCount: 5 });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('play date before game published → excluded', () => {
    // yearpublished = 2015; 2014-12-31 is not after 2014-12-31
    const play = makePlay({ date: '2014-12-31' });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('play date on first valid day → included', () => {
    // 2015-01-01 is after 2014-12-31
    const play = makePlay({ date: '2015-01-01' });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(1);
  });

  test('play date in the future → excluded', () => {
    const play = makePlay({ date: '2099-01-01' });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('non-numeric score → excluded', () => {
    const play = makePlay({
      players: [
        { score: 'abc', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '80', win: '0', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('empty score for a player → excluded (all must have numeric scores)', () => {
    const play = makePlay({
      players: [
        { score: '', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '80', win: '0', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('all zero scores → excluded', () => {
    const play = makePlay({
      players: [
        { score: '0', win: '0', color: 'red', new: '0', startposition: '1' },
        { score: '0', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('two zero scores → excluded (at most one zero allowed)', () => {
    const play = makePlay({
      playerCount: 3,
      players: [
        { score: '0', win: '0', color: 'red', new: '0', startposition: '1' },
        { score: '0', win: '0', color: 'blue', new: '0', startposition: '2' },
        { score: '100', win: '1', color: 'green', new: '0', startposition: '3' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('exactly one zero score → included', () => {
    const play = makePlay({
      players: [
        { score: '0', win: '0', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(1);
  });

  test('highest-wins: highest scorer does not win → excluded', () => {
    const play = makePlay({
      players: [
        { score: '100', win: '0', color: 'red', new: '0', startposition: '1' },
        { score: '80', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(0);
  });

  test('highest-wins: highest scorer wins → included', () => {
    const play = makePlay({
      players: [
        { score: '100', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '80', win: '0', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'highest-wins')).toHaveLength(1);
  });

  test('lowest-wins: lowest scorer does not win → excluded', () => {
    const play = makePlay({
      players: [
        { score: '80', win: '0', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'lowest-wins')).toHaveLength(0);
  });

  test('lowest-wins: lowest scorer wins → included', () => {
    const play = makePlay({
      players: [
        { score: '80', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '0', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    expect(getValidPlays([play], details, 'lowest-wins')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getColorKey
// ---------------------------------------------------------------------------

describe('getColorKey', () => {
  test('simple color → lowercased with prefix', () => {
    expect(getColorKey('Red')).toBe('color-red');
  });

  test('multi-word → spaces become dashes', () => {
    expect(getColorKey('Light Blue')).toBe('color-light-blue');
  });

  test('leading/trailing spaces → trimmed', () => {
    expect(getColorKey('  Blue  ')).toBe('color-blue');
  });

  test('dots removed', () => {
    expect(getColorKey('St. Patrick')).toBe('color-st-patrick');
  });

  test("apostrophes removed", () => {
    expect(getColorKey("Patrick's")).toBe('color-patricks');
  });

  test('dashes preserved', () => {
    expect(getColorKey('Dark-Blue')).toBe('color-dark-blue');
  });
});

// ---------------------------------------------------------------------------
// getKeysFromResult
// ---------------------------------------------------------------------------

describe('getKeysFromResult', () => {
  test('generates all key → includes all key', () => {
    const result = { playerCount: 2, finishPosition: 1, startPosition: '', year: 2020, month: 6, color: '', score: 100, id: 'p1', isWin: true, isTieBreakerWin: false, isSharedWin: false, new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('all');
  });

  test('count key generated for playerCount', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: '', year: 2020, month: 6, color: '', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('count-3');
  });

  test('start position key generated when startPosition <= playerCount', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: 2, year: 2020, month: 6, color: '', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('count-3-start-2');
  });

  test('start position key NOT generated when startPosition > playerCount', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: 5, year: 2020, month: 6, color: '', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).not.toHaveProperty('count-3-start-5');
  });

  test('finish position key generated', () => {
    const result = { playerCount: 3, finishPosition: 2, startPosition: '', year: 2020, month: 6, color: '', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('count-3-finish-2');
  });

  test('new key generated when new > 0', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: '', year: 2020, month: 6, color: '', score: 100, id: 'p1', new: 1 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('count-3-new');
  });

  test('year and year-month keys generated', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: '', year: 2023, month: 4, color: '', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('year-2023');
    expect(keys).toHaveProperty('year-2023-month-4');
  });

  test('color key generated and normalized', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: '', year: 2023, month: 4, color: 'light blue', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    expect(keys).toHaveProperty('color-light-blue');
  });

  test('no color key when color is empty string', () => {
    const result = { playerCount: 3, finishPosition: 1, startPosition: '', year: 2023, month: 4, color: '', score: 100, id: 'p1', new: 0 };
    const keys = getKeysFromResult(result);
    const colorKeys = Object.keys(keys).filter((k) => k.startsWith('color-'));
    expect(colorKeys).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getResultsWithExpected
// ---------------------------------------------------------------------------

describe('getResultsWithExpected', () => {
  test('single player count → expectedMean equals that count mean', () => {
    const playerCountMeans = { 3: 100 };
    const results = {
      'color-red': { playerCounts: { 3: 5 }, scores: { 100: 5 } },
    };
    const out = getResultsWithExpected(results, playerCountMeans);
    expect(out['color-red'].expectedMean).toBe('100.00');
  });

  test('single player count → expectedWinPercentage = 100/playerCount', () => {
    const playerCountMeans = { 3: 100 };
    const results = {
      'color-red': { playerCounts: { 3: 5 }, scores: { 100: 5 } },
    };
    const out = getResultsWithExpected(results, playerCountMeans);
    // 100/3 ≈ 33.33
    expect(out['color-red'].expectedWinPercentage).toBe('33.33');
  });

  test('two player counts equally weighted → expectedMean is average of their means', () => {
    // count-3 mean=90 (5 plays), count-4 mean=110 (5 plays)
    // expectedMean = mean([90×5, 110×5]) = 100.00
    const playerCountMeans = { 3: 90, 4: 110 };
    const results = {
      'color-red': { playerCounts: { 3: 5, 4: 5 }, scores: {} },
    };
    const out = getResultsWithExpected(results, playerCountMeans);
    expect(out['color-red'].expectedMean).toBe('100.00');
  });

  test('two player counts equally weighted → expectedWinPercentage is weighted average', () => {
    // 100/3 ≈ 33.33 (5 times), 100/4 = 25 (5 times)
    // mean = (5×33.33 + 5×25) / 10 ≈ 29.17
    const playerCountMeans = { 3: 90, 4: 110 };
    const results = {
      'color-red': { playerCounts: { 3: 5, 4: 5 }, scores: {} },
    };
    const out = getResultsWithExpected(results, playerCountMeans);
    expect(parseFloat(out['color-red'].expectedWinPercentage)).toBeCloseTo(29.17, 1);
  });

  test('player count with undefined mean → skipped, does not crash', () => {
    const playerCountMeans = { 3: undefined, 4: 110 };
    const results = {
      'color-red': { playerCounts: { 3: 5, 4: 5 }, scores: {} },
    };
    expect(() => getResultsWithExpected(results, playerCountMeans)).not.toThrow();
    const out = getResultsWithExpected(results, playerCountMeans);
    // Only count-4 contributes → expectedMean = 110.00
    expect(out['color-red'].expectedMean).toBe('110.00');
  });

  test('result with new flag → expectedMean from player count lookup', () => {
    const playerCountMeans = { 4: 130 };
    const results = {
      'count-4-new': { new: 1, playerCount: 4, scores: {} },
    };
    const out = getResultsWithExpected(results, playerCountMeans);
    expect(out['count-4-new'].expectedMean).toBe(130);
    expect(out['count-4-new'].expectedWinPercentage).toBe('25.00');
  });

  test('result without playerCounts → returned unchanged', () => {
    const playerCountMeans = { 4: 130 };
    const results = {
      'year-2023': { year: 2023, scores: { 100: 5 } },
    };
    const out = getResultsWithExpected(results, playerCountMeans);
    expect(out['year-2023'].expectedMean).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// filterResults — color frequency threshold
// ---------------------------------------------------------------------------

describe('filterResults', () => {
  const makeColorResult = (color, playCount) => ({ color, playCount, scores: {} });

  test('non-color keys always kept', () => {
    const results = {
      all: { scores: { 100: 5 } },
      'count-4': { playerCount: 4, scores: { 100: 5 } },
    };
    const out = filterResults(results);
    expect(out).toHaveProperty('all');
    expect(out).toHaveProperty('count-4');
  });

  test('color with playCount=1 → excluded', () => {
    const results = {
      'color-red': makeColorResult('red', 1),
      'color-blue': makeColorResult('blue', 10),
    };
    const out = filterResults(results);
    expect(out).not.toHaveProperty('color-red');
    expect(out).toHaveProperty('color-blue');
  });

  test('color below 0.1% of total → excluded', () => {
    // 1 play out of 1001 total = 0.0999% < 0.1%
    const results = {
      'color-rare': makeColorResult('rare', 1),
      'color-common': makeColorResult('common', 1000),
    };
    const out = filterResults(results);
    expect(out).not.toHaveProperty('color-rare');
  });

  test('color at exactly 0.1% → included', () => {
    // 2 out of 2000 = exactly 0.1%; playCount > 1 also satisfied
    const results = {
      'color-exact': makeColorResult('exact', 2),
      'color-big': makeColorResult('big', 1998),
    };
    const out = filterResults(results);
    expect(out).toHaveProperty('color-exact');
  });

  test('color with invalid characters → excluded', () => {
    // Color with characters outside [a-zA-Z0-9'-. ] fails the regex
    const results = {
      'color-bad': { color: 'bad$color', playCount: 100, scores: {} },
      'color-good': makeColorResult('good', 100),
    };
    const out = filterResults(results);
    expect(out).not.toHaveProperty('color-bad');
    expect(out).toHaveProperty('color-good');
  });
});

// ---------------------------------------------------------------------------
// getPlayerResultsFromPlays — tie-breaking logic
// ---------------------------------------------------------------------------

describe('getPlayerResultsFromPlays', () => {
  test('clear winner → no tie flags', () => {
    const plays = [makePlay()];
    const results = getPlayerResultsFromPlays(plays, 'highest-wins');
    const winner = results.find((r) => r.isWin);
    expect(winner.isTieBreakerWin).toBe(false);
    expect(winner.isSharedWin).toBe(false);
  });

  test('two players tied score, one wins → tieBreakerWin true for winner', () => {
    const play = makePlay({
      players: [
        { score: '100', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '0', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    const results = getPlayerResultsFromPlays([play], 'highest-wins');
    const winner = results.find((r) => r.isWin);
    expect(winner.isTieBreakerWin).toBe(true);
    expect(winner.isSharedWin).toBe(false);
  });

  test('two players tied score, both win → sharedWin true, no tieBreaker', () => {
    const play = makePlay({
      players: [
        { score: '100', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    const results = getPlayerResultsFromPlays([play], 'highest-wins');
    const winners = results.filter((r) => r.isWin);
    winners.forEach((w) => expect(w.isTieBreakerWin).toBe(false));
    expect(results.some((r) => r.isSharedWin)).toBe(true);
  });

  test('shared win places both players at finishPosition 1', () => {
    const play = makePlay({
      players: [
        { score: '100', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    const results = getPlayerResultsFromPlays([play], 'highest-wins');
    results.forEach((r) => expect(r.finishPosition).toBe(1));
  });

  test('2nd place tie does not affect first place win flags', () => {
    const play = makePlay({
      playerCount: 3,
      players: [
        { score: '150', win: '1', color: 'red', new: '0', startposition: '1' },
        { score: '100', win: '0', color: 'blue', new: '0', startposition: '2' },
        { score: '100', win: '0', color: 'green', new: '0', startposition: '3' },
      ],
    });
    const results = getPlayerResultsFromPlays([play], 'highest-wins');
    const winner = results.find((r) => r.isWin);
    expect(winner.isTieBreakerWin).toBe(false);
    expect(winner.isSharedWin).toBe(false);
    expect(winner.finishPosition).toBe(1);
  });

  test('lowest-wins: players sorted ascending by score', () => {
    const play = makePlay({
      players: [
        { score: '200', win: '0', color: 'red', new: '0', startposition: '1' },
        { score: '50', win: '1', color: 'blue', new: '0', startposition: '2' },
      ],
    });
    const results = getPlayerResultsFromPlays([play], 'lowest-wins');
    // lowest score (50) should be finishPosition 1
    const first = results.find((r) => r.finishPosition === 1);
    expect(first.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// getCombinedResults
// ---------------------------------------------------------------------------

describe('getCombinedResults', () => {
  test('merges new scores with existing scores', () => {
    const newResults = {
      all: { scores: { 100: 3 }, wins: { 100: 1 }, tieBreakerWins: {}, sharedWins: {} },
    };
    const existing = [{ id: 'all', scores: { 80: 2 }, wins: { 80: 1 }, tieBreakerWins: {}, sharedWins: {} }];
    const out = getCombinedResults(newResults, existing);
    expect(out.all.scores).toEqual({ 100: 3, 80: 2 });
  });

  test('NaN key is removed from scores', () => {
    const newResults = {
      all: { scores: { NaN: 1, 100: 3 }, wins: {}, tieBreakerWins: {}, sharedWins: {} },
    };
    const out = getCombinedResults(newResults, []);
    expect(out.all.scores['NaN']).toBeUndefined();
    expect(out.all.scores[100]).toBe(3);
  });

  test('no existing result → uses new result scores', () => {
    const newResults = {
      all: { scores: { 100: 3 }, wins: {}, tieBreakerWins: {}, sharedWins: {} },
    };
    const out = getCombinedResults(newResults, []);
    expect(out.all.scores).toEqual({ 100: 3 });
  });

  test('existing outlierScores preserved', () => {
    const newResults = {
      all: { scores: { 100: 3 }, wins: {}, tieBreakerWins: {}, sharedWins: {} },
    };
    const existing = [{ id: 'all', scores: { 80: 2 }, outlierScores: { 500: 1 }, wins: {}, tieBreakerWins: {}, sharedWins: {} }];
    const out = getCombinedResults(newResults, existing);
    expect(out.all.outlierScores).toEqual({ 500: 1 });
  });
});

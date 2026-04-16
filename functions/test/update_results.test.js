const { initializeApp } = require('firebase-admin/app');
const { mockBatchSet, mockBatchUpdate } = require('firestore-jest-mock/mocks/firestore');
const { mockGoogleCloudFirestore } = require('firestore-jest-mock');

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

mockGoogleCloudFirestore({
  database: {
    games: [{ id: '1', name: 'Test Game', totalScores: 0, _collections: { results: [] } }],
    details: [{ id: '1', minplayers: 2, maxplayers: 4, yearpublished: 2010 }],
  },
});

initializeApp();

const { Firestore } = require('@google-cloud/firestore');
const update = require('../update_results');
const game = { id: '1', name: 'Test Game', totalScores: 0 };

// ---------------------------------------------------------------------------
// Background data strategy
//
// 20 plays, 4 players each, scores [90, 95, 98, 100].
// With equal counts this gives:
//   median = 96.5, leftMad = 2.5, rightMad = 1
//   left cutoff = 96.5 - 2.5×8 = 76.5   (90 safely above)
//   right cutoff = 96.5 + 1×8 = 104.5   (100 safely below)
//
// Any test play that adds scores within [77, 104] won't shift outlier detection.
// The 4-value spread (90, 95, 98, 100) keeps both leftMad and rightMad > 0,
// avoiding the Infinity-division edge case that occurs when MAD collapses to 0.
// ---------------------------------------------------------------------------

const makeBackgroundPlays = () =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `bg-${i}`,
    date: '2021-01-01',
    incomplete: '0',
    playerCount: 4,
    players: [
      { score: '100', win: '1', color: 'red',   new: '0', startposition: '1' },
      { score: '98',  win: '0', color: 'blue',  new: '0', startposition: '2' },
      { score: '95',  win: '0', color: 'green', new: '0', startposition: '3' },
      { score: '90',  win: '0', color: 'black', new: '0', startposition: '4' },
    ],
  }));

const makeTestPlay = (players) => ({
  id: 'test-1',
  date: '2021-03-27',
  incomplete: '0',
  playerCount: 4,
  players,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Update Results', () => {
  let batch;

  beforeAll(() => {
    batch = new Firestore().batch();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // basic update — no ties
  // -------------------------------------------------------------------------

  test('records scores and win correctly for a clear winner', async () => {
    // Test play is identical to the background distribution.
    // Total: {90:21, 95:21, 98:21, 100:21} = 84 scores. No outliers.
    const plays = [
      ...makeBackgroundPlays(),
      makeTestPlay([
        { score: '100', win: '1', color: 'red',   new: '0', startposition: '1' },
        { score: '98',  win: '0', color: 'blue',  new: '0', startposition: '2' },
        { score: '95',  win: '0', color: 'green', new: '0', startposition: '3' },
        { score: '90',  win: '0', color: 'black', new: '0', startposition: '4' },
      ]),
    ];

    await update.updateResults(game, batch, plays);

    // Call #1 is always the "all" result (inserted first in keyedResults).
    const [, allResult] = mockBatchSet.mock.calls[0];
    expect(allResult.scores).toEqual({ 90: 21, 95: 21, 98: 21, 100: 21 });
    expect(allResult.wins).toEqual({ 100: 21 });
    expect(allResult.tieBreakerWins).toEqual({});
    expect(allResult.sharedWins).toEqual({});
    expect(allResult.outlierScores).toEqual({});
    expect(allResult.outlierScoreCount).toBe(0);
    expect(allResult.scoreCount).toBe(84);
    expect(allResult.trimmedWinCount).toBe(21);
    expect(allResult.trimmedWinPercentage).toBe('25.00'); // 21/84 × 100

    const [, gameUpdate] = mockBatchUpdate.mock.calls[0];
    expect(gameUpdate.gameType).toBe('highest-wins');
    expect(gameUpdate.totalScores).toBe(84);
    expect(gameUpdate.totalValidPlays).toBe(21);
    expect(gameUpdate.totalInvalidPlays).toBe(0);
    expect(gameUpdate.playerCounts).toEqual([4]);
  });

  // -------------------------------------------------------------------------
  // tie-break — shared top score, only one player wins
  // -------------------------------------------------------------------------

  test('records tieBreakerWin when two players share the top score but only one wins', async () => {
    // Test play: [100, 100, 95, 90] — two tied at 100, only the first wins.
    // Total: {90:21, 95:21, 98:20, 100:22}
    // rightMad = mad([98:20, 100:22]) = 2  →  right cutoff = 96.5 + 2×8 = 112.5. No outliers.
    const plays = [
      ...makeBackgroundPlays(),
      makeTestPlay([
        { score: '100', win: '1', color: 'red',   new: '0', startposition: '1' },
        { score: '100', win: '0', color: 'blue',  new: '0', startposition: '2' },
        { score: '95',  win: '0', color: 'green', new: '0', startposition: '3' },
        { score: '90',  win: '0', color: 'black', new: '0', startposition: '4' },
      ]),
    ];

    await update.updateResults(game, batch, plays);

    const [, allResult] = mockBatchSet.mock.calls[0];
    expect(allResult.wins).toEqual({ 100: 21 });          // 20 bg + 1 tie-break winner
    expect(allResult.tieBreakerWins).toEqual({ 100: 1 }); // only the test play produced a tie-break
    expect(allResult.sharedWins).toEqual({});
    // Note: trimmedTieBreakerWinCount depends on the winner score not being flagged as
    // an outlier, which is brittle in integration tests with small datasets.
    // The trimmed counts are tested directly in the addStatsToResult unit tests.
  });

  // -------------------------------------------------------------------------
  // actual (shared) tie — both top-scorers win
  // -------------------------------------------------------------------------

  test('records sharedWin when two players share the top score and both win', async () => {
    // Test play: [100, 100, 95, 90] — both at 100 win.
    // Same score distribution as tie-break test. No outliers.
    // isSharedWin is only true for the first player in sorted order (i===0),
    // so sharedWins[100] = 1, not 2, even though two players won.
    const plays = [
      ...makeBackgroundPlays(),
      makeTestPlay([
        { score: '100', win: '1', color: 'red',   new: '0', startposition: '1' },
        { score: '100', win: '1', color: 'blue',  new: '0', startposition: '2' },
        { score: '95',  win: '0', color: 'green', new: '0', startposition: '3' },
        { score: '90',  win: '0', color: 'black', new: '0', startposition: '4' },
      ]),
    ];

    await update.updateResults(game, batch, plays);

    const [, allResult] = mockBatchSet.mock.calls[0];
    expect(allResult.wins).toEqual({ 100: 22 });       // 20 bg + 2 from the shared win
    expect(allResult.sharedWins).toEqual({ 100: 1 });  // isSharedWin only set for i===0
    expect(allResult.tieBreakerWins).toEqual({});
  });

  // -------------------------------------------------------------------------
  // 2nd-place tie — tie below the winner does not affect first-place flags
  // -------------------------------------------------------------------------

  test('2nd-place tie does not set tieBreakerWin or sharedWin on the clear winner', async () => {
    // Test play: [100, 95, 95, 90] — clear winner at 100, two players tie for 2nd at 95.
    const plays = [
      ...makeBackgroundPlays(),
      makeTestPlay([
        { score: '100', win: '1', color: 'red',   new: '0', startposition: '1' },
        { score: '95',  win: '0', color: 'blue',  new: '0', startposition: '2' },
        { score: '95',  win: '0', color: 'green', new: '0', startposition: '3' },
        { score: '90',  win: '0', color: 'black', new: '0', startposition: '4' },
      ]),
    ];

    await update.updateResults(game, batch, plays);

    const [, allResult] = mockBatchSet.mock.calls[0];
    expect(allResult.wins).toEqual({ 100: 21 });
    expect(allResult.tieBreakerWins).toEqual({});
    expect(allResult.sharedWins).toEqual({});
    expect(allResult.trimmedTieBreakerWinCount).toBe(0);
    expect(allResult.trimmedSharedWinCount).toBe(0);
  });
});

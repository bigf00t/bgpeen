const { initializeApp } = require('firebase-admin/app');
const { mockBatchSet, mockBatchUpdate } = require('firestore-jest-mock/mocks/firestore');

const { mockGoogleCloudFirestore } = require('firestore-jest-mock');

describe('Update Results', () => {
  mockGoogleCloudFirestore({
    database: {
      games: [
        {
          id: '1',
          name: 'Test Game 1',
          totalScores: 0,
          _collections: {
            results: [],
          },
        },
      ],
      details: [
        {
          id: '1',
          minplayers: 1,
          maxplayers: 4,
        },
      ],
    },
  });

  initializeApp();

  const { Firestore } = require('@google-cloud/firestore');
  const firestore = new Firestore();

  const update = require('../update_results');

  const game = { id: '1', name: 'Test Game', totalScores: 0 };

  const batch = firestore.batch();

  const anythingExpectedResult = {
    scores: expect.anything(),
    outlierScores: expect.anything(),
    playCount: expect.anything(),
    mean: expect.anything(),
    std: expect.anything(),
    median: expect.anything(),
    mode: expect.anything(),
    scoreCount: expect.anything(),
    wins: expect.anything(),
    winPercentage: expect.anything(),
    sharedWinCount: expect.anything(),
    tieBreakerWinCount: expect.anything(),
    sharedWins: expect.anything(),
    tieBreakerWins: expect.anything(),
  };

  let newPlays = [];

  beforeEach(() => {
    newPlays = [
      {
        id: '1',
        userid: '1562568',
        date: '2021-03-27',
        quantity: '1',
        length: '180',
        incomplete: '0',
        nowinstats: '0',
        location: "Mike's house",
        players: [
          {
            username: 'Gamer for Life',
            userid: '1562568',
            name: 'Wayne Costain',
            startposition: 'Forth',
            color: 'Black',
            score: '147',
            new: '1',
            rating: '0',
            win: '1',
          },
          {
            username: 'Silverminer',
            userid: '926385',
            name: 'Michael Canty',
            startposition: 'Second',
            color: 'Green',
            score: '121',
            new: '0',
            rating: '0',
            win: '0',
          },
          {
            username: '',
            userid: '0',
            name: 'Erik',
            startposition: 'Third',
            color: 'Red',
            score: '123',
            new: '1',
            rating: '0',
            win: '0',
          },
          {
            username: '',
            userid: '0',
            name: 'Ivor',
            startposition: 'First',
            color: 'Blue',
            score: '136',
            new: '1',
            rating: '0',
            win: '0',
          },
        ],
        playerCount: 4,
      },
    ];

    jest.clearAllMocks();
  });

  test('basic update', async () => {
    const expectedResult = {
      scores: { 121: 1, 123: 1, 136: 1, 147: 1 },
      wins: { 147: 1 },
      outlierScores: {},
      playCount: 1,
      mean: '131.75',
      std: '12.15',
      median: 129.5,
      mode: 121,
      scoreCount: 4,
      winPercentage: 25,
      sharedWinCount: 0,
      tieBreakerWinCount: 0,
      sharedWins: {},
      tieBreakerWins: {},
    };

    const expectedGame = {
      gameType: 'highest-wins',
      mean: '131.75',
      playerCounts: '4',
      totalInvalidPlays: 0,
      totalScores: 4,
      totalValidPlays: 1,
    };

    await update.updateResults(game, batch, newPlays);

    expect(mockBatchSet).toHaveBeenNthCalledWith(1, expect.anything(), expectedResult, expect.anything());
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), expectedGame);
  });

  test('tie break', async () => {
    newPlays[0].players[0].score = '147';
    newPlays[0].players[1].score = '147';
    newPlays[0].players[0].win = '1';
    newPlays[0].players[1].win = '0';

    const expectedResult = {
      ...anythingExpectedResult,
      wins: { 147: 1 },
      winPercentage: 25,
      sharedWinCount: 0,
      tieBreakerWinCount: 1,
      sharedWins: {},
      tieBreakerWins: { 147: 1 },
    };

    await update.updateResults(game, batch, newPlays);

    expect(mockBatchSet).toHaveBeenNthCalledWith(1, expect.anything(), expectedResult, expect.anything());
  });

  test('actual tie', async () => {
    newPlays[0].players[0].score = '147';
    newPlays[0].players[1].score = '147';
    newPlays[0].players[0].win = '1';
    newPlays[0].players[1].win = '1';

    const expectedResult = {
      ...anythingExpectedResult,
      wins: { 147: 2 },
      winPercentage: 50,
      sharedWinCount: 2,
      tieBreakerWinCount: 0,
      sharedWins: { 147: 2 },
      tieBreakerWins: {},
    };

    await update.updateResults(game, batch, newPlays);

    expect(mockBatchSet).toHaveBeenNthCalledWith(1, expect.anything(), expectedResult, expect.anything());
  });

  test('2nd place tie', async () => {
    newPlays[0].players[0].score = '147';
    newPlays[0].players[1].score = '140';
    newPlays[0].players[2].score = '140';
    newPlays[0].players[0].win = '1';
    newPlays[0].players[1].win = '0';
    newPlays[0].players[2].win = '0';

    const expectedResult = {
      ...anythingExpectedResult,
      wins: { 147: 1 },
      winPercentage: 25,
      sharedWinCount: 0,
      tieBreakerWinCount: 0,
      sharedWins: {},
      tieBreakerWins: {},
    };

    await update.updateResults(game, batch, newPlays);

    expect(mockBatchSet).toHaveBeenNthCalledWith(1, expect.anything(), expectedResult, expect.anything());
  });
});

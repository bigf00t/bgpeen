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
  let newPlays = [
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

  let game = { id: '1', name: 'Test Game', totalScores: 0 };

  const batch = firestore.batch();
  const gameRef = firestore.collection('games').doc('1');
  const resultsRef = firestore.collection('games').doc(game.id).collection('results');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('basic update', async () => {
    await update.updateResults(game, batch, newPlays);

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
      tiesCount: 0,
    };

    expect(mockBatchSet).toHaveBeenCalledWith(resultsRef.doc('all'), expectedResult, { merge: false });

    const expectedGame = {
      gameType: 'highest-wins',
      mean: '131.75',
      playerCounts: '4',
      totalInvalidPlays: 0,
      totalScores: 4,
      totalValidPlays: 1,
    };

    expect(mockBatchUpdate).toHaveBeenCalledWith(gameRef, expectedGame);
  });

  test('tie break', async () => {
    newPlays[0].players[1].score = '147';

    await update.updateResults(game, batch, newPlays);

    const expectedResult = {
      scores: { 123: 1, 136: 1, 147: 2 },
      wins: { 147: 1 },
      outlierScores: {},
      playCount: 1,
      mean: '138.25',
      std: '11.41',
      median: 141.5,
      mode: 147,
      scoreCount: 4,
      winPercentage: 25,
      tiesCount: 2,
    };

    expect(mockBatchSet).toHaveBeenCalledWith(resultsRef.doc('all'), expectedResult, { merge: false });

    const expectedGame = {
      gameType: 'highest-wins',
      mean: '138.25',
      playerCounts: '4',
      totalInvalidPlays: 0,
      totalScores: 4,
      totalValidPlays: 1,
    };

    expect(mockBatchUpdate).toHaveBeenCalledWith(gameRef, expectedGame);
  });

  test('actual tie', async () => {
    newPlays[0].players[1].win = '1';
    newPlays[0].players[1].score = '147';

    await update.updateResults(game, batch, newPlays);

    const expectedResult = {
      scores: { 123: 1, 136: 1, 147: 2 },
      wins: { 147: 2 },
      outlierScores: {},
      playCount: 1,
      mean: '138.25',
      std: '11.41',
      median: 141.5,
      mode: 147,
      scoreCount: 4,
      winPercentage: 50,
      tiesCount: 2,
    };

    expect(mockBatchSet).toHaveBeenCalledWith(resultsRef.doc('all'), expectedResult, { merge: false });

    const expectedGame = {
      gameType: 'highest-wins',
      mean: '138.25',
      playerCounts: '4',
      totalInvalidPlays: 0,
      totalScores: 4,
      totalValidPlays: 1,
    };

    expect(mockBatchUpdate).toHaveBeenCalledWith(gameRef, expectedGame);
  });

  test('2nd place tie', async () => {
    newPlays[0].players[1].win = '0';
    newPlays[0].players[1].score = '145';
    newPlays[0].players[2].score = '145';

    await update.updateResults(game, batch, newPlays);

    const expectedResult = {
      scores: { 136: 1, 145: 2, 147: 1 },
      wins: { 147: 1 },
      outlierScores: {},
      playCount: 1,
      mean: '143.25',
      std: '4.92',
      median: 145,
      mode: 145,
      scoreCount: 4,
      winPercentage: 25,
      tiesCount: 2,
    };

    expect(mockBatchSet).toHaveBeenCalledWith(resultsRef.doc('all'), expectedResult, { merge: false });

    const expectedGame = {
      gameType: 'highest-wins',
      mean: '143.25',
      playerCounts: '4',
      totalInvalidPlays: 0,
      totalScores: 4,
      totalValidPlays: 1,
    };

    expect(mockBatchUpdate).toHaveBeenCalledWith(gameRef, expectedGame);
  });
});

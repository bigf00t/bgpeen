jest.mock('../updatePlays');
jest.mock('../updateResults');
jest.mock('firebase-admin/firestore');

const { handler } = require('../gameCreatedHandler');
const updatePlays = require('../updatePlays');
const updateResults = require('../updateResults');
const { getFirestore } = require('firebase-admin/firestore');

const makeEvent = (gameId, data) => ({
  params: { gameId },
  data: { data: () => data },
});

const makeBatch = () => ({ commit: jest.fn().mockResolvedValue(undefined) });

beforeEach(() => jest.clearAllMocks());

test('runs two update phases with correct page limits', async () => {
  const batch1 = makeBatch();
  const batch2 = makeBatch();
  getFirestore.mockReturnValue({
    batch: jest.fn().mockReturnValueOnce(batch1).mockReturnValueOnce(batch2),
  });
  updatePlays.updateGamePlays.mockResolvedValue([{ id: 'play-1' }]);
  updateResults.updateResults.mockResolvedValue(undefined);

  await handler(makeEvent('42', { name: 'Catan' }));

  expect(updatePlays.updateGamePlays).toHaveBeenCalledTimes(2);
  expect(updatePlays.updateGamePlays).toHaveBeenNthCalledWith(1, { id: '42', name: 'Catan' }, batch1, 5);
  expect(updatePlays.updateGamePlays).toHaveBeenNthCalledWith(2, { id: '42', name: 'Catan' }, batch2, 100);
  expect(updateResults.updateResults).toHaveBeenCalledTimes(2);
  expect(batch1.commit).toHaveBeenCalledTimes(1);
  expect(batch2.commit).toHaveBeenCalledTimes(1);
});

test('commits phase 1 before starting phase 2', async () => {
  const callOrder = [];
  const batch1 = { commit: jest.fn().mockImplementation(() => { callOrder.push('commit1'); return Promise.resolve(); }) };
  const batch2 = { commit: jest.fn().mockImplementation(() => { callOrder.push('commit2'); return Promise.resolve(); }) };
  getFirestore.mockReturnValue({ batch: jest.fn().mockReturnValueOnce(batch1).mockReturnValueOnce(batch2) });
  updatePlays.updateGamePlays
    .mockImplementationOnce(() => { callOrder.push('phase1-fetch'); return Promise.resolve([]); })
    .mockImplementationOnce(() => { callOrder.push('phase2-fetch'); return Promise.resolve([]); });
  updateResults.updateResults.mockResolvedValue(undefined);

  await handler(makeEvent('42', { name: 'Catan' }));

  expect(callOrder).toEqual(['phase1-fetch', 'commit1', 'phase2-fetch', 'commit2']);
});

test('phase 2 still runs when phase 1 returns empty plays', async () => {
  const batch1 = makeBatch();
  const batch2 = makeBatch();
  getFirestore.mockReturnValue({ batch: jest.fn().mockReturnValueOnce(batch1).mockReturnValueOnce(batch2) });
  updatePlays.updateGamePlays.mockResolvedValue([]);
  updateResults.updateResults.mockResolvedValue(undefined);

  await handler(makeEvent('42', { name: 'Catan' }));

  expect(updatePlays.updateGamePlays).toHaveBeenCalledTimes(2);
  expect(batch1.commit).toHaveBeenCalledTimes(1);
  expect(batch2.commit).toHaveBeenCalledTimes(1);
});

test('game object includes id from event params and fields from doc data', async () => {
  const batch = makeBatch();
  getFirestore.mockReturnValue({ batch: jest.fn().mockReturnValue(batch) });
  updatePlays.updateGamePlays.mockResolvedValue([]);
  updateResults.updateResults.mockResolvedValue(undefined);

  await handler(makeEvent('99', { name: 'Wingspan', totalScores: 0 }));

  expect(updatePlays.updateGamePlays.mock.calls[0][0]).toEqual({ id: '99', name: 'Wingspan', totalScores: 0 });
});

jest.mock('../addGame');
jest.mock('firebase-admin/firestore');

const { handler } = require('../addGameHandler');
const addGame = require('../addGame');
const { getFirestore } = require('firebase-admin/firestore');

// Minimal req/res helpers
const makeReq = (method, body) => ({ method, body });
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

test('returns 405 for non-POST', async () => {
  const res = makeRes();
  await handler(makeReq('GET', {}), res);
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
});

test('returns 400 for missing term', async () => {
  const res = makeRes();
  await handler(makeReq('POST', {}), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing term' });
});

test('returns 400 for whitespace-only term', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { term: '   ' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing term' });
});

test('returns 200 with id/name when addGame succeeds', async () => {
  addGame.addGame.mockResolvedValue({ id: '42', name: 'Catan' });
  const res = makeRes();
  await handler(makeReq('POST', { term: 'Catan' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ id: '42', name: 'Catan' });
});

test('returns 200 from Firestore when addGame returns undefined (game existed)', async () => {
  addGame.addGame.mockResolvedValue(undefined);
  const mockGet = jest.fn().mockResolvedValue({
    empty: false,
    docs: [{ id: '99', data: () => ({ name: 'Wingspan' }) }],
  });
  getFirestore.mockReturnValue({
    collection: () => ({ where: () => ({ limit: () => ({ get: mockGet }) }) }),
  });
  const res = makeRes();
  await handler(makeReq('POST', { term: 'Wingspan' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ id: '99', name: 'Wingspan' });
});

test('returns 404 when addGame returns undefined and Firestore has no match', async () => {
  addGame.addGame.mockResolvedValue(undefined);
  getFirestore.mockReturnValue({
    collection: () => ({ where: () => ({ limit: () => ({ get: jest.fn().mockResolvedValue({ empty: true }) }) }) }),
  });
  const res = makeRes();
  await handler(makeReq('POST', { term: 'UnknownGame' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'Game not found on BoardGameGeek' });
});

test('returns 500 when addGame throws', async () => {
  addGame.addGame.mockRejectedValue(new Error('BGG timeout'));
  const res = makeRes();
  await handler(makeReq('POST', { term: 'Catan' }), res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Failed to add game' });
});

test('returns 200 from Firestore doc when addGame returns undefined and term is numeric', async () => {
  addGame.addGame.mockResolvedValue(undefined);
  getFirestore.mockReturnValue({
    collection: () => ({ doc: () => ({ get: jest.fn().mockResolvedValue({ exists: true, id: '12345', data: () => ({ name: 'Catan' }) }) }) }),
  });
  const res = makeRes();
  await handler(makeReq('POST', { term: '12345' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ id: '12345', name: 'Catan' });
});

test('returns 404 when addGame returns undefined and numeric-ID doc does not exist', async () => {
  addGame.addGame.mockResolvedValue(undefined);
  getFirestore.mockReturnValue({
    collection: () => ({ doc: () => ({ get: jest.fn().mockResolvedValue({ exists: false }) }) }),
  });
  const res = makeRes();
  await handler(makeReq('POST', { term: '12345' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: 'Game not found on BoardGameGeek' });
});

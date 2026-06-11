jest.mock('firebase-admin/auth');
jest.mock('../importBggScores');

const { getAuth } = require('firebase-admin/auth');
const { importBggScores } = require('../importBggScores');
const { handler } = require('../importBggHandler');

const makeReq = (method, body, headers = {}) => ({ method, body, headers });
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  getAuth.mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'uid123' }),
  });
});

const authedReq = (body) =>
  makeReq('POST', body, { authorization: 'Bearer valid-token' });

test('returns 405 for non-POST', async () => {
  const res = makeRes();
  await handler(makeReq('GET', {}, {}), res);
  expect(res.status).toHaveBeenCalledWith(405);
});

test('returns 401 when Authorization header is missing', async () => {
  const res = makeRes();
  await handler(makeReq('POST', { bggUsername: 'alice' }, {}), res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 401 when token is invalid', async () => {
  getAuth.mockReturnValue({
    verifyIdToken: jest.fn().mockRejectedValue(new Error('invalid')),
  });
  const res = makeRes();
  await handler(authedReq({ bggUsername: 'alice' }), res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test('returns 400 when bggUsername is missing', async () => {
  const res = makeRes();
  await handler(authedReq({}), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing bggUsername' });
});

test('returns 400 when bggUsername is whitespace-only', async () => {
  const res = makeRes();
  await handler(authedReq({ bggUsername: '   ' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('returns 200 with import result on success', async () => {
  importBggScores.mockResolvedValue({ imported: 5, skipped: 2 });
  const res = makeRes();
  await handler(authedReq({ bggUsername: 'alice' }), res);
  expect(importBggScores).toHaveBeenCalledWith('uid123', 'alice');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ imported: 5, skipped: 2 });
});

test('returns 502 when importBggScores throws', async () => {
  importBggScores.mockRejectedValue(new Error('BGG unreachable'));
  const res = makeRes();
  await handler(authedReq({ bggUsername: 'alice' }), res);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch plays from BGG' });
});

test('trims bggUsername before passing to importBggScores', async () => {
  importBggScores.mockResolvedValue({ imported: 0, skipped: 0 });
  const res = makeRes();
  await handler(authedReq({ bggUsername: '  alice  ' }), res);
  expect(importBggScores).toHaveBeenCalledWith('uid123', 'alice');
});

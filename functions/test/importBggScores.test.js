jest.mock('axios');
jest.mock('firebase-admin/firestore');
jest.mock('../util');

const axios = require('axios');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const util = require('../util');
const {
  getResultIdFromFilters,
  computePercentile,
  computeFinish,
  buildFilters,
  fetchAllBggPlays,
  importBggScores,
} = require('../importBggScores');

Timestamp.fromDate = jest.fn((d) => ({ _date: d }));

beforeEach(() => {
  jest.clearAllMocks();
  util.withRetry.mockImplementation((fn) => fn());
  util.getApiKey.mockReturnValue('test-key');
});

// --- getResultIdFromFilters ---

describe('getResultIdFromFilters', () => {
  test('returns "all" with no filters', () => {
    expect(getResultIdFromFilters(null)).toBe('all');
    expect(getResultIdFromFilters({})).toBe('all');
  });

  test('returns count result for players filter', () => {
    expect(getResultIdFromFilters({ players: 3 })).toBe('count-3');
  });

  test('appends start sub-filter', () => {
    expect(getResultIdFromFilters({ players: 3, start: 2 })).toBe('count-3-start-2');
  });

  test('appends finish sub-filter; start takes precedence over finish', () => {
    expect(getResultIdFromFilters({ players: 3, finish: 1 })).toBe('count-3-finish-1');
    expect(getResultIdFromFilters({ players: 3, start: 2, finish: 1 })).toBe('count-3-start-2');
  });

  test('appends new sub-filter', () => {
    expect(getResultIdFromFilters({ players: 3, new: true })).toBe('count-3-new');
  });

  test('returns color result', () => {
    expect(getResultIdFromFilters({ color: 'Blue' })).toBe('color-Blue');
  });

  test('players takes precedence over color', () => {
    expect(getResultIdFromFilters({ players: 3, color: 'Blue' })).toBe('count-3');
  });
});

// --- computePercentile ---

describe('computePercentile', () => {
  test('returns correct percentile', () => {
    const scores = { '40': 2, '50': 6, '60': 2 };
    expect(computePercentile(50, scores)).toBe(50);
  });

  test('returns null for empty scores', () => {
    expect(computePercentile(50, {})).toBe(null);
  });

  test('clamps to 1 minimum', () => {
    expect(computePercentile(1, { '50': 100 })).toBe(1);
  });

  test('clamps to 99 maximum', () => {
    expect(computePercentile(100, { '50': 100 })).toBe(99);
  });
});

// --- computeFinish ---

describe('computeFinish', () => {
  test('returns rank 1 for highest scorer', () => {
    const players = [
      { username: 'alice', score: '61' },
      { username: 'bob', score: '47' },
      { username: 'carol', score: '52' },
    ];
    expect(computeFinish(players, 'alice')).toBe(1);
  });

  test('returns rank 2 for middle scorer', () => {
    const players = [
      { username: 'alice', score: '52' },
      { username: 'bob', score: '47' },
      { username: 'carol', score: '61' },
    ];
    expect(computeFinish(players, 'alice')).toBe(2);
  });

  test('returns null for solo play', () => {
    expect(computeFinish([{ username: 'alice', score: '47' }], 'alice')).toBe(null);
  });

  test('returns null when only one player has a score', () => {
    const players = [
      { username: 'alice', score: '47' },
      { username: 'bob', score: '' },
    ];
    expect(computeFinish(players, 'alice')).toBe(null);
  });

  test('is case-insensitive', () => {
    const players = [
      { username: 'Alice', score: '61' },
      { username: 'Bob', score: '47' },
    ];
    expect(computeFinish(players, 'alice')).toBe(1);
  });
});

// --- buildFilters ---

describe('buildFilters', () => {
  test('extracts all available filters', () => {
    const attrs = [
      { username: 'alice', color: 'Blue', new: '0', startposition: '2', score: '47' },
      { username: 'bob', color: 'Red', new: '0', startposition: '1', score: '52' },
    ];
    // alice=47, bob=52 → alice finishes 2nd
    expect(buildFilters(attrs, 'alice', 2)).toEqual({
      players: 2,
      color: 'Blue',
      start: 2,
      finish: 2,
    });
  });

  test('sets new:true when player.new is "1"', () => {
    const attrs = [
      { username: 'alice', color: '', new: '1', startposition: '', score: '40' },
      { username: 'bob', color: '', new: '0', startposition: '', score: '50' },
    ];
    const result = buildFilters(attrs, 'alice', 2);
    expect(result.new).toBe(true);
  });

  test('omits start when startposition is absent', () => {
    const attrs = [
      { username: 'alice', color: 'Blue', new: '0', startposition: '', score: '47' },
      { username: 'bob', color: 'Red', new: '0', startposition: '', score: '52' },
    ];
    const result = buildFilters(attrs, 'alice', 2);
    expect(result.start).toBeUndefined();
  });

  test('returns null when target player not found', () => {
    expect(buildFilters([{ username: 'bob', score: '40' }], 'alice', 1)).toBe(null);
  });
});

// --- fetchAllBggPlays ---

describe('fetchAllBggPlays', () => {
  const makeXml = (total, plays) => `<?xml version="1.0" encoding="utf-8"?>
<plays username="testuser" total="${total}" page="1">
${plays}
</plays>`;

  const playXml = (id, gameName, objectid, players) => `
  <play id="${id}" date="2023-01-15" quantity="1" incomplete="0" nowinstats="1" location="">
    <item name="${gameName}" objectid="${objectid}" objecttype="thing" subtype="boardgame"/>
    <players>${players}</players>
  </play>`;

  const playerXml = (username, score, color = '', start = '', isNew = '0') =>
    `<player username="${username}" score="${score}" color="${color}" startposition="${start}" new="${isNew}" win="0" rating="0"/>`;

  test('returns empty array when total is 0', async () => {
    axios.get.mockResolvedValue({ data: makeXml(0, '') });
    const result = await fetchAllBggPlays('nobody');
    expect(result).toEqual([]);
  });

  test('returns plays from a single page', async () => {
    const xml = makeXml(
      1,
      playXml(
        '98765',
        'Wingspan',
        '266192',
        playerXml('testuser', '47', 'Blue', '2') + playerXml('other', '52', 'Red', '1')
      )
    );
    axios.get.mockResolvedValue({ data: xml });
    const result = await fetchAllBggPlays('testuser');
    expect(result).toHaveLength(1);
    expect(result[0]._attributes.id).toBe('98765');
  });
});

// --- importBggScores integration ---

describe('importBggScores', () => {
  const makeXml = (total, plays) => `<?xml version="1.0" encoding="utf-8"?>
<plays username="testuser" total="${total}" page="1">
${plays}
</plays>`;

  const singlePlayXml = makeXml(
    1,
    `<play id="98765" date="2023-01-15" quantity="1" incomplete="0" nowinstats="1" location="">
    <item name="Wingspan" objectid="266192" objecttype="thing" subtype="boardgame"/>
    <players>
      <player username="testuser" score="47" color="Blue" startposition="2" new="0" win="0" rating="0"/>
      <player username="other" score="52" color="Red" startposition="1" new="0" win="1" rating="0"/>
    </players>
  </play>`
  );

  const makeDb = ({ existingIds = [], thumbnail = '', resultScores = null } = {}) => {
    const mockSet = jest.fn().mockResolvedValue();
    const mockGet = jest.fn().mockResolvedValue({
      exists: !!resultScores,
      data: () => ({ scores: resultScores }),
    });
    const mockWhere = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        docs: existingIds.map((id) => ({ id })),
      }),
    });
    const mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet, set: mockSet }),
        where: mockWhere,
      }),
    });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc, where: mockWhere });
    const mockGetAll = jest.fn().mockResolvedValue([
      { id: '266192', exists: !!thumbnail, data: () => ({ thumbnail }) },
    ]);
    return { collection: mockCollection, getAll: mockGetAll, _mockSet: mockSet };
  };

  test('imports a new scored play', async () => {
    axios.get.mockResolvedValue({ data: singlePlayXml });
    const db = makeDb();
    getFirestore.mockReturnValue(db);

    const result = await importBggScores('uid123', 'testuser');
    expect(result).toEqual({ imported: 1, skipped: 0 });
    expect(db._mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: '266192',
        gameName: 'Wingspan',
        score: 47,
        source: 'bgg',
        bggPlayId: '98765',
      })
    );
  });

  test('skips already-imported play', async () => {
    axios.get.mockResolvedValue({ data: singlePlayXml });
    const db = makeDb({ existingIds: ['bgg_98765'] });
    getFirestore.mockReturnValue(db);

    const result = await importBggScores('uid123', 'testuser');
    expect(result).toEqual({ imported: 0, skipped: 1 });
    expect(db._mockSet).not.toHaveBeenCalled();
  });

  test('returns zeros when user has no scored plays', async () => {
    axios.get.mockResolvedValue({ data: makeXml(0, '') });
    const db = makeDb();
    getFirestore.mockReturnValue(db);

    const result = await importBggScores('uid123', 'testuser');
    expect(result).toEqual({ imported: 0, skipped: 0 });
  });
});

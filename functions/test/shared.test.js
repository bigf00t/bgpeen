const { calcPercentile, getResultId, getPercentileQuip } = require('../scoring');

// ---------------------------------------------------------------------------
// calcPercentile
// ---------------------------------------------------------------------------
// Correct formula: (count_below + 0.5 × count_equal) / total × 100
// The implementation uses c / 0.5 (= c × 2) for tied scores which is WRONG.
// These tests are written against the mathematically correct expectation.
// Failing tests indicate the bug is present.
// ---------------------------------------------------------------------------

describe('calcPercentile', () => {
  test('returns null for empty scores', () => {
    expect(calcPercentile({}, 100)).toBeNull();
  });

  test('score below all values → 0', () => {
    // 0 below, 0 tied → 0/9 × 100 = 0
    expect(calcPercentile({ 100: 3, 150: 3, 200: 3 }, 50)).toBe(0);
  });

  test('score above all values → 100', () => {
    // 9 below, 0 tied → 9/9 × 100 = 100
    expect(calcPercentile({ 100: 3, 150: 3, 200: 3 }, 250)).toBe(100);
  });

  test('unique score at bottom of distribution → ~16.67%', () => {
    // scores: [100, 150, 200], score=100
    // 0 below + 0.5×1 tied = 0.5, total=3 → 0.5/3×100 ≈ 16.67
    expect(calcPercentile({ 100: 1, 150: 1, 200: 1 }, 100)).toBeCloseTo(16.67, 1);
  });

  test('unique score at middle of distribution → 50%', () => {
    // scores: [100, 150, 200], score=150
    // 1 below + 0.5×1 tied = 1.5, total=3 → 1.5/3×100 = 50
    expect(calcPercentile({ 100: 1, 150: 1, 200: 1 }, 150)).toBeCloseTo(50, 1);
  });

  test('unique score at top of distribution → ~83.33%', () => {
    // scores: [100, 150, 200], score=200
    // 2 below + 0.5×1 tied = 2.5, total=3 → 2.5/3×100 ≈ 83.33
    expect(calcPercentile({ 100: 1, 150: 1, 200: 1 }, 200)).toBeCloseTo(83.33, 1);
  });

  test('all scores equal → 50%', () => {
    // 4 scores all at 100, score=100
    // 0 below + 0.5×4 tied = 2, total=4 → 2/4×100 = 50
    expect(calcPercentile({ 100: 4 }, 100)).toBe(50);
  });

  test('score not in distribution but between values → counts only below', () => {
    // scores: [50,50,200,200], score=150 (not in distribution)
    // 2 below + 0 tied = 2, total=4 → 2/4×100 = 50
    expect(calcPercentile({ 50: 2, 200: 2 }, 150)).toBe(50);
  });

  test('result is always between 0 and 100', () => {
    const result = calcPercentile({ 100: 10, 110: 10, 120: 10 }, 110);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('score with high count at middle → 50%', () => {
    // scores: [50×2, 100×6, 200×2], score=100
    // 2 below + 0.5×6 tied = 5, total=10 → 5/10×100 = 50
    expect(calcPercentile({ 50: 2, 100: 6, 200: 2 }, 100)).toBe(50);
  });

  test('score string is parsed to integer', () => {
    // Should work even if score is passed as string
    expect(calcPercentile({ 100: 1, 200: 1 }, '100')).toBeCloseTo(25, 1);
  });
});

// ---------------------------------------------------------------------------
// getResultId
// ---------------------------------------------------------------------------

describe('getResultId', () => {
  test('no params → all', () => {
    expect(getResultId({})).toBe('all');
  });

  test('players only → count-N', () => {
    expect(getResultId({ players: 4 })).toBe('count-4');
  });

  test('players + finish → count-N-finish-M', () => {
    expect(getResultId({ players: 4, finish: 2 })).toBe('count-4-finish-2');
  });

  test('players + start → count-N-start-M', () => {
    expect(getResultId({ players: 4, start: 1 })).toBe('count-4-start-1');
  });

  test('players + start + finish → start takes priority', () => {
    expect(getResultId({ players: 4, start: 1, finish: 2 })).toBe('count-4-start-1');
  });

  test('players + new → count-N-new', () => {
    expect(getResultId({ players: 4, new: 1 })).toBe('count-4-new');
  });

  test('players + finish + new → finish takes priority over new', () => {
    expect(getResultId({ players: 4, finish: 2, new: 1 })).toBe('count-4-finish-2');
  });

  test('color only → color-X', () => {
    expect(getResultId({ color: 'red' })).toBe('color-red');
  });

  test('year only → year-N', () => {
    expect(getResultId({ year: 2023 })).toBe('year-2023');
  });

  test('year + month → year-N-month-M', () => {
    expect(getResultId({ year: 2023, month: 6 })).toBe('year-2023-month-6');
  });

  test('players takes priority over color', () => {
    expect(getResultId({ players: 4, color: 'red' })).toBe('count-4');
  });

  test('players takes priority over year', () => {
    expect(getResultId({ players: 4, year: 2023 })).toBe('count-4');
  });

  test('color takes priority over year', () => {
    expect(getResultId({ color: 'red', year: 2023 })).toBe('color-red');
  });
});

// ---------------------------------------------------------------------------
// getPercentileQuip
// ---------------------------------------------------------------------------
// Note: Easter egg triggers when Math.ceil(percentile) === 69
// i.e. for values in range (68, 69] — NOT for 69.01+ (Math.ceil(69.01) = 70)

describe('getPercentileQuip', () => {
  test('< 1 → worst in the world', () => {
    expect(getPercentileQuip(0)).toBe('quite possibly one of the worst in the world!');
    expect(getPercentileQuip(0.5)).toBe('quite possibly one of the worst in the world!');
    expect(getPercentileQuip(0.999)).toBe('quite possibly one of the worst in the world!');
  });

  test('exactly 1 → just terrible (not "worst")', () => {
    // boundary: < 1 is false at exactly 1
    expect(getPercentileQuip(1.0)).toBe('just terrible.');
  });

  test('1–9.99 → just terrible', () => {
    expect(getPercentileQuip(5)).toBe('just terrible.');
    expect(getPercentileQuip(9.99)).toBe('just terrible.');
  });

  test('exactly 10 → not very good (not "just terrible")', () => {
    expect(getPercentileQuip(10.0)).toBe('not very good.');
  });

  test('10–39.99 → not very good', () => {
    expect(getPercentileQuip(25)).toBe('not very good.');
    expect(getPercentileQuip(39.99)).toBe('not very good.');
  });

  test('exactly 40 → boringly average', () => {
    expect(getPercentileQuip(40.0)).toBe('boringly average.');
  });

  test('40–59.99 → boringly average', () => {
    expect(getPercentileQuip(50)).toBe('boringly average.');
    expect(getPercentileQuip(59.99)).toBe('boringly average.');
  });

  test('exactly 60 → actually pretty decent', () => {
    expect(getPercentileQuip(60.0)).toBe('actually pretty decent...');
  });

  test('Easter egg: Math.ceil(x) === 69 → nice.', () => {
    // (68, 69] all ceil to 69
    expect(getPercentileQuip(68.01)).toBe('nice.');
    expect(getPercentileQuip(68.5)).toBe('nice.');
    expect(getPercentileQuip(69.0)).toBe('nice.');
  });

  test('Easter egg does NOT fire for 69.01 (Math.ceil = 70)', () => {
    expect(getPercentileQuip(69.01)).toBe('actually pretty decent...');
  });

  test('60–89.99 (excluding Easter egg range) → actually pretty decent', () => {
    expect(getPercentileQuip(70)).toBe('actually pretty decent...');
    expect(getPercentileQuip(89.99)).toBe('actually pretty decent...');
  });

  test('exactly 90 → legit amazing', () => {
    expect(getPercentileQuip(90.0)).toBe('legit amazing!');
  });

  test('90–98.99 → legit amazing', () => {
    expect(getPercentileQuip(95)).toBe('legit amazing!');
    expect(getPercentileQuip(98.99)).toBe('legit amazing!');
  });

  test('exactly 99 → probably cheating', () => {
    expect(getPercentileQuip(99.0)).toBe('probably cheating :(');
  });

  test('100 → probably cheating', () => {
    expect(getPercentileQuip(100)).toBe('probably cheating :(');
  });
});

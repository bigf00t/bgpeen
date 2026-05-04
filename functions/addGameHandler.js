const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const addGame = require('./addGame');

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function isRateLimited(ip) {
  const db = getFirestore();
  const safeIp = ip.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ref = db.collection('_rateLimits').doc(`addGame_${safeIp}`);
  try {
    return await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      const data = snap.data() ?? {};
      const now = Date.now();
      if (!data.windowStart || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
        t.set(ref, { windowStart: now, count: 1 });
        return false;
      }
      if (data.count >= RATE_LIMIT_MAX) return true;
      t.update(ref, { count: FieldValue.increment(1) });
      return false;
    });
  } catch (e) {
    console.error('Rate limit check failed:', e);
    return false; // fail open
  }
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const term = (req.body?.term || '').trim();
  if (!term) {
    res.status(400).json({ error: 'Missing term' });
    return;
  }

  if (process.env.FUNCTIONS_EMULATOR !== 'true') {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.socket?.remoteAddress
      || 'unknown';
    if (await isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many requests — try again in an hour.' });
      return;
    }
  }

  try {
    const game = await addGame.addGame(term);
    if (game) {
      res.status(200).json({ id: game.id, name: game.name });
      return;
    }
    // Game already existed in Firestore (addGame returns undefined when it skips)
    const db = getFirestore();
    if (!isNaN(term)) {
      const snap = await db.collection('games').doc(term).get();
      if (snap.exists) {
        res.status(200).json({ id: snap.id, name: snap.data().name });
        return;
      }
    } else {
      const snap = await db.collection('games').where('name', '==', term).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        res.status(200).json({ id: doc.id, name: doc.data().name });
        return;
      }
    }
    res.status(404).json({ error: 'Game not found on BoardGameGeek' });
  } catch (err) {
    console.error('addGameImmediate failed:', err);
    res.status(500).json({ error: 'Failed to add game' });
  }
};

module.exports = { handler };

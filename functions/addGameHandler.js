const { getFirestore } = require('firebase-admin/firestore');
const addGame = require('./addGame');

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

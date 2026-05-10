const { getAuth } = require('firebase-admin/auth');
const { importBggScores } = require('./importBggScores');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let uid;
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const bggUsername = (req.body?.bggUsername || '').trim();
  if (!bggUsername) {
    res.status(400).json({ error: 'Missing bggUsername' });
    return;
  }

  try {
    const result = await importBggScores(uid, bggUsername);
    res.status(200).json(result);
  } catch (err) {
    console.error('importBggScores failed:', err);
    res.status(502).json({ error: 'Failed to fetch plays from BGG' });
  }
};

module.exports = { handler };

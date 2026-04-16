const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();

const automatic = require('./automatic_game_updates');

exports.serveOgTags = onRequest({ memory: '256MiB' }, (req, res) => {
  return require('./og_tags').serveOgTags(req, res);
});

exports.servePreviewImage = onRequest({ memory: '512MiB' }, (req, res) => {
  return require('./preview_image').servePreviewImage(req, res);
});

exports.recordGameView = onRequest({ memory: '256MiB' }, async (req, res) => {
  const gameId = req.query.id;
  if (!gameId) {
    res.status(400).send('Missing id');
    return;
  }
  try {
    await getFirestore().collection('games').doc(gameId).update({
      popularity: FieldValue.increment(1),
      lastLoadedDate: new Date(),
    });
    res.status(200).send('ok');
  } catch (e) {
    console.error(`recordGameView failed for ${gameId}:`, e);
    res.status(500).send('error');
  }
});

exports.runAutomaticGameUpdates = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: ['BGG_API_KEY'],
  },
  async () => {
    // console.log('Updates turned off');
    await automatic.runAutomaticGameUpdates();
  }
);

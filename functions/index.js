const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();

const automatic = require('./automaticUpdates');

exports.serveOgTags = onRequest({ memory: '256MiB' }, (req, res) => {
  return require('./ogTags').serveOgTags(req, res);
});

exports.servePreviewImage = onRequest({ memory: '512MiB' }, (req, res) => {
  return require('./previewImage').servePreviewImage(req, res);
});

exports.recordGameView = onRequest({ memory: '256MiB' }, async (req, res) => {
  const gameId = req.query.id;
  if (!gameId || !/^\d+$/.test(gameId)) {
    res.status(400).send('Invalid id');
    return;
  }
  try {
    await getFirestore().collection('games').doc(gameId).update({
      popularity: FieldValue.increment(1),
      viewsToday: FieldValue.increment(1),
      viewsThisMonth: FieldValue.increment(1),
      lastLoadedDate: new Date(),
    });
    res.status(200).send('ok');
  } catch (e) {
    console.error(`recordGameView failed for ${gameId}:`, e);
    res.status(500).send('error');
  }
});

async function resetViewField(field) {
  const db = getFirestore();
  const snapshot = await db.collection('games').where(field, '>', 0).get();
  let batch = db.batch();
  let count = 0;
  const commits = [];
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { [field]: FieldValue.delete() });
    count++;
    if (count % 500 === 0) {
      commits.push(batch.commit());
      batch = db.batch();
    }
  });
  if (count % 500 !== 0) commits.push(batch.commit());
  await Promise.all(commits);
  console.log(`Reset ${field} for ${count} games`);
}

exports.resetDailyViews = onSchedule({ schedule: '0 0 * * *', timeoutSeconds: 120, memory: '256MiB' }, async () => {
  await resetViewField('viewsToday');
});

exports.resetMonthlyViews = onSchedule({ schedule: '0 0 1 * *', timeoutSeconds: 120, memory: '256MiB' }, async () => {
  await resetViewField('viewsThisMonth');
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

exports.addGameImmediate = onRequest(
  { memory: '512MiB', timeoutSeconds: 120, secrets: ['BGG_API_KEY'], enforceAppCheck: true },
  require('./addGameHandler').handler
);

exports.onGameCreated = onDocumentCreated(
  { document: 'games/{gameId}', memory: '1GiB', timeoutSeconds: 540, secrets: ['BGG_API_KEY'] },
  require('./gameCreatedHandler').handler
);

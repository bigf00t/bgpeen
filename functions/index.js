const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { initializeApp } = require('firebase-admin/app');
initializeApp();

const automatic = require('./automatic_game_updates');

exports.serveOgTags = onRequest({ memory: '256MiB' }, (req, res) => {
  return require('./og_tags').serveOgTags(req, res);
});

exports.servePreviewImage = onRequest({ memory: '512MiB' }, (req, res) => {
  return require('./preview_image').servePreviewImage(req, res);
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

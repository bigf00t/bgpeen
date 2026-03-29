const functions = require('firebase-functions/v1');

const { initializeApp } = require('firebase-admin/app');
initializeApp();

const automatic = require('./automatic_game_updates');

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: '1GB',
  secrets: ['BGG_API_KEY'],
};

exports.runAutomaticGameUpdates = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    // console.log('Updates turned off');
    await automatic.runAutomaticGameUpdates();
  });

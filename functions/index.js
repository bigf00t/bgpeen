const functions = require('firebase-functions');

const { initializeApp } = require('firebase-admin/app');
initializeApp();

const automatic = require('./automatic_game_updates');

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: '1GB',
};

exports.runAutomaticGameUpdates = functions
  .runWith(runtimeOpts)
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    // console.log('Updates turned off');
    await automatic.runAutomaticGameUpdates();
  });

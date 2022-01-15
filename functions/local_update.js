// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// const manual_games = require('./manual_games_update');
const automatic = require('./automatic_game_updates');

let run = () => {
  // DON'T RUN, TOO EXPENSIVE!
  // console.info('Starting manualGamesUpdate');
  // manual_games.manualGamesUpdate();

  console.info('Starting runAutomaticGameUpdates');
  automatic.runAutomaticGameUpdates(false, 10, 10);
};

// Node entrypoint
run();

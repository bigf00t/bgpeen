// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const manual_games = require('./manual_games_update');
const automatic = require('./automatic_game_updates');

let run = () => {
  // console.log('Starting manualGamesUpdate');
  // manual_games.manualGamesUpdate(['13', '68448']);

  console.log('Starting runAutomaticGameUpdates');
  automatic.runAutomaticGameUpdates(false, 0);
};

// Node entrypoint
run();

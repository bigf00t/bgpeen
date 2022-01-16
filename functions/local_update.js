// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const manual_games = require('./manual_games_update');
const automatic = require('./automatic_game_updates');
const manual_plays = require('./manual_plays_update');

let run = () => {
  // DON'T RUN, TOO EXPENSIVE!
  // console.info('Starting manualGamesUpdate');
  // manual_games.manualGamesUpdate();

  // TODO: Switch
  // db.useEmulator('localhost', 5002);

  console.info('Starting runAutomaticGameUpdates');
  automatic.runAutomaticGameUpdates(false, 0, 100).catch((err) => console.error(err));
  
  // console.info('Starting updatePlays');
  // manual_plays.manualPlaysUpdate(['27833'], 100).catch((err) => console.error(err));
};

// Node entrypoint
run();

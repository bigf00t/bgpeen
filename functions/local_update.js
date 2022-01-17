// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// const manual_games = require('./manual_games_update');
// const manual_stats = require('./manual_stats_update');
const automatic = require('./automatic_game_updates');
// const manual_plays = require('./manual_plays_update');

let run = () => {
  // DON'T RUN, TOO EXPENSIVE!
  // console.info('Starting manualGamesUpdate');
  // manual_games.manualGamesUpdate();

  // DON'T RUN, TOO EXPENSIVE!
  // console.info('Starting manualStatsUpdate');
  // manual_stats.manualStatsUpdate(['256226']).catch((err) => console.error(err));

  // TODO: Switch between PROD and DEV
  // db.useEmulator('localhost', 5002);

  // console.info('Starting runAutomaticGameUpdates');
  // automatic.runAutomaticGameUpdates(0, 100).catch((err) => console.error(err));
  automatic.runAutomaticGameUpdates(0, 50).catch((err) => console.error(err));

  // console.info('Starting updatePlays');
  // manual_plays.manualPlaysUpdate(['27833'], 100).catch((err) => console.error(err));
};

// Node entrypoint
run();

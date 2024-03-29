const argv = require('minimist')(process.argv.slice(2));

if (!argv.prod) {
  process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:5002';
  process.env['STORAGE_EMULATOR_HOST'] = 'http://localhost:9199';
} else {
  delete ['FIRESTORE_EMULATOR_HOST'];
  delete ['STORAGE_EMULATOR_HOST'];
}

const { initializeApp } = require('firebase-admin/app');
initializeApp();

const manual_games = require('./manual_games_update');
const manual_results = require('./manual_results_update');
const automatic = require('./automatic_game_updates');
const manual_plays = require('./manual_plays_update');
const add_game = require('./add_game');
// console.log(argv);
// console.log(process.env.FIRESTORE_EMULATOR_HOST);

switch (argv.function) {
  case 'addGame':
    add_game.addGame([`${argv.name}`]).catch((err) => console.error(err));
    break;
  case 'manualPlaysUpdate':
    manual_plays.manualPlaysUpdate([`${argv.id}`], argv.maxPages).catch((err) => console.error(err));
    break;
  case 'automaticGamesUpdate':
    automatic.runAutomaticGameUpdates(argv.maxGames, argv.maxPages, true).catch((err) => console.error(err));
    break;
  case 'manualGamesUpdate':
    manual_games.manualGamesUpdate(argv.id ? [`${argv.id}`] : null).catch((err) => console.error(err));
    break;
  case 'manualResultsUpdate':
    manual_results.manualResultsUpdate(argv.id ? [`${argv.id}`] : null).catch((err) => console.error(err));
    break;
  default:
  // code block
}

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
// automatic.runAutomaticGameUpdates(0, 50).catch((err) => console.error(err));

// console.info('Starting updatePlays');
// manual_plays.manualPlaysUpdate(['295947'], 100).catch((err) => console.error(err));

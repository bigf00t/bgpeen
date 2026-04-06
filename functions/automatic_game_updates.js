const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const util = require('./util');
const add_game = require('./add_game');
const update_plays = require('./update_plays');
const update_results = require('./update_results');

const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

exports.runAutomaticGameUpdates = async (maxGames = 1, maxPages = 100, includeHistorical = false) => {
  const searchesSnapshot = await firestore.collection('searches').where('completed', '!=', true).limit(maxGames).get();

  if (searchesSnapshot.size > 0) {
    const searches = util.docsToArray(searchesSnapshot);
    await addSearchedGames(searches, maxPages);
    return;
  }

  const oneMonthAgo = dayjs().subtract(1, 'month').toDate();

  let queries = [
    // firestore
    //   .collection('plays')
    //   .where('hasMinPlays', '==', false)
    //   .where('remainingPlays', '>', 0)
    //   .orderBy('remainingPlays', 'asc'),
    firestore.collection('plays').where('playsLastUpdated', '<', oneMonthAgo).orderBy('playsLastUpdated', 'asc'),
    // firestore.collection('plays').where('totalPlays', '<', 10),
  ];

  if (includeHistorical) {
    queries = queries.concat([
      firestore.collection('plays').where('remainingPlays', '>', 0).orderBy('remainingPlays', 'asc'),
      firestore.collection('plays').orderBy('playsLastUpdated', 'asc'),
    ]);
  }

  // Execute queries in order, update based on the first one with results
  for (let query of queries) {
    if (maxGames > 0) {
      query = query.limit(maxGames);
    }

    const gamePlaysSnapshot = await query.get();

    if (gamePlaysSnapshot.size === 0) {
      continue;
    }

    const gamePlays = util.docsToArray(gamePlaysSnapshot);

    await updatePlaysForEligibleGames(gamePlays, maxPages);

    return;
  }

  console.info('Did not find any games to add or update.');
};

const updatePlaysForEligibleGames = async (gamePlays, maxPages) => {
  const startTime = new Date();
  let gameNum = 0;
  let succeeded = 0;
  let failed = 0;

  for (const gamePlay of gamePlays) {
    // gamePlay.id is added by util.docsToArray()
    const gameSnapshot = await firestore.collection('games').doc(gamePlay.id).get();
    const game = gameSnapshot.data();

    gameNum++;

    const elapsedTime = dayjs.duration(dayjs().diff(startTime));
    console.info(
      `${'='.repeat(100)}\nUpdating game ${gameNum} of ${gamePlays.length} - ${game.name} (${
        game.id
      }) - Elapsed time ${elapsedTime.format('HH:mm:ss')}`
    );

    const gameStartTime = Date.now();

    try {
      // Separate batch transaction for each game
      const batch = firestore.batch();

      const newPlays = await update_plays.updateGamePlays(game, batch, maxPages);

      await update_results.updateResults(game, batch, newPlays, false);

      await batch.commit();

      const gameDuration = ((Date.now() - gameStartTime) / 1000).toFixed(1);
      console.info(`✓ ${game.name} (${game.id}) updated successfully in ${gameDuration}s`);
      succeeded++;
    } catch (err) {
      console.error(`✗ Failed to update ${game.name} (${game.id}): ${err.message}`);
      console.error(err.stack);
      failed++;
    }

    await util.delay();
  }

  const totalTime = dayjs.duration(dayjs().diff(startTime)).format('HH:mm:ss');
  console.info(`${'='.repeat(100)}\nRun complete — ${succeeded} succeeded, ${failed} failed, total time ${totalTime}`);
};

const addSearchedGames = async (searches, maxPages) => {
  console.info(`Processing ${searches.length} pending search(es)`);

  const batch = firestore.batch();

  for (const search of searches) {
    let newGame = null;

    try {
      console.info(`Searching for: "${search.term}"`);
      newGame = await add_game.addGame(search.term);

      await util.delay();

      if (newGame) {
        const newPlays = await update_plays.updateGamePlays(newGame, batch, maxPages);
        await update_results.updateResults(newGame, batch, newPlays, false);
      } else {
        console.info(`No game added for search "${search.term}"`);
      }
    } catch (err) {
      console.error(`✗ Failed to process search "${search.term}": ${err.message}`);
      console.error(err.stack);
    }

    batch.update(firestore.collection('searches').doc(search.id), { completed: true, succeeded: Boolean(newGame) });

    await util.delay();
  }

  await batch.commit();
};

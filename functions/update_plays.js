const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const dayjs = require('dayjs');

const _ = require('lodash');

const util = require('./util');

exports.updateGamePlays = (game, maxPages) => {
  const gameRef = db.collection('games').doc(game.id);
  console.info('-'.repeat(100));
  console.info(`Getting plays for ${game.name} (${game.id})`);

  const playsUrl = getPlaysUrl(game);
  console.info(`Using BGG API Url: ${playsUrl}`);

  return updatePlaysRecursively(game, gameRef, playsUrl, maxPages)
    .then((pageResults) => updateGame(game, gameRef, pageResults))
    .catch((err) => Promise.reject(err));
};

const updateGame = (game, gameRef, pageResults) => {
  const plays = _.flatMap(pageResults, 'plays');
  const newUnusablePlayCount = _.reduce(pageResults, (sum, pageResult) => sum + pageResult.unusablePlays, 0);
  const pageResultsWithPlays = pageResults.filter((pageResult) => pageResult.plays.length > 0);
  let newestPlayDate = game.newestPlayDate;
  let currentOldestPlayDate = '';
  let oldestPlayDate = game.oldestPlayDate;

  if (pageResultsWithPlays.length > 0) {
    const newNewestPlayDate = pageResultsWithPlays[0].plays[0].date;
    newestPlayDate =
      !game.newestPlayDate || dayjs(newNewestPlayDate).isAfter(game.newestPlayDate)
        ? newNewestPlayDate
        : game.newestPlayDate;

    currentOldestPlayDate = pageResultsWithPlays.slice(-1)[0].plays.slice(-1)[0].date;
    oldestPlayDate =
      !game.oldestPlayDate || dayjs(currentOldestPlayDate).isBefore(game.oldestPlayDate)
        ? currentOldestPlayDate
        : game.oldestPlayDate;
  }

  const remainingPlays = pageResults.slice(-1)[0].remainingPlays;
  const totalPlays = _.defaultTo(game.totalPlays, 0) + plays.length;

  console.info(
    `Added ${plays.length} total plays for ${game.name} - ${remainingPlays} unloaded plays remaining on BGG`
  );

  return gameRef
    .update({
      unusablePlays: _.defaultTo(game.unusablePlays, 0) + newUnusablePlayCount,
      remainingPlays: remainingPlays,
      newestPlayDate: newestPlayDate,
      oldestPlayDate: oldestPlayDate,
      maxDate: remainingPlays === 0 ? '' : currentOldestPlayDate,
      minDate: remainingPlays === 0 ? newestPlayDate : _.defaultTo(game.minDate, ''),
      totalPlays: totalPlays,
      hasMinPlays: totalPlays >= 10000,
      hasNoPlays: totalPlays === 0,
      playsLastUpdated: new Date(),
    })
    .then(() => Promise.resolve(plays));
};

const getPlaysUrl = (game) =>
  `https://api.geekdo.com/xmlapi2/plays?id=${game.id}` +
  `&mindate=${_.defaultTo(game.minDate, '')}` +
  `&maxdate=${_.defaultTo(game.maxDate, '')}` +
  `&page=`;

const updatePlaysRecursively = (game, gameRef, playsUrl, maxPages, page = 1) =>
  updatePlaysPage(game, gameRef, playsUrl, page, maxPages)
    .then((pageResult) => {
      if (pageResult && pageResult.finished) {
        // Hit the bottom of the stack
        return Promise.resolve([pageResult]);
      }
      return util.delay(page + 1).then((nextPage) =>
        updatePlaysRecursively(game, gameRef, playsUrl, maxPages, nextPage)
          .then((pageResults) => {
            // Returning pageResults back up the stack
            // Make sure the pages are ordered newest to oldest
            if (pageResult) {
              pageResults.splice(0, 0, pageResult);
            }
            return Promise.resolve(pageResults);
          })
          .catch((err) => Promise.reject(err))
      );
    })
    .catch((err) => Promise.reject(err));

const updatePlaysPage = (game, gameRef, playsUrl, page, maxPages) =>
  axios
    .get(playsUrl + page)
    .then((result) => {
      const json = convert.xml2js(result.data, {
        compact: true,
        attributesKey: '$',
      });

      if (json.plays.play === undefined) {
        console.info(`${game.name} - Page ${page} did not have any plays`);
        return Promise.resolve({
          unusablePlays: 0,
          remainingPlays: 0,
          plays: [],
          finished: true,
        });
      }

      const cleanPlays = getCleanPlaysFromJson(json.plays.play);

      return getNonExistingPlays(game, gameRef, cleanPlays).then((plays) => {
        const totalPlays = json.plays.$.total;
        const totalPages = _.ceil(totalPlays / 100);
        const actualTotalPages = _.min([maxPages, totalPages]);
        const totalRemainingPages = actualTotalPages - page;
        const finished = (maxPages > 0 && page >= maxPages) || totalRemainingPages == 0;

        // Get plays that don't exist in the db yet
        const duplicatePlaysCount = cleanPlays.length - plays.length;

        // This may be double-counting some invalid plays, but there's not much to be done
        const unusablePlaysCount = json.plays.play.length - cleanPlays.length;
        const remainingPlaysCount = totalPlays - (100 * (page - 1) + json.plays.play.length);

        console.info(
          `${game.name} - Page ${page} of ${actualTotalPages} - ${
            plays.length
          } valid plays - ${unusablePlaysCount} invalid plays${
            duplicatePlaysCount > 0 ? ` - ${duplicatePlaysCount} duplicate plays` : ''
          }`
        );

        const batch = db.batch();

        _.forEach(plays, (play) => batch.set(gameRef.collection('plays').doc(play.id), play));

        return batch.commit().then(() =>
          Promise.resolve({
            unusablePlays: unusablePlaysCount,
            remainingPlays: remainingPlaysCount,
            plays: plays,
            finished: finished,
          })
        );
      });
    })
    .catch((err) => Promise.reject(err));

// Make sure each play has at least one player, and each player has a score
// TODO: Exclude plays where winner isn't person with highest score
const getCleanPlaysFromJson = (plays) =>
  _(plays)
    .filter((play) => _.get(play, 'players.player[0]'))
    .map((play) => {
      const players = getCleanPlayersFromJson(play.players.player);
      const cleanPlay = { ...play.$ };
      cleanPlay.players = players;
      cleanPlay.playerCount = players.length.toString();
      cleanPlay.playerUserIds = getPlayerUserIds(players);
      return cleanPlay;
    })
    .filter((play) =>
      _.every(play.players, (player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0))
    )
    .value();

const getCleanPlayersFromJson = (players) =>
  _(players)
    .map((player) => {
      return { ...player.$ };
    })
    .value();

const getPlayerUserIds = (players) =>
  _(players)
    .filter((player) => player.userid != undefined)
    .map((player) => player.userid)
    .value();

const getNonExistingPlays = (game, gameRef, plays) => {
  // When we're on the edge of the daterange, some duplicate records could sneak in
  const possibleExistingPlays = _(plays)
    .filter(
      (play) => play.date === game.minDate || play.date === game.maxDate || (game.minDate === '' && game.maxDate === '')
    )
    .map((play) =>
      gameRef
        .collection('plays')
        .doc(play.id)
        .get()
        .then((doc) => (doc.exists ? play.id : null))
    )
    .value();

  return Promise.all(possibleExistingPlays).then((results) => plays.filter((play) => !results.includes(play.id)));
};

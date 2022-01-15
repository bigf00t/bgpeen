const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const moment = require('moment');

const _ = require('lodash');

const util = require('./util');

exports.updateGamePlays = (game, maxPages) => {
  let gameRef = db.collection('games').doc(game.id);
  console.info('='.repeat(100));
  console.info(`Getting plays for ${game.name}`);

  let playsUrl = getPlaysUrl(game);
  console.info(`Using BGG API Url: ${playsUrl}`);

  return updatePlaysRecursively(game, gameRef, playsUrl, maxPages)
    .then((pageResults) => updateGame(game, gameRef, pageResults))
    .catch((err) => Promise.reject(err));
};

const updateGame = (game, gameRef, pageResults) => {
  let plays = _.flatMap(pageResults, 'plays');
  let newUnusablePlayCount = _.reduce(pageResults, (sum, pageResult) => sum + pageResult.unusablePlays, 0);
  let pageResultsWithPlays = pageResults.filter((pageResult) => pageResult.plays.length > 0);

  let newNewestPlayDate = pageResultsWithPlays[0].plays[0].date;
  let newestPlayDate =
    !game.newestPlayDate || moment(newNewestPlayDate).isAfter(game.newestPlay)
      ? newNewestPlayDate
      : game.newestPlayDate;

  let currentOldestPlayDate = pageResultsWithPlays.slice(-1)[0].plays.slice(-1)[0].date;
  let oldestPlayDate =
    !game.oldestPlayDate || moment(currentOldestPlayDate).isBefore(game.oldestPlay)
      ? currentOldestPlayDate
      : game.oldestPlayDate;

  let remainingPlays = pageResults.slice(-1)[0].remainingPlays;

  console.info(`Added ${plays.length} total plays - ${remainingPlays} unloaded plays remaining on BGG`);

  return gameRef
    .update({
      unusablePlays: _.defaultTo(game.unusablePlays, 0) + newUnusablePlayCount,
      remainingPlays: remainingPlays,
      newestPlayDate: newestPlayDate,
      oldestPlayDate: oldestPlayDate,
      maxDate: remainingPlays === 0 ? '' : currentOldestPlayDate,
      minDate: remainingPlays === 0 ? newestPlayDate : _.defaultTo(game.minDate, ''),
      totalPlays: _.defaultTo(game.totalPlays, 0) + plays.length,
      playsLastUpdated: moment(new Date()),
      isNew: false,
    })
    .then(() => Promise.resolve(plays));
};

const getPlaysUrl = (game) =>
  `https://api.geekdo.com/xmlapi2/plays?id=${game.id}` +
  `&mindate=${_.defaultTo(game.minDate, '')}` +
  `&maxdate=${_.defaultTo(game.maxDate, '')}` +
  `&page=`;

const updatePlaysRecursively = (game, gameRef, playsUrl, maxPages, page = 1) =>
  updatePlaysPage(game, gameRef, playsUrl, page)
    .then((pageResult) => {
      if ((maxPages > 0 && page >= maxPages) || pageResult.remainingPages == 0) {
        // Hit the bottom of the stack
        return Promise.resolve([pageResult]);
      }
      return util.delay(page + 1).then((nextPage) =>
        updatePlaysRecursively(game, gameRef, playsUrl, maxPages, nextPage)
          .then((pageResults) => {
            // Returning pageResults back up the stack
            // Make sure the pages are ordered newest to oldest
            pageResults.splice(0, 0, pageResult);
            return Promise.resolve(pageResults);
          })
          .catch((err) => Promise.reject(err))
      );
    })
    .catch((err) => Promise.reject(err));

const updatePlaysPage = (game, gameRef, playsUrl, page) =>
  axios
    .get(playsUrl + page)
    .then((result) => {
      let json = convert.xml2js(result.data, {
        compact: true,
        attributesKey: '$',
      });

      if (json.plays.play === undefined) {
        return Promise.reject(`Page ${page} did not have any plays`);
      }

      let cleanPlays = getCleanPlaysFromJson(json.plays.play);

      if (cleanPlays.length === 0) {
        return Promise.reject(`Page ${page} did not have any valid plays`);
      }

      // When we're on the edge of the daterange, some duplicate records could sneak in
      let possibleDuplicates = _(cleanPlays)
        .filter(
          (play) =>
            play.date === game.minDate || play.date === game.maxDate || (game.minDate === '' && game.maxDate === '')
        )
        .map((play) => {
          return gameRef
            .collection('plays')
            .doc(play.id)
            .get()
            .then((doc) => (doc.exists ? play.id : null));
        })
        .value();

      return Promise.all(possibleDuplicates).then((results) => {
        // Get plays that don't exist in the db yet
        let plays = cleanPlays.filter((play) => !results.includes(play.id));
        let duplicatePlays = cleanPlays.length - plays.length;
        if (duplicatePlays > 0) {
          console.info(`Found ${duplicatePlays} duplicate plays`);
        }

        let totalPlays = json.plays.$.total;
        // This may be double-counting, but there's not much to be done
        let unusablePlays = json.plays.play.length - plays.length;
        let remainingPlays = totalPlays - (100 * (page - 1) + json.plays.play.length);
        let remainingPages = _.ceil(totalPlays / 100) - page;

        console.info(`Adding ${plays.length} valid plays`);

        let batch = db.batch();

        _.forEach(plays, (play) => batch.set(gameRef.collection('plays').doc(play.id), play));

        return batch.commit().then(() =>
          Promise.resolve({
            remainingPages: remainingPages,
            unusablePlays: unusablePlays,
            remainingPlays: remainingPlays,
            plays: plays,
          })
        );
      });
    })
    .catch((err) => Promise.reject(err));

const getCleanPlaysFromJson = (plays) =>
  _(plays)
    .filter((play) => _.get(play, 'players.player[0]'))
    .map((play) => {
      let players = getCleanPlayersFromJson(play.players.player);
      let cleanPlay = { ...play.$ };
      cleanPlay.players = players;
      cleanPlay.playerCount = players.length.toString();
      cleanPlay.playerUserIds = getPlayerUserIds(players);
      return cleanPlay;
    })
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

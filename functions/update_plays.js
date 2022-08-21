const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const axios = require('axios');
const convert = require('xml-js');
const dayjs = require('dayjs');

const _ = require('lodash');

const util = require('./util');

exports.updateGamePlays = async (game, batch, maxPages) => {
  const gamePlaysRef = firestore.collection('plays').doc(game.id);
  const gamePlaysSnapshot = await gamePlaysRef.get();
  const gamePlays = gamePlaysSnapshot.data();

  const detailsRef = firestore.collection('details').doc(game.id);
  const detailsSnapshot = await detailsRef.get();
  const details = detailsSnapshot.data();

  console.info('-'.repeat(100));
  console.info(`Getting plays for ${game.name} (${game.id})`);

  const playsUrl = getPlaysUrl(game, gamePlays, details);
  console.info(`Using BGG API Url: ${playsUrl}`);

  const pageResults = await getPlaysRecursively(game, gamePlays, details, playsUrl, maxPages);
  const newPlays = _.flatMap(pageResults, 'plays');

  if (newPlays.length === 0) {
    console.error('ERROR - No valid plays found!');
    return [];
  }

  await updateGamePlaysWithPageResults(game, gamePlays, gamePlaysRef, batch, pageResults, newPlays);

  return newPlays;
};

const updateGamePlaysWithPageResults = async (game, gamePlays, gamePlaysRef, batch, pageResults, newPlays) => {
  const newUnusablePlayCount = _.reduce(pageResults, (sum, pageResult) => sum + pageResult.unusablePlays, 0);
  const pageResultsWithPlays = pageResults.filter((pageResult) => pageResult.plays.length > 0);

  let newestPlayDate = gamePlays.newestPlayDate;
  let currentOldestPlayDate = '';
  let oldestPlayDate = gamePlays.oldestPlayDate;

  if (pageResultsWithPlays.length > 0) {
    const newNewestPlayDate = pageResultsWithPlays[0].plays[0].date;
    newestPlayDate =
      !gamePlays.newestPlayDate || dayjs(newNewestPlayDate).isAfter(gamePlays.newestPlayDate)
        ? newNewestPlayDate
        : gamePlays.newestPlayDate;

    currentOldestPlayDate = pageResultsWithPlays.slice(-1)[0].plays.slice(-1)[0].date;
    oldestPlayDate =
      !gamePlays.oldestPlayDate || dayjs(currentOldestPlayDate).isBefore(gamePlays.oldestPlayDate)
        ? currentOldestPlayDate
        : gamePlays.oldestPlayDate;
  }

  const remainingPlays = pageResults.slice(-1)[0].remainingPlays;
  const totalPlays = _.defaultTo(gamePlays.totalPlays, 0) + newPlays.length;

  console.info(
    `${game.name} - ${newPlays.length} plays used - ${newUnusablePlayCount} plays skipped - ${remainingPlays} plays remaining on BGG`
  );

  const unusablePlays = _.defaultTo(gamePlays.unusablePlays, 0) + newUnusablePlayCount;
  const minDate = remainingPlays === 0 ? newestPlayDate : _.defaultTo(gamePlays.minDate, '');
  const maxDate = remainingPlays === 0 ? '' : currentOldestPlayDate;

  const minDatePlayIds = getDatePlayIds(newPlays, minDate, gamePlays.minDate, gamePlays.minDatePlayIds);
  const maxDatePlayIds = getDatePlayIds(newPlays, maxDate, gamePlays.maxDate, gamePlays.maxDatePlayIds);

  const updatedGamePlays = {
    unusablePlays: unusablePlays,
    remainingPlays: remainingPlays,
    newestPlayDate: newestPlayDate,
    oldestPlayDate: oldestPlayDate,
    minDate: minDate,
    maxDate: maxDate,
    minDatePlayIds: minDatePlayIds,
    maxDatePlayIds: maxDatePlayIds,
    totalPlays: totalPlays,
    hasMinPlays: totalPlays >= 10000,
    hasNoPlays: totalPlays === 0,
    playsLastUpdated: new Date(),
  };

  batch.update(gamePlaysRef, updatedGamePlays);
};

const getDatePlayIds = (plays, newDate, oldDate, playIds) => {
  if (newDate === '') {
    return '';
  }

  const newMinDatePlayIds = _(plays)
    .filter((play) => play.date === newDate)
    .map((play) => play.id)
    .value();

  return newDate != oldDate ? newMinDatePlayIds.join(',') : playIds.split(',').concat(newMinDatePlayIds).join(',');
};

const getPlaysUrl = (game, gamePlays, details) =>
  `https://api.geekdo.com/xmlapi2/plays?id=${game.id}` +
  `&mindate=${gamePlays.minDate ? gamePlays.minDate : `${details.yearpublished}-01-01`}` +
  `&maxdate=${gamePlays.maxDate ? gamePlays.maxDate : dayjs().format('YYYY-MM-DD')}` +
  `&page=`;

const getPlaysRecursively = async (game, gamePlays, details, playsUrl, maxPages, page = 1) => {
  const pageResult = await updatePlaysPage(game, gamePlays, details, playsUrl, page, maxPages);

  if (pageResult && pageResult.finished) {
    // We hit the bottom of the stack
    return [pageResult];
  }

  await util.delay();

  const pageResults = await getPlaysRecursively(game, gamePlays, details, playsUrl, maxPages, page + 1);

  // Make sure the pages are ordered newest to oldest
  if (pageResult) {
    pageResults.splice(0, 0, pageResult);
  }

  return pageResults;
};

const updatePlaysPage = async (game, gamePlays, details, playsUrl, page, maxPages) => {
  const result = await axios.get(playsUrl + page);

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

  const plays = getValidPlays(gamePlays, details, cleanPlays);

  const totalPlays = json.plays.$.total;
  const totalPages = _.ceil(totalPlays / 100);
  const actualTotalPages = _.min([maxPages, totalPages]);
  const totalRemainingPages = actualTotalPages - page;
  const finished = (maxPages > 0 && page >= maxPages) || totalRemainingPages == 0;

  // This may be double-counting some invalid plays, but there's not much to be done
  const unusablePlaysCount = json.plays.play.length - plays.length;
  const remainingPlaysCount = totalPlays - (100 * (page - 1) + json.plays.play.length);

  console.info(
    `${game.name} - Page ${page} of ${actualTotalPages} - ${plays.length} valid plays - ${unusablePlaysCount} invalid plays`
  );

  const batch = firestore.batch();

  // _.forEach(plays, (play) => batch.set(gameRef.collection('plays').doc(play.id), play));

  await batch.commit();

  const pageResult = {
    unusablePlays: unusablePlaysCount,
    remainingPlays: remainingPlaysCount,
    plays: plays,
    finished: finished,
  };

  return pageResult;
};

// Get formatted plays with at least one player
const getCleanPlaysFromJson = (plays) =>
  _(plays)
    .filter((play) => _.get(play, 'players.player[0]'))
    .map((play) => {
      const players = getCleanPlayersFromJson(play.players.player);
      const cleanPlay = { ...play.$ };
      cleanPlay.players = players;
      cleanPlay.playerCount = players.length;
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

const getValidPlays = (gamePlays, details, plays) => {
  const minDatePlayIds = gamePlays.minDatePlayIds.split(',');
  const maxDatePlayIds = gamePlays.maxDatePlayIds.split(',');

  return plays.filter(
    (play) =>
      // When we're on the edge of the daterange, some duplicate records could sneak in
      //  || (gamePlays.minDate === '' && gamePlays.maxDate === '')
      ((play.date !== gamePlays.minDate && play.date !== gamePlays.maxDate) ||
        (play.date === gamePlays.minDate && !minDatePlayIds.includes(play.id)) ||
        (play.date === gamePlays.maxDate && !maxDatePlayIds.includes(play.id))) &&
      // Only include plays where:
      //   Every player has a score
      _.every(play.players, (player) => !(isNaN(parseInt(player.score)) || parseInt(player.score) == 0)) &&
      //   Highest score is winner
      _.maxBy(play.players, (player) => parseInt(player.score)).win == 1 &&
      //   There is exactly one winner
      _.countBy(play.players, 'win')['1'] == 1 &&
      //   Game was completed
      parseInt(play.incomplete) === 0 &&
      //   Play date was after game was published, and not in the future
      dayjs(play.date).isAfter(dayjs(`${details.yearpublished}-01-01`).subtract(1, 'day'), 'day') &&
      dayjs(play.date).isBefore(dayjs().add(1, 'day'), 'day') &&
      //   There weren't too many or too few players
      play.playerCount >= details.minplayers &&
      play.playerCount <= details.maxplayers
  );
};

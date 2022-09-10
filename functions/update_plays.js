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

  const pageResults = await getPageResults(game, gamePlays, details, playsUrl, maxPages);
  const newPlays = _.flatMap(pageResults, 'plays');

  if (newPlays.length === 0) {
    console.error('ERROR - No valid plays found!');
    return [];
  }

  await updateGamePlaysWithPageResults(game, gamePlays, gamePlaysRef, batch, pageResults, newPlays);

  return newPlays;
};

const updateGamePlaysWithPageResults = async (game, gamePlays, gamePlaysRef, batch, pageResults, newPlays) => {
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

  console.info(`${game.name} - ${newPlays.length} plays loaded - ${remainingPlays} plays remaining on BGG`);

  const minDate = remainingPlays === 0 ? newestPlayDate : _.defaultTo(gamePlays.minDate, '');
  const maxDate = remainingPlays === 0 ? '' : currentOldestPlayDate;

  const minDatePlayIds = getDatePlayIds(newPlays, minDate, gamePlays.minDate, gamePlays.minDatePlayIds);
  const maxDatePlayIds = getDatePlayIds(newPlays, maxDate, gamePlays.maxDate, gamePlays.maxDatePlayIds);

  const updatedGamePlays = {
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

const getPageResults = async (game, gamePlays, details, playsUrl, maxPages) => {
  let pageResult = {};
  let page = 1;
  let pageResults = [];

  while (pageResult.remainingPages !== 0 && page <= maxPages) {
    pageResult = await getPageResult(game, gamePlays, details, playsUrl, page, maxPages);

    pageResults.push(pageResult);

    page += 1;

    await util.delay();
  }

  return pageResults;
};

const getPageResult = async (game, gamePlays, details, playsUrl, page, maxPages) => {
  const result = await axios.get(playsUrl + page);

  const json = convert.xml2js(result.data, {
    compact: true,
    attributesKey: '$',
  });

  if (json.plays.play === undefined) {
    console.info(`${game.name} - Page ${page} did not have any plays`);
    return {
      plays: [],
      remainingPlays: 0,
      remainingPages: 0,
    };
  }

  const cleanPlays = getCleanPlaysFromJson(json.plays.play);
  const newPlays = getNewPlays(gamePlays, cleanPlays);

  const totalPlays = json.plays.$.total;
  const actualTotalPages = _.min([maxPages, _.ceil(totalPlays / 100)]);
  const remainingPages = actualTotalPages - page;

  const duplicatePlaysCount = json.plays.play.length - newPlays.length;
  const remainingPlaysCount = totalPlays - (100 * (page - 1) + json.plays.play.length);

  console.info(
    `${game.name} - Page ${page} of ${actualTotalPages}${
      duplicatePlaysCount > 0 ? ` - ${duplicatePlaysCount} duplicate plays` : ''
    }`
  );

  return {
    plays: newPlays,
    remainingPlays: remainingPlaysCount,
    remainingPages: remainingPages,
  };
};

// Get formatted plays
const getCleanPlaysFromJson = (plays) =>
  plays.map((play) => {
    const cleanPlayers = play.players ? _.map(play.players.player, (player) => ({ ...player.$ })) : [];
    return {
      ...play.$,
      players: cleanPlayers,
      playerCount: cleanPlayers.length,
    };
  });

// Filter out plays that we've already recorded in a previous run
const getNewPlays = (gamePlays, plays) => {
  const minDatePlayIds = gamePlays.minDatePlayIds.split(',');
  const maxDatePlayIds = gamePlays.maxDatePlayIds.split(',');

  return plays.filter(
    (play) =>
      // When we're on the edge of the daterange, some duplicate records could sneak in
      //  || (gamePlays.minDate === '' && gamePlays.maxDate === '')
      (play.date !== gamePlays.minDate && play.date !== gamePlays.maxDate) ||
      (play.date === gamePlays.minDate && !minDatePlayIds.includes(play.id)) ||
      (play.date === gamePlays.maxDate && !maxDatePlayIds.includes(play.id))
  );
};

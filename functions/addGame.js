const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const axios = require('axios');
const convert = require('xml-js');

const _ = require('lodash');

const util = require('./util');

exports.addGame = async (searchTerm) => {
  const gameId = await getGameId(searchTerm);
  if (!gameId) {
    return;
  }

  const gameByIdSnapshot = await firestore.collection('games').doc(gameId).get();

  if (gameByIdSnapshot.exists) {
    console.log(`Game with ID ${gameId} already exists, skipping`);
    return;
  }

  await util.delay();

  let bggThingResponse;
  try {
    bggThingResponse = await util.withRetry(() =>
      axios.get(`https://api.geekdo.com/xmlapi2/things?id=${gameId}`, {
        headers: { Authorization: `Bearer ${util.getApiKey()}` },
      })
    );
  } catch (err) {
    console.error(`BGG things API request failed for ID ${gameId}: ${err.message} (status: ${err.response?.status})`);
    return;
  }

  const item = convert.xml2js(bggThingResponse.data, {
    compact: true,
    attributesKey: '$',
  }).items.item;

  if (item == undefined) {
    console.error(`Game with ID ${gameId} was not found in BGG things API response`);
    return;
  }

  const name = Array.isArray(item.name)
    ? _.find(item.name, (name) => name.$.type === 'primary').$.value
    : item.name.$.value;
  const suggestedPlayersPoll = _.find(item.poll, (poll) => poll.$.name === 'suggested_numplayers');
  if (!suggestedPlayersPoll) {
    console.warn(`No suggested_numplayers poll found for ${name} (${gameId}) — suggestedplayers will be empty`);
  }
  const suggestedPlayers = _.reduce(
    suggestedPlayersPoll?.results,
    (pollAcc, results) => {
      pollAcc[results.$.numplayers] = _.reduce(
        results.result,
        (votesAcc, result) => {
          votesAcc[result.$.value] = parseInt(result.$.numvotes);
          return votesAcc;
        },
        {}
      );
      return pollAcc;
    },
    {}
  );

  const thumbnailUrl = item.thumbnail?._text;
  const imageUrl = item.image?._text;

  const thumbnail = thumbnailUrl ? await util.uploadGameImage('thumbnails', item.$.id, thumbnailUrl) : null;
  const image = imageUrl ? await util.uploadGameImage('images', item.$.id, imageUrl) : null;

  const newGame = {
    id: item.$.id,
    name: name,
    thumbnail: thumbnail,
    image: image,
    popularity: 0,
    totalScores: 0,
    mean: 0,
    addedDate: new Date(),
    playerCounts: [],
    colors: [],
    months: [],
  };

  const newDetails = {
    bggThumbnail: thumbnailUrl,
    bggImage: imageUrl,
    description: item.description?._text ?? '',
    yearpublished: parseInt(item.yearpublished.$.value),
    minplayers: parseInt(item.minplayers.$.value),
    maxplayers: parseInt(item.maxplayers.$.value),
    playingtime: parseInt(item.playingtime.$.value),
    suggestedplayers: suggestedPlayers,
  };

  const newPlays = {
    totalPlays: 0,
    remainingPlays: 0,
    newestPlayDate: '',
    oldestPlayDate: '',
    maxDate: '',
    minDate: '',
    playsLastUpdated: new Date(0),
    minDatePlayIds: [],
    maxDatePlayIds: [],
  };

  console.info(`Adding ${newGame.name} (${newGame.id}) — published ${newDetails.yearpublished}, ${newDetails.minplayers}–${newDetails.maxplayers} players`);

  await firestore.collection('games').doc(newGame.id).set(newGame);
  await firestore.collection('details').doc(newGame.id).set(newDetails);
  await firestore.collection('plays').doc(newGame.id).set(newPlays);

  console.info(`✓ ${newGame.name} (${newGame.id}) added successfully`);

  return newGame;
};

const getGameId = async (searchTerm) => {
  if (!isNaN(searchTerm)) {
    // The search term is a game id
    console.log(`Using Game ID ${searchTerm}`);
    return searchTerm;
  }
  
  console.log(`Searching BGG for: ${searchTerm}`);

  // The search term is a game name
  const existingGamesByNameSnapshot = await firestore.collection('games').where('name', '==', searchTerm).get();

  if (existingGamesByNameSnapshot.size > 0) {
    console.log(`Game already exists with name "${searchTerm}", skipping`);
    return null;
  }

  const searchUrl = `https://api.geekdo.com/xmlapi2/search?query=${encodeURIComponent(searchTerm)}&type=boardgame&exact=1`;

  console.info(`Querying BGG search API: ${searchUrl}`);
  let searchResult;
  try {
    searchResult = await util.withRetry(() =>
      axios.get(searchUrl, {
        headers: { Authorization: `Bearer ${util.getApiKey()}` },
      })
    );
  } catch (err) {
    console.error(`BGG search API request failed for "${searchTerm}": ${err.message} (status: ${err.response?.status})`);
    return null;
  }

  const json = convert.xml2js(searchResult.data, {
    compact: true,
    attributesKey: '$',
  });

  if (json.items.item === undefined) {
    console.log(`No BGG search results found for "${searchTerm}"`);
    return null;
  }

  if (!Array.isArray(json.items.item)) {
    return json.items.item.$.id;
  }

  const foundGames = _(json.items.item)
    .filter((game) => game.yearpublished !== undefined)
    .orderBy([(game) => parseInt(game.yearpublished.$.value), (game) => parseInt(game.$.id)], ['desc', 'desc'])
    .value();

  if (foundGames.length === 0) {
    console.warn(`No BGG search results with a published year found for "${searchTerm}", skipping`);
    return null;
  }

  console.info(`Using Game ID ${foundGames[0].$.id}`);

  return foundGames[0].$.id;
};

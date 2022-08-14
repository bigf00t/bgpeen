const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const axios = require('axios');
const convert = require('xml-js');

const _ = require('lodash');

const util = require('./util');

exports.addGame = async (searchTerm, exact) => {
  let gameId;

  if (!isNaN(searchTerm)) {
    // The search term is a game id
    gameId = searchTerm;
  } else {
    // The search term is a game name
    const existingGamesByNameSnapshot = await firestore.collection('games').where('name', '==', searchTerm).get();

    if (existingGamesByNameSnapshot.size > 0) {
      return Promise.reject('Game already exists');
    }

    // eslint-disable-next-line prettier/prettier
    const searchUrl = `https://api.geekdo.com/xmlapi2/search?query=${searchTerm}&exact=${exact ? 1 : 0}&type=boardgame`;

    console.info(`Querying ${searchUrl}`);
    const searchResult = await axios.get(searchUrl);

    const json = convert.xml2js(searchResult.data, {
      compact: true,
      attributesKey: '$',
    });

    if (json.items.item === undefined) {
      return Promise.reject('No search results found');
    }

    // Use the newest result
    const foundGame =
      json.items.item.length > 1
        ? _.orderBy(
            json.items.item,
            [(item) => parseInt(item.yearpublished.$.value), (item) => parseInt(item.$.id)],
            ['desc', 'desc']
          )[0]
        : json.items.item;

    // if (item.name.$.value.replace(':', '').toUpperCase() !== searchTerm.toUpperCase()) {
    //   return Promise.reject(`Found a result, but it did not match your search: ${item.name.$.value}`);
    // }

    gameId = foundGame.$.id;
  }

  const gameByIdSnapshot = await firestore.collection('games').doc(gameId).get();
  if (gameByIdSnapshot.exists) {
    return Promise.reject('Game already exists');
  }

  await util.delay();

  const thingResult = await axios.get(`https://api.geekdo.com/xmlapi2/things?id=${gameId}`);

  const item = convert.xml2js(thingResult.data, {
    compact: true,
    attributesKey: '$',
  }).items.item;
  const name = Array.isArray(item.name)
    ? _.find(item.name, (name) => name.$.type === 'primary').$.value
    : item.name.$.value;
  const suggestedplayerspoll = _.find(item.poll, (poll) => poll.$.name === 'suggested_numplayers');
  const suggestedplayers = _.reduce(
    suggestedplayerspoll.results,
    (redPoll, results) => {
      redPoll[results.$.numplayers] = _.reduce(
        results.result,
        (redResults, result) => {
          redResults[result.$.value] = parseInt(result.$.numvotes);
          return redResults;
        },
        {}
      );
      return redPoll;
    },
    {}
  );

  const thumbnail = await util.uploadGameImage('thumbnails', item.$.id, item.thumbnail._text);
  const image = await util.uploadGameImage('images', item.$.id, item.image._text);

  const newGame = {
    id: item.$.id,
    name: name,
    thumbnail: thumbnail,
    image: image,
    bggThumbnail: item.thumbnail._text,
    bggImage: item.image._text,
    description: item.description._text,
    yearpublished: parseInt(item.yearpublished.$.value),
    minplayers: parseInt(item.minplayers.$.value),
    maxplayers: parseInt(item.maxplayers.$.value),
    playingtime: parseInt(item.playingtime.$.value),
    suggestedplayers: suggestedplayers,
    popularity: 0,
    totalPlays: 0,
    totalScores: 0,
    mean: 0,
    unusablePlays: 0,
    remainingPlays: 0,
    addedDate: new Date(),
    newestPlayDate: '',
    oldestPlayDate: '',
    maxDate: '',
    minDate: '',
    hasMinPlays: false,
    hasNoPlays: true,
    playerCounts: [],
  };

  console.info(`Adding ${newGame.name} (${newGame.id})`);

  return firestore
    .collection('games')
    .doc(newGame.id)
    .set(newGame)
    .then(() => newGame);
};

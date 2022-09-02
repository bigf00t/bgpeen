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
      console.log('Game already exists');
      return;
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
      console.log('No search results found');
      return;
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

    gameId = foundGame.$.id;
  }

  const gameByIdSnapshot = await firestore.collection('games').doc(gameId).get();
  if (gameByIdSnapshot.exists) {
    console.log('Game already exists');
    return;
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
    popularity: 0,
    totalScores: 0,
    mean: 0,
    addedDate: new Date(),
    playerCounts: '',
  };

  const newDetails = {
    bggThumbnail: item.thumbnail._text,
    bggImage: item.image._text,
    description: item.description._text,
    yearpublished: parseInt(item.yearpublished.$.value),
    minplayers: parseInt(item.minplayers.$.value),
    maxplayers: parseInt(item.maxplayers.$.value),
    playingtime: parseInt(item.playingtime.$.value),
    suggestedplayers: suggestedplayers,
  };

  const newPlays = {
    totalPlays: 0,
    remainingPlays: 0,
    newestPlayDate: '',
    oldestPlayDate: '',
    maxDate: '',
    minDate: '',
    hasMinPlays: false,
    hasNoPlays: true,
    playsLastUpdated: null,
    minDatePlayIds: '',
    maxDatePlayIds: '',
  };

  console.info(`Adding ${newGame.name} (${newGame.id})`);

  await firestore.collection('games').doc(newGame.id).set(newGame);

  await firestore.collection('details').doc(newGame.id).set(newDetails);

  await firestore.collection('plays').doc(newGame.id).set(newPlays);

  return newGame;
};

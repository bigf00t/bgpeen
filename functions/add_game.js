const { getFirestore } = require('firebase-admin/firestore');
const firestore = getFirestore();

const axios = require('axios');
const convert = require('xml-js');

const _ = require('lodash');

const util = require('./util');

exports.addGame = async (searchTerm) => {
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
    // xmlapi2 stopped working, so we had to revert to the old search api
    const searchUrl = `https://api.geekdo.com/xmlapi/search?search=${searchTerm}&exact=1`;

    console.info(`Querying ${searchUrl}`);
    const searchResult = await axios.get(searchUrl);

    const json = convert.xml2js(searchResult.data, {
      compact: true,
      attributesKey: '$',
    });

    console.log(json.boardgames.boardgame[1]);

    if (json.boardgames.boardgame === undefined) {
      console.log('No search results found');
      return;
    }

    const foundGames = _(json.boardgames.boardgame)
      .filter((game) => game.yearpublished !== undefined)
      .orderBy(
        [(boardgame) => parseInt(boardgame.yearpublished._text), (boardgame) => parseInt(boardgame.$.objectid)],
        ['desc', 'desc']
      )
      .value();

    gameId = foundGames[0].$.objectid;
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
    colors: [],
    months: [],
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

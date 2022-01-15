const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const moment = require('moment');

var _ = require('lodash');

const util = require('./util');

exports.addGame = (searchTerm, exact) =>
  db
    .collection('games')
    .where('name', '==', searchTerm)
    .get()
    .then((gamesSnapshot) => {
      if (gamesSnapshot.size > 0) {
        return Promise.reject('Game already exists');
      }

      // eslint-disable-next-line prettier/prettier
      let searchUrl = `https://api.geekdo.com/xmlapi2/search?query=${searchTerm}&exact=${exact ? 1 : 0}&type=boardgame`;

      console.info(`Querying ${searchUrl}`);
      return axios
        .get(searchUrl)
        .then((result) => {
          var json = convert.xml2js(result.data, {
            compact: true,
            attributesKey: '$',
          });
          if (json.items.item === undefined) {
            if (!exact) {
              return Promise.reject('No search results found');
            }
            // If we didn't find an exact match, try again with an inexact search
            return util.delay().then(() => exports.addGame(searchTerm.replace(':', ''), false));
          }

          var item;
          if (json.items.item.length > 1) {
            item = _.orderBy(
              json.items.item,
              [(item) => parseInt(item.yearpublished.$.value), (item) => parseInt(item.$.id)],
              ['desc', 'desc']
            )[0];
          } else {
            item = json.items.item;
          }

          if (item.name.$.value.replace(':', '').toUpperCase() !== searchTerm.toUpperCase()) {
            return Promise.reject(`Found a result, but it did not match your search: ${item.name.$.value}`);
          }

          return db
            .collection('games')
            .doc(item.$.id)
            .get()
            .then((gameSnapshot) => {
              if (gameSnapshot.exists) {
                return Promise.reject('Game already exists');
              }

              return util
                .delay(item.$.id)
                .then((id) => axios.get(`https://api.geekdo.com/xmlapi2/things?id=${id}`))
                .then((result) => {
                  var item = convert.xml2js(result.data, {
                    compact: true,
                    attributesKey: '$',
                  }).items.item;
                  var name = Array.isArray(item.name)
                    ? _.find(item.name, (name) => name.$.type === 'primary').$.value
                    : item.name.$.value;
                  var suggestedplayerspoll = _.find(item.poll, (poll) => poll.$.name === 'suggested_numplayers');
                  var suggestedplayers = _.reduce(
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

                  var newGame = {
                    id: item.$.id,
                    name: name,
                    thumbnail: item.thumbnail._text,
                    image: item.image._text,
                    description: item.description._text,
                    yearpublished: parseInt(item.yearpublished.$.value),
                    minplayers: parseInt(item.minplayers.$.value),
                    maxplayers: parseInt(item.maxplayers.$.value),
                    playingtime: parseInt(item.playingtime.$.value),
                    suggestedplayers: suggestedplayers,
                    popularity: 0,
                    totalPlays: 0,
                    unusablePlays: 0,
                    remainingPlays: 0,
                    addedDate: moment(new Date()),
                    newestPlayDate: '',
                    oldestPlayDate: '',
                    maxDate: '',
                    minDate: '',
                    isNew: true,
                  };

                  console.info(`Adding ${newGame.name} (${newGame.id})`);

                  return db
                    .collection('games')
                    .doc(newGame.id)
                    .set(newGame)
                    .then(() => newGame);
                })
                .catch((error) => Promise.reject(error));
            })
            .catch((error) => Promise.reject(error));
        })
        .catch((error) => Promise.reject(error));
    })
    .catch((error) => Promise.reject(error));

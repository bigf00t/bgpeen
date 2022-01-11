const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const moment = require('moment');

var _ = require('lodash');

const util = require('./util');

exports.addGame = (searchTerm, exact) => {
  return db
    .collection('games')
    .where('name', '==', searchTerm)
    .get()
    .then(function (gamesSnapshot) {
      if (gamesSnapshot.size > 0) {
        return Promise.resolve('Game already exists');
      }

      // eslint-disable-next-line prettier/prettier
      let searchUrl = `https://api.geekdo.com/xmlapi2/search?query=${searchTerm}&exact=${exact ? 1 : 0}&type=boardgame`;

      console.info(`Querying ${searchUrl}`);
      return axios
        .get(searchUrl)
        .then(function (result) {
          var json = convert.xml2js(result.data, {
            compact: true,
            attributesKey: '$',
          });
          if (json.items.item === undefined) {
            if (exact) {
              return util.delay().then(function () {
                // If we didn't find an exact match, try again with an inexact search
                return exports.addGame(searchTerm.replace(':', ''), false);
              });
            }
            result = 'No search results found';
            console.warn(result);
            return Promise.resolve(result);
          }

          var item;
          if (json.items.item.length > 1) {
            console.log(json.items);
            item = _.orderBy(
              json.items.item,
              [
                function (item) {
                  return parseInt(item.yearpublished.$.value);
                },
                function (item) {
                  return parseInt(item.$.id);
                },
              ],
              ['desc', 'desc']
            )[0];
          } else {
            item = json.items.item;
          }
          console.log(item);

          if (item.name.$.value.replace(':', '').toUpperCase() !== searchTerm.toUpperCase()) {
            result = `Found a result, but it did not match your search: ${item.name.$.value}`;
            console.warn(result);
            return Promise.resolve(result);
          }

          return db
            .collection('games')
            .doc(item.$.id)
            .get()
            .then(function (gameSnapshot) {
              if (gameSnapshot.exists) {
                result = 'Game already exists';
                console.warn(result);
                return Promise.resolve(result);
              }

              return util
                .delay(item.$.id)
                .then(function (id) {
                  return axios.get(`https://api.geekdo.com/xmlapi2/things?id=${id}`);
                })
                .then(function (result) {
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
                    dateAdded: moment(new Date()).format(),
                    startDate: '',
                    maxDate: '',
                    minDate: '',
                  };

                  console.info(`Successfully added ${name}!`);

                  return db
                    .collection('games')
                    .doc(newGame.id)
                    .set(newGame)
                    .then(() => {
                      return newGame;
                    });
                })
                .catch(function (error) {
                  console.error(error);
                });
            });
        })
        .catch(function (error) {
          console.error(error);
        });
    });
};

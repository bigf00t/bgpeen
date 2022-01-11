const admin = require('firebase-admin');
const db = admin.firestore();

const axios = require('axios');
const convert = require('xml-js');
const moment = require('moment');

var _ = require('lodash');

const util = require('./util');

exports.updateGamePlays = (game, maxPages) => {
  var gameRef = db.collection('games').doc(game.id);
  console.info(`Started updating plays for: ${game.name}`);
  var playsUrl = getPlaysUrl(game);
  return updatePlaysRecursively(game, gameRef, playsUrl, maxPages).then(function (pageResults) {
    return updateGame(game, gameRef, pageResults);
  });
  // .then(function () {
  //   // if (game.isNew) {
  //   //   return gameRef.update({ isNew: false });
  //   // }
  //   // console.info('Finished updateGamePlays');
  //   return Promise.resolve();
  // });
};

function updateGame(game, gameRef, pageResults) {
  var plays = _.flatMap(pageResults, 'plays');
  var newUnusablePlayCount = _.reduce(pageResults, (sum, pageResult) => sum + pageResult.unusablePlays, 0);
  var newOldestPlayDate = pageResults.slice(-1)[0].plays.slice(-1)[0].date;

  var oldestPlayDate =
    game.oldestPlayDate === undefined || moment(newOldestPlayDate).isBefore(game.oldestPlay)
      ? newOldestPlayDate
      : game.oldestPlay;

  var newNewestPlayDate = pageResults[0].plays[0].date;
  var newestPlayDate =
    game.newestPlayDate === undefined || moment(newNewestPlayDate).isAfter(game.newestPlay)
      ? newNewestPlayDate
      : game.newestPlay;

  var remainingPlays = pageResults.slice(-1)[0].remainingPlays;

  // console.log(game.unusablePlays + newUnusablePlayCount);
  // console.log(pageResults.slice(-1)[0].remainingPlays);
  // console.log(oldestPlayDate);
  // console.log(newestPlayDate);
  // console.log(_.defaultTo(game.totalPlays, 0) + plays.length);
  // console.log(moment(new Date()).format('YYYY-MM-DD'));
  return gameRef
    .update({
      unusablePlays: _.defaultTo(game.unusablePlays, 0) + newUnusablePlayCount,
      remainingPlays: remainingPlays,
      startDate: remainingPlays === 0 ? '' : _.defaultTo(game.startDate, '') === '' ? newestPlayDate : game.startDate,
      maxDate: remainingPlays === 0 ? '' : oldestPlayDate,
      minDate: remainingPlays === 0 ? game.startDate : _.defaultTo(game.minDate, ''),
      totalPlays: _.defaultTo(game.totalPlays, 0) + plays.length,
      lastUpdated: moment(new Date()).format(),
    })
    .then(function () {
      return Promise.resolve(plays);
    });
}

function getPlaysUrl(game) {
  // var maxDate = _.defaultTo(game.remainingPlays, 0) > 0 ? _.defaultTo(game.oldestPlay, '') : '';
  // var minDate = maxDate === '' ? _.defaultTo(game.newestPlay, '') : '';

  return (
    `https://api.geekdo.com/xmlapi2/plays?id=${game.id}` +
    `&mindate=${_.defaultTo(game.minDate, '')}` +
    `&maxdate=${_.defaultTo(game.maxDate, '')}` +
    `&page=`
  );
}

function updatePlaysRecursively(game, gameRef, playsUrl, maxPages, page = 1) {
  // console.info('Loading plays page: ' + page);
  return updatePlaysPage(gameRef, playsUrl, maxPages, page).then(function (pageResult) {
    // console.info(
    //   'Remaining pages: ' +
    //     (pageResult.remainingPages > maxPages - page
    //       ? maxPages - page
    //       : pageResult.remainingPages)
    // );
    if (page >= maxPages || pageResult.remainingPages == 0) {
      //Hit the bottom of the stack
      return Promise.resolve([pageResult]);
    }
    return util.delay(page + 1).then(function (nextPage) {
      return updatePlaysRecursively(game, gameRef, playsUrl, maxPages, nextPage).then(function (pageResults) {
        // Returning pageResults back up the stack
        // Make sure the pages are ordered newest to oldest
        pageResults.splice(0, 0, pageResult);
        return Promise.resolve(pageResults);
      });
    });
  });
}

function updatePlaysPage(gameRef, playsUrl, maxPages, page) {
  console.info(`Starting BGG call: ${playsUrl}${page}`);
  return axios
    .get(playsUrl + page)
    .then(function (result) {
      // console.info('Finished BGG call');
      var json = convert.xml2js(result.data, {
        compact: true,
        attributesKey: '$',
      });

      if (json.plays.play != undefined) {
        var plays = getCleanPlaysFromJson(json.plays.play);
        // console.info(plays);

        // console.info('Started db batch updates');
        var batch = db.batch();

        _.forEach(plays, function (play) {
          var playRef = gameRef.collection('plays').doc(play.id);
          batch.set(playRef, play);
        });

        batch.commit();
        // console.info('Committed db batch updates');

        var totalPlays = json.plays.$.total;
        var unusablePlays = json.plays.play.length - plays.length;
        var remainingPlays = totalPlays - (maxPages * (page - 1) + json.plays.play.length);
        var remainingPages = _.ceil(totalPlays / maxPages) - page;

        return {
          remainingPages: remainingPages,
          unusablePlays: unusablePlays,
          remainingPlays: remainingPlays,
          plays: plays,
        };
      }

      return null;
    })
    .catch(function (error) {
      console.error(error);
    });
}

function getCleanPlaysFromJson(plays) {
  return _(plays)
    .filter(function (play) {
      return _.get(play, 'players.player[0]');
    })
    .map(function (play) {
      var players = getCleanPlayersFromJson(play.players.player);
      var cleanPlay = { ...play.$ };
      cleanPlay.players = players;
      cleanPlay.playerCount = players.length.toString();
      cleanPlay.playerUserIds = getPlayerUserIds(players);
      return cleanPlay;
    })
    .value();
}

function getCleanPlayersFromJson(players) {
  return _(players)
    .map(function (player) {
      return { ...player.$ };
    })
    .value();
}

function getPlayerUserIds(players) {
  return _(players)
    .filter(function (player) {
      return player.userid != undefined;
    })
    .map(function (player) {
      return player.userid;
    })
    .value();
}

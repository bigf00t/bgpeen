// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const axios = require('axios');
const convert = require('xml-js');
const lodash = require('lodash');
const cors = require('cors')({origin: true});

exports.addGame = functions.https.onRequest(async (req, res) => {
    axios.get('https://api.geekdo.com/xmlapi2/search?query=' + req.body + '&exact=1&type=boardgame')
        .then(function (result) {
            var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});
            if (json.items.item != undefined) {
                var item = json.items.item.length > 1 ? json.items.item[0] : json.items.item;
                const gameRef = admin.database().ref('/games/').child(item.$.id);
                const gamePlayRef = admin.database().ref('/plays/').child(item.$.id);
                console.log(item);
                
                return axios.get('https://api.geekdo.com/xmlapi2/plays?id=' + item.$.id + '')
                    .then(function (result) {
                        var json = convert.xml2js(result.data, {compact: true, attributesKey: '$'});
                        var filteredPlays = lodash.map(
                            lodash.filter(json.plays.play, function(play) { 
                                return play.players != undefined // TODO: All players have scores
                            }), 
                            function(play) {
                                return {
                                    ...play.$,
                                    players: lodash.map(play.players.player, function(player) {
                                        return { ...player.$ }
                                    })
                                };
                            });
                        
                        lodash.forEach(filteredPlays, function(play) {
                            gamePlayRef.child(play.id).set({...play});
                        });
                        
                        var players = lodash.flatten(lodash.map(filteredPlays, 'players'));
                        var scores = lodash.map(lodash.filter(players, function(player) {
                            return player.score 
                        }), function(player) {
                            return parseInt(player.score)
                        });
                        var mean = lodash.mean(scores);
                        
                        var game = {
                            name: item.name.$.value,
                            average: mean.toFixed(1)
                        };
                        gameRef.set(game);

                        console.log(game);
                        res.send(game);
                    });
            } else {
                res.send(json); 
            }
        })
        .catch(function (e) {
            console.log(e);
            res.send({error: e});
        });
});
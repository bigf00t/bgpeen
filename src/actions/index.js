import {FETCH_GAME, FETCH_GAMES} from '../actions/types';
import FireStoreParser from 'firestore-parser';
import _ from 'lodash';

const isLocal = () => {
  return window.location.hostname.includes("localhost");
}

// TODO: This could be cleaner
const getHost = () => {
  // If this is running locally, use the function emulator host
  return isLocal() ? 
  "http://localhost:5002/v1/projects/bgpeen-1fc16/databases/(default)/documents/" :
  "https://firestore.googleapis.com/v1/projects/bgpeen-1fc16/databases/(default)/documents/";
}

export const fetchGame = (gameId) => async dispatch => {
  return fetch(`${getHost()}games/${gameId}`, {
      method: 'GET',
      mode: 'cors',
      headers: {}
    })
    .then((response) => {
        return response.json();
    })
    .then(json => FireStoreParser(json))
    .then((json) => {
      dispatch({
        type: FETCH_GAME,
        payload: json.fields
      });
    })
    .catch((error) => {
        console.log("Request failed", error);
    });
};

export const fetchGames = () => async dispatch => {
  var mask = "?mask.fieldPaths=name&mask.fieldPaths=id&mask.fieldPaths=playerCounts";
  return fetch(`${getHost()}games${mask}`, {
      method: 'GET',
      mode: 'cors',
      headers: {},
    })
    .then((response) => {
        return response.json();
    })
    .then(json => {
      return FireStoreParser(json)
    })
    .then((json) => {
      var gamesJson = _(json.documents)
        .filter(doc => ! _.isEmpty(doc.fields))
        .map(doc => doc.fields)
        .sortBy(["name"])
        .value();
      
      dispatch({
        type: FETCH_GAMES,
        payload: gamesJson
      });
    })
    .catch((error) => {
        console.log("Request failed", error);
    });
};
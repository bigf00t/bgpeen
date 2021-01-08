import {FETCH_GAMES} from '../actions/types';

const isLocal = () => {
  return (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
}

// TODO: This could be cleaner
const getFunctionUrl = (functionName) => {
  var host = "https://us-central1-bgpeen-1fc16.cloudfunctions.net/";

  // If this is running locally, use the function emulator host
  if (isLocal()) {
    host = "http://localhost:5001/bgpeen-1fc16/us-central1/";
  }

  return host + functionName
}

export const fetchGames = () => async dispatch => {
  return fetch(getFunctionUrl("getGames"), {
      method: 'POST',
      mode: 'cors',
      headers: isLocal() ? {
          'Access-Control-Allow-Origin': '*'
      } : {}
    })
    .then((response) => {
        // console.log(response);
        return response.json();
    })
    .then((json) => {
      dispatch({
        type: FETCH_GAMES,
        payload: json
      });
      // console.log(json);
    })
    .catch((error) => {
        console.log("Request failed", error);
    });
};
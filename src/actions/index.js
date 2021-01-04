import {fire} from '../fire';
import {FETCH_GAMES} from '../actions/types';

export const fetchGames = () => async dispatch => {
  // fire.database().ref("games").on("value", snapshot => {
  //   dispatch({
  //     type: FETCH_GAMES,
  //     payload: snapshot.val()
  //   });
  // });
  console.log('fetchGames');
  fetch("http://localhost:5001/bgpeen-1fc16/us-central1/getGames", {
  //fetch("https://us-central1-bgpeen-1fc16.cloudfunctions.net/addGame", {
      method: 'POST',
      mode: 'cors',
      headers: {
          'Access-Control-Allow-Origin': '*',
          // 'Content-Type': 'application/json',
      }
    })
    .then((response) => {
        console.log(response);
        return response.json();
    })
    .then((json) => {
      dispatch({
        type: FETCH_GAMES,
        payload: json
      });
      console.log(json);
    })
    .catch((error) => {
        console.log("Request failed", error);
    });
};
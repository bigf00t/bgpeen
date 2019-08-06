import {fire} from '../fire';
import {FETCH_GAMES} from '../actions/types';

export const fetchGames = () => async dispatch => {
  fire.database().ref("games").on("value", snapshot => {
    dispatch({
      type: FETCH_GAMES,
      payload: snapshot.val()
    });
  });
};
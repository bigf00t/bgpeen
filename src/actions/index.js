import { FETCH_GAMES, FETCH_GAME_RESULTS } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const fetchGames = () => async (dispatch) => {
  return db
    .collection('games')
    .orderBy('name', 'asc')
    .get()
    .then((snapshot) => {
      let games = [];
      snapshot.forEach((doc) => {
        if (!_.isEmpty(doc.data())) {
          games.push(doc.data());
        }
      });
      dispatch({
        type: FETCH_GAMES,
        payload: games,
      });
    });
};

export const fetchGameResults = (gameId) => async (dispatch) => {
  return db
    .collection('results')
    .doc(gameId)
    .get()
    .then((snapshot) => {
      dispatch({
        type: FETCH_GAME_RESULTS,
        payload: { id: gameId, ...snapshot.data() },
      });
    });
};

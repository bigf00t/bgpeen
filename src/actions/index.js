import { LOAD_GAMES, LOAD_GAME, SET_GAME } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const loadGames = () => async (dispatch) => {
  return db
    .collection('games')
    .where('isNew', '==', false)
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
        type: LOAD_GAMES,
        payload: games,
      });
    });
};

export const loadGame = (gameId) => async (dispatch) => {
  return db
    .collection('results')
    .doc(gameId)
    .get()
    .then((snapshot) => {
      var gameRef = db.collection('games').doc(gameId);
      gameRef.get().then((doc) => {
        gameRef.update({ popularity: (doc.data().popularity || 0) + 1 });
      });
      dispatch({
        type: LOAD_GAME,
        payload: { id: gameId, ...snapshot.data() },
      });
    });
};

export const setGame = (gameId) => async (dispatch) => {
  return dispatch({
    type: SET_GAME,
    payload: { id: gameId },
  });
};

import { FETCH_GAMES, FETCH_GAME_RESULTS } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const fetchGames = () => async (dispatch) => {
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
      var gameRef = db.collection('games').doc(gameId);
      gameRef.get().then((doc) => {
        gameRef.update({ popularity: (doc.data().popularity || 0) + 1 });
        dispatch({
          type: FETCH_GAME_RESULTS,
          payload: { id: gameId, ...snapshot.data() },
        });
      });
    });
};

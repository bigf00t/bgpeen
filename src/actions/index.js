import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';

import { LOAD_GAMES, LOAD_GAME, SET_GAME } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const loadGames = () => async (dispatch) => {
  const q = query(collection(db, 'games'), where('hasNoPlays', '==', false), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);

  const games = [];
  querySnapshot.forEach((doc) => {
    if (!_.isEmpty(doc.data())) {
      games.push(doc.data());
    }
  });
  dispatch({
    type: LOAD_GAMES,
    payload: games,
  });
};

export const loadGame = (gameId) => async (dispatch) => {
  const resultsRef = doc(db, 'results', gameId);
  const resultsSnapshot = await getDoc(resultsRef);

  const gameRef = doc(db, 'games', gameId);
  const gameSnapshot = await getDoc(gameRef);

  await updateDoc(gameRef, {
    popularity: (gameSnapshot.data().popularity || 0) + 1,
    lastLoadedDate: new Date(),
  });

  dispatch({
    type: LOAD_GAME,
    payload: { id: gameId, ...resultsSnapshot.data() },
  });
};

export const setGame = (gameId) => async (dispatch) => {
  // console.log('actions setGame');
  dispatch({
    type: SET_GAME,
    payload: { id: gameId },
  });
};

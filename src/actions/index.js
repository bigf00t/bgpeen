import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

import { LOAD_GAMES, LOAD_GAME, LOAD_RESULT } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const loadGames = () => async (dispatch) => {
  const q = query(collection(db, 'games'), where('totalScores', '>', 0));
  const querySnapshot = await getDocs(q);

  const games = [];
  querySnapshot.forEach((doc) => {
    if (!_.isEmpty(doc.data())) {
      games.push({
        id: doc.data().id,
        name: doc.data().name,
        totalScores: doc.data().totalScores,
        mean: doc.data().mean,
        thumbnail: doc.data().thumbnail,
        popularity: doc.data().popularity,
        addedDate: new Date(doc.data().addedDate.seconds * 1000),
      });
    }
  });

  const sortedGameNames = _.sortBy(games, 'name');

  dispatch({
    type: LOAD_GAMES,
    payload: sortedGameNames,
  });
};

export const loadGame = (gameId) => async (dispatch) => {
  const gameRef = doc(db, 'games', gameId);
  const gameSnapshot = await getDoc(gameRef);

  const result = await _loadResult(gameId, 'all');

  await updateDoc(gameRef, {
    popularity: (gameSnapshot.data().popularity || 0) + 1,
    lastLoadedDate: new Date(),
  });

  dispatch({
    type: LOAD_GAME,
    payload: { ...gameSnapshot.data(), results: result },
  });
};

export const loadResult = (gameId, resultId) => async (dispatch) => {
  const result = await _loadResult(gameId, resultId);

  dispatch({
    type: LOAD_RESULT,
    payload: result,
  });
};

const _loadResult = async (gameId, resultId) => {
  const resultDocSnapshot = await getDoc(doc(db, 'games', gameId, 'results', resultId));
  let result = resultDocSnapshot.data();

  return { [resultId]: result };
};

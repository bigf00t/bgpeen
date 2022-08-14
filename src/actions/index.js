import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, limit } from 'firebase/firestore';

import { LOAD_GAME_NAMES, LOAD_POPULAR_GAMES, LOAD_NEW_GAMES, LOAD_GAME } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const loadGameNames = () => async (dispatch) => {
  const q = query(collection(db, 'games'), where('totalScores', '>', 0));
  const querySnapshot = await getDocs(q);

  const gameNames = [];
  querySnapshot.forEach((doc) => {
    if (!_.isEmpty(doc.data())) {
      gameNames.push({
        id: doc.data().id,
        name: doc.data().name,
        totalScores: doc.data().totalScores,
      });
    }
  });

  const sortedGameNames = _.sortBy(gameNames, 'name');

  dispatch({
    type: LOAD_GAME_NAMES,
    payload: sortedGameNames,
  });
};

export const loadPopularGames = () => async (dispatch) => {
  dispatch({
    type: LOAD_POPULAR_GAMES,
    payload: await loadSortedGames('popularity'),
  });
};

export const loadNewGames = () => async (dispatch) => {
  dispatch({
    type: LOAD_NEW_GAMES,
    payload: await loadSortedGames('addedDate'),
  });
};

export const loadSortedGames = async (sortBy) => {
  const q = query(collection(db, 'games'), where('totalScores', '>', 0), limit(10));
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

  const sortedGames = _.sortBy(games, sortBy).reverse();

  return sortedGames;
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
    payload: { game: gameSnapshot.data(), results: resultsSnapshot.data() },
  });
};

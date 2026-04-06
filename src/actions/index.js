import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  getAggregateFromServer,
  sum,
  count,
} from 'firebase/firestore';

import { LOAD_GAMES, LOAD_GAME, PREFETCH_GAME, LOAD_RESULT, SET_GAME, LOAD_TOP_GAMES, LOAD_SCORE_STATS } from '../actions/types';
import _ from 'lodash';
import { db } from '../fire';

export const setGame = (game) => ({ type: SET_GAME, payload: game });

export const loadGames = () => async (dispatch) => {
  try {
    const q = query(collection(db, 'games'));
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

    dispatch({
      type: LOAD_GAMES,
      payload: _.sortBy(games, 'name'),
    });
  } catch (e) {
    console.error('loadGames failed:', e);
  }
};

export const loadTopGames = (field) => async (dispatch) => {
  try {
    const q = query(collection(db, 'games'), orderBy(field, 'desc'), limit(15));
    const querySnapshot = await getDocs(q);

    const games = [];
    querySnapshot.forEach((doc) => {
      if (!_.isEmpty(doc.data()) && doc.data().totalScores > 0) {
        games.push({
          id: doc.data().id,
          name: doc.data().name,
          totalScores: doc.data().totalScores,
          mean: doc.data().mean,
          thumbnail: doc.data().thumbnail,
          popularity: doc.data().popularity,
          addedDate: doc.data().addedDate,
        });
      }
    });

    dispatch({
      type: LOAD_TOP_GAMES,
      payload: { field, games: games.slice(0, 10) },
    });
  } catch (e) {
    console.error('loadTopGames failed:', e);
  }
};

export const loadScoreStats = () => async (dispatch) => {
  try {
    const q = query(collection(db, 'games'), where('totalScores', '>', 0));
    const snapshot = await getAggregateFromServer(q, {
      totalScores: sum('totalScores'),
      totalGames: count(),
    });

    dispatch({
      type: LOAD_SCORE_STATS,
      payload: {
        totalScores: snapshot.data().totalScores,
        totalGames: snapshot.data().totalGames,
      },
    });
  } catch (e) {
    console.error('loadScoreStats failed:', e);
  }
};

export const loadGame = (gameId) => async (dispatch) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const [gameSnapshot, result] = await Promise.all([
      getDoc(gameRef),
      _loadResult(gameId, 'all'),
    ]);

    dispatch({
      type: LOAD_GAME,
      payload: { ...gameSnapshot.data(), results: result },
    });

    updateDoc(gameRef, {
      popularity: (gameSnapshot.data().popularity || 0) + 1,
      lastLoadedDate: new Date(),
    }).catch((e) => console.error('Failed to update game stats:', e));
  } catch (e) {
    console.error('loadGame failed:', e);
  }
};

export const prefetchGame = (gameId) => async (dispatch) => {
  try {
    const gameRef = doc(db, 'games', gameId);
    const [gameSnapshot, result] = await Promise.all([
      getDoc(gameRef),
      _loadResult(gameId, 'all'),
    ]);

    dispatch({
      type: PREFETCH_GAME,
      payload: { ...gameSnapshot.data(), results: result },
    });
  } catch (e) {
    console.error('prefetchGame failed:', e);
  }
};

export const loadResult = (gameId, resultId) => async (dispatch) => {
  try {
    const result = await _loadResult(gameId, resultId);

    dispatch({
      type: LOAD_RESULT,
      payload: result,
    });
  } catch (e) {
    console.error('loadResult failed:', e);
  }
};

const _loadResult = async (gameId, resultId) => {
  const resultDocSnapshot = await getDoc(doc(db, 'games', gameId, 'results', resultId));
  if (!resultDocSnapshot.exists()) {
    return { [resultId]: null };
  }
  return { [resultId]: { ...resultDocSnapshot.data(), id: resultId } };
};

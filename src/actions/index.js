import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

import { LOAD_GAMES, LOAD_GAME } from '../actions/types';
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

  const allDocSnapshot = await getDoc(doc(db, 'games', gameId, 'results', 'all'));
  let results = [allDocSnapshot.data()];

  // where is temporary
  const resultsRef = query(collection(db, 'games', gameId, 'results'), where('playerCount', '>', 0));
  const resultsSnapshot = await getDocs(resultsRef);

  resultsSnapshot.forEach((doc) => {
    results.push(doc.data());
  });

  // console.log(JSON.stringify(results[0].scores));
  // console.log(JSON.stringify(results[0].outlierScores));

  await updateDoc(gameRef, {
    popularity: (gameSnapshot.data().popularity || 0) + 1,
    lastLoadedDate: new Date(),
  });

  dispatch({
    type: LOAD_GAME,
    payload: { game: gameSnapshot.data(), results: { results } },
  });
};

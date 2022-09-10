import { LOAD_GAMES, LOAD_GAME } from '../actions/types';
import _ from 'lodash';

const dataState = {
  game: null,
  loadedGames: [],
  games: [],
  popularGames: [],
  newGames: [],
};

export default (state = dataState, action) => {
  switch (action.type) {
    case LOAD_GAMES:
      return {
        ...state,
        games: action.payload,
        popularGames: _.orderBy(action.payload, 'popularity', 'desc').slice(0, 10),
        newGames: _.orderBy(action.payload, 'addedDate', 'desc').slice(0, 10),
      };
    case LOAD_GAME:
      var newGame = { ...action.payload.game, ...action.payload.results };
      return {
        ...state,
        game: newGame,
        loadedGames: [newGame, ...state.loadedGames],
      };
    default:
      return state;
  }
};

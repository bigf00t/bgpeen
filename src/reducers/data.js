import { LOAD_GAMES, LOAD_GAME } from '../actions/types';

const dataState = {
  game: null,
  loadedGames: [],
  games: [],
};

export default (state = dataState, action) => {
  switch (action.type) {
    case LOAD_GAMES:
      return {
        ...state,
        games: action.payload,
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

import { LOAD_GAMES, LOAD_GAME, LOAD_RESULT } from '../actions/types';

const dataState = {
  game: null,
  loadedGames: {},
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
      return {
        ...state,
        game: action.payload,
        loadedGames: { ...state.loadedGames, [action.payload.id]: { ...action.payload } },
      };
    case LOAD_RESULT:
      var newGame = { ...state.game, results: { ...state.game.results, ...action.payload } };
      return {
        ...state,
        game: newGame,
        loadedGames: { ...state.loadedGames, [newGame.id]: { ...newGame } },
      };
    default:
      return state;
  }
};

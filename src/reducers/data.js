import { LOAD_GAME_NAMES, LOAD_POPULAR_GAMES, LOAD_NEW_GAMES, LOAD_GAME } from '../actions/types';

const dataState = {
  game: null,
  loadedGames: [],
  gameNames: [],
  popularGames: [],
  newGames: [],
};

export default (state = dataState, action) => {
  switch (action.type) {
    case LOAD_GAME_NAMES:
      return {
        ...state,
        gameNames: action.payload,
      };
    case LOAD_POPULAR_GAMES:
      return {
        ...state,
        popularGames: action.payload,
      };
    case LOAD_NEW_GAMES:
      return {
        ...state,
        newGames: action.payload,
      };
    case LOAD_GAME:
      var foundGame = state.loadedGames.find((game) => game.id == action.payload.id, null);
      if (foundGame) {
        return {
          ...state,
          game: foundGame,
        };
      }
      var newGame = { ...action.payload.game, ...action.payload.results };
      return {
        ...state,
        game: newGame,
        loadedGames: [
          ...state.loadedGames.map((game) => {
            if (game.id !== action.payload.id) {
              return game;
            }

            return newGame;
          }),
        ],
      };
    default:
      return state;
  }
};

import { LOAD_GAMES, LOAD_GAME, SET_GAME } from '../actions/types';

const dataState = {
  game: null,
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
      var loadedGame = state.games.find(
        (game) => game.id == action.payload.id,
        null
      );
      return {
        ...state,
        game: loadedGame ? { ...loadedGame, ...action.payload } : null,
        games: [
          ...state.games.map((game) => {
            if (game.id !== action.payload.id) {
              return game;
            }

            return {
              ...game,
              // popularity: (game.popularity || 0) + 1,
              ...action.payload,
            };
          }),
        ],
      };
    case SET_GAME:
      return {
        ...state,
        game: state.games.find((game) => game.id == action.payload.id, null),
      };
    default:
      return state;
  }
};

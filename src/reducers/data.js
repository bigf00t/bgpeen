import { FETCH_GAMES, FETCH_GAME_RESULTS } from '../actions/types';

const dataState = {
  games: [],
};

export default (state = dataState, action) => {
  switch (action.type) {
    case FETCH_GAMES:
      return {
        ...state,
        games: action.payload,
      };
    case FETCH_GAME_RESULTS:
      return {
        ...state,
        games: [
          ...state.games.map((game) => {
            if (game.id !== action.payload.id) {
              return game;
            }

            return {
              ...game,
              popularity: (game.popularity || 0) + 1,
              ...action.payload,
            };
          }),
        ],
      };
    default:
      return state;
  }
};

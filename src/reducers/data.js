import {FETCH_GAME, FETCH_GAMES} from '../actions/types';

const gamesState = {
  games: []
}

export default (state = gamesState, action) => {
    switch(action.type) {
      case FETCH_GAME:
        return {
          ...state,
          games: [
            ...state.games.map(game => {
              if (game.id !== action.payload.id) {
                return game;
              }

              return {
                ...game,
                results: action.payload.results
              }
            })
          ]};
      case FETCH_GAMES:
        return {
          ...state,
          games: action.payload
        };
      default:
        return state;
    }
  };
import { combineReducers } from 'redux';
import { LOAD_GAMES, LOAD_GAME, PREFETCH_GAME, LOAD_RESULT, SET_GAME, LOAD_TOP_GAMES, LOAD_SCORE_STATS } from './types';

const dataState = {
  game: null,
  loadedGames: {},
  games: [],
  topGames: {},
  scoreStats: null,
};

const data = (state = dataState, action) => {
  switch (action.type) {
    case LOAD_GAMES:
      return {
        ...state,
        games: action.payload,
      };
    case LOAD_TOP_GAMES:
      return {
        ...state,
        topGames: { ...state.topGames, [action.payload.field]: action.payload.games },
      };
    case LOAD_SCORE_STATS:
      return {
        ...state,
        scoreStats: action.payload,
      };
    case LOAD_GAME:
      return {
        ...state,
        game: action.payload,
        loadedGames: { ...state.loadedGames, [action.payload.id]: { ...action.payload } },
      };
    case PREFETCH_GAME:
      return {
        ...state,
        loadedGames: { ...state.loadedGames, [action.payload.id]: { ...action.payload } },
      };
    case SET_GAME:
      return {
        ...state,
        game: action.payload,
      };
    case LOAD_RESULT:
      if (!state.game) return state;
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

export default combineReducers({ data });

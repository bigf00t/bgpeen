import { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { addRecentlyViewed } from '../components/RecentlyViewed';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const getIntFromParam = (param) => (param && !isNaN(param) ? parseInt(param) : '');

const useGameResult = ({ id, searchParams, justAdded, game, loadedGames, setGame, loadGame, loadResult }) => {
  const [filters, setFilters] = useState({});
  const [result, setResult] = useState();
  const [resultLoading, setResultLoading] = useState(false);

  const getResultId = () => {
    if (filters.players) {
      let rid = `count-${filters.players}`;
      if (filters.start) rid += `-start-${filters.start}`;
      else if (filters.finish) rid += `-finish-${filters.finish}`;
      else if (filters.new) rid += `-new`;
      return rid;
    }
    if (filters.color) return `color-${filters.color}`;
    if (filters.year) {
      let rid = `year-${filters.year}`;
      if (filters.month) rid += `-month-${filters.month}`;
      return rid;
    }
    return 'all';
  };

  const setFiltersFromUrl = () => {
    setFilters({
      players: getIntFromParam(searchParams.get('players')),
      finish:  getIntFromParam(searchParams.get('finish')),
      start:   getIntFromParam(searchParams.get('start')),
      new:     getIntFromParam(searchParams.get('new')),
      color:   searchParams.get('color') || '',
      year:    getIntFromParam(searchParams.get('year')),
      month:   getIntFromParam(searchParams.get('month')),
    });
  };

  const findOrLoadResult = () => {
    const resultId = getResultId();
    const results = game.results;
    if (Object.prototype.hasOwnProperty.call(results, resultId)) {
      setResult(results[resultId]);
      setResultLoading(false);
    } else {
      setResultLoading(true);
      loadResult(id, resultId);
    }
  };

  const findOrLoadGame = () => {
    const foundGame = loadedGames[id];
    if (foundGame) {
      setGame(foundGame);
      addRecentlyViewed(foundGame);
      fetch(`/api/record-view?id=${id}`).catch((e) => console.error('Failed to record game view:', e));
    } else {
      loadGame(id);
    }
  };

  // Mount
  useEffect(() => {
    if (game === null || game.id !== id) findOrLoadGame();
  }, []);

  // Game loaded / URL params changed
  useEffect(() => {
    if (game) {
      addRecentlyViewed(game);
      setFiltersFromUrl();
    }
  }, [game?.id, searchParams.toString()]);

  // Filters changed → load result
  useEffect(() => {
    if (!_.isEmpty(filters)) findOrLoadResult();
  }, [filters]);

  // Results arrive from Redux
  useEffect(() => {
    if (_.isEmpty(filters)) return;
    if (game?.results && Object.keys(game.results).length > 0) {
      setResult(game.results[getResultId()]);
      setResultLoading(false);
    }
  }, [game?.results]);

  // Live-update while scores are being crunched (only for freshly-added games).
  // Ref keeps the callback fresh without adding it to the dep array, which would
  // re-subscribe the snapshot listener on every render.
  const loadGameRef = useRef(loadGame);
  useEffect(() => { loadGameRef.current = loadGame; });
  useEffect(() => {
    if (!justAdded || (game?.totalScores ?? 0) > 0) return;
    const unsubscribe = onSnapshot(doc(db, 'games', id), (snap) => {
      if ((snap.data()?.totalScores ?? 0) > 0) loadGameRef.current(id);
    });
    return unsubscribe;
  }, [justAdded, game?.totalScores, id]);

  return { filters, result, resultLoading };
};

export default useGameResult;

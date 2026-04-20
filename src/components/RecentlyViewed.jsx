import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGameSlug } from '../utils';

const STORAGE_KEY = 'recentlyViewed';
const MAX_RECENT = 8;

export const addRecentlyViewed = (game) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = existing.filter((g) => g.id !== game.id);
    const updated = [{ id: game.id, name: game.name, thumbnail: game.thumbnail }, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // localStorage unavailable
  }
};

const RecentlyViewed = () => {
  const [games, setGames] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setGames(stored);
    } catch (e) {
      setGames([]);
    }
  }, []);

  if (games.length === 0) return null;

  return (
    <div className="recently-viewed">
      <div className="recent-chips">
        {games.map((game) => (
          <Link
            key={game.id}
            className="recent-chip"
            to={`/${game.id}/${getGameSlug(game)}`}
          >
            <img
              className="recent-chip-dot"
              src={game.thumbnail}
              alt=""
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {game.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewed;

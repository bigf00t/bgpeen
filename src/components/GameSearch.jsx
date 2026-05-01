import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as actions from '../store/actions';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { getGameSlug } from '../utils';

const fmtCount = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

const BLACKLIST = ['munchkin', 'fluxx', 'cards against humanity'];
const MAX_OPTIONS = 8;

const SHOWCASE_GAMES = ['Catan', 'Wingspan', 'Ticket to Ride', 'Pandemic', 'Azul', 'Carcassonne', 'Gaia Project', 'Agricola'];

const GameSearch = (props) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState('Search games and scores...');
  const [bannerGame, setBannerGame] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [showcaseFading, setShowcaseFading] = useState(false);

  const inputRef = useRef(null);
  const animRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (props.games.length === 0) props.loadGames();
    if (!props.scoreStats) props.loadScoreStats();
  }, []);

  useEffect(() => {
    setShowBanner(false);
  }, [location]);

  // Animated placeholder count-up
  useEffect(() => {
    if (!props.scoreStats) return;
    const { totalScores, totalGames } = props.scoreStats;
    let start = null;
    const duration = 1800;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = easeOut(progress);
      const scores = Math.floor(eased * totalScores).toLocaleString();
      const games = Math.floor(eased * totalGames).toLocaleString();
      setPlaceholder(`Search ${games} games and ${scores} scores...`);
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [props.scoreStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowcaseFading(true);
      setTimeout(() => {
        setShowcaseIndex((i) => (i + 1) % SHOWCASE_GAMES.length);
        setShowcaseFading(false);
      }, 300);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = useCallback(() => {
    if (!inputValue.trim()) return [];
    const term = inputValue.toLowerCase();
    return props.games.filter((g) => g.name?.toLowerCase().includes(term)).slice(0, MAX_OPTIONS);
  }, [inputValue, props.games]);

  const options = filteredGames();
  const showDropdown = open && inputValue.trim().length > 0;
  const noResults = showDropdown && options.length === 0;

  const selectGame = (game) => {
    setInputValue('');
    setOpen(false);
    navigate(`/${game.id}/${getGameSlug(game)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setInputValue('');
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectGame(options[highlightIndex]);
    } else if (e.key === 'Tab' && options.length > 0) {
      e.preventDefault();
      selectGame(options[highlightIndex >= 0 ? highlightIndex : 0]);
    }
  };

  const handleSurprise = () => {
    if (props.games.length === 0) return;
    const game = props.games[Math.floor(Math.random() * props.games.length)];
    navigate(`/${game.id}/${getGameSlug(game)}`);
  };

  const handleAddClick = async () => {
    if (BLACKLIST.some((b) => inputValue.toLowerCase().includes(b))) {
      alert('Never in a million years.');
      return;
    }
    const term = inputValue.trim();
    setAdding(true);
    setAddError('');
    setInputValue('');
    setOpen(false);
    try {
      const res = await fetch('/api/add-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/${data.id}/${getGameSlug({ name: data.name })}`);
      } else {
        setAddError(data.error || 'Game not found on BoardGameGeek.');
      }
    } catch {
      setAddError('Network error — please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      {adding && (
        <div className="add-banner add-banner--loading">
          <div className="add-banner-spinner" />
          <div className="add-banner-text">
            <div className="add-banner-title">Looking up game on BoardGameGeek…</div>
            <div className="add-banner-body">This usually takes 5–30 seconds.</div>
          </div>
        </div>
      )}

      {addError && (
        <div className="add-banner add-banner--error">
          <div className="add-banner-text">
            <div className="add-banner-title">Couldn&apos;t add game</div>
            <div className="add-banner-body">{addError}</div>
          </div>
          <button className="add-banner-close" onClick={() => setAddError('')}>✕</button>
        </div>
      )}

      {showBanner && (
        <div className="add-banner">
          <div className="add-banner-text">
            <div className="add-banner-title">Adding &ldquo;{bannerGame}&rdquo;</div>
            <div className="add-banner-body">
              If this game exists on BoardGameGeek, we&apos;ll pull its scores, crunch some numbers,
              and make it searchable here. This usually takes a few minutes — check back soon.
            </div>
          </div>
          <button className="add-banner-close" onClick={() => setShowBanner(false)}>✕</button>
        </div>
      )}

      <div className="search-wrap">
        <div className="search-headline">
          How good are you at{' '}
          <span
            className={`search-headline-game${showcaseFading ? ' search-headline-game--fading' : ''}`}
            onClick={() => {
              const name = SHOWCASE_GAMES[showcaseIndex];
              const game = props.games.find((g) => g.name?.toLowerCase() === name.toLowerCase());
              if (game) navigate(`/${game.id}/${getGameSlug(game)}`);
            }}
          >
            {SHOWCASE_GAMES[showcaseIndex]}
          </span>
          ?
        </div>
        <div className="search-input-row">
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            autoComplete="off"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setHighlightIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
          />
          <button className="surprise-btn" onClick={handleSurprise} type="button" title="Surprise me">
            🎲
          </button>
        </div>

        <div className="search-subtitle">Search for a game, enter your score, see how you rank.</div>

        {showDropdown && (
          <div className="search-dropdown-paper">
            {options.map((game, i) => (
              <div
                key={game.id}
                className={`search-option${i === highlightIndex ? ' search-option--highlighted' : ''}`}
                onMouseDown={() => selectGame(game)}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <img
                  src={game.thumbnail}
                  alt=""
                  className="search-option-thumb"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="search-option-name">{game.name}</span>
                <span className="search-option-count">
                  {fmtCount(game.totalScores)} scores
                  {typeof game.mean === 'number' && <> · avg {Math.round(game.mean)}</>}
                </span>
              </div>
            ))}
            {noResults && (
              <div className="search-no-results">
                No results for &ldquo;{inputValue}&rdquo; —{' '}
                <span className="add-link" onMouseDown={handleAddClick}>Add this game?</span>
              </div>
            )}
            <div className="search-hint">Tip: you can also search by BGG game ID</div>
          </div>
        )}
      </div>
    </>
  );
};

GameSearch.propTypes = {
  games: PropTypes.array,
  scoreStats: PropTypes.object,
  loadGames: PropTypes.func,
  loadScoreStats: PropTypes.func,
};

const mapStateToProps = ({ data }) => ({
  games: data.games,
  scoreStats: data.scoreStats,
});

export default connect(mapStateToProps, actions)(GameSearch);

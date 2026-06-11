import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { signInWithPopup } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { auth, googleProvider, db } from '../firebase';
import PropTypes from 'prop-types';

const SaveScoreButton = ({ score, gameId, gameName, gameThumbnail, percentile, filters = {} }) => {
  const user = useSelector((state) => state.auth.user);
  const [status, setStatus] = useState('idle');

  const disabled = score === '' || score == null;

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v != null && v !== false)
  );

  const doSave = async (uid) => {
    await addDoc(collection(db, 'users', uid, 'scores'), {
      gameId,
      gameName,
      gameThumbnail: gameThumbnail || '',
      score: Number(score),
      percentile: percentile != null ? Math.round(percentile) : null,
      filters: Object.keys(activeFilters).length ? activeFilters : null,
      date: serverTimestamp(),
    });
  };

  const handleClick = async () => {
    if (disabled || status === 'saving') return;
    setStatus('saving');
    try {
      if (!user) {
        const result = await signInWithPopup(auth, googleProvider);
        await doSave(result.user.uid);
      } else {
        await doSave(user.uid);
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      const cancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request';
      if (cancelled) {
        setStatus('idle');
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  const content =
    status === 'saved' ? '✓' :
    status === 'saving' ? '…' :
    status === 'error' ? '!' :
    <SaveOutlinedIcon sx={{ fontSize: 18 }} />;

  const title =
    status === 'error' ? 'Save failed — try again' :
    !user && !disabled ? 'Sign in with Google to save score' :
    !disabled ? 'Save score' :
    undefined;

  return (
    <button
      className={[
        'rv-save-btn',
        disabled ? 'rv-save-btn--disabled' : '',
        status === 'saved' ? 'rv-save-btn--saved' : '',
        status === 'error' ? 'rv-save-btn--error' : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      disabled={disabled || status === 'saving'}
      title={title}
    >
      {content}
    </button>
  );
};

SaveScoreButton.propTypes = {
  score: PropTypes.any,
  gameId: PropTypes.string.isRequired,
  gameName: PropTypes.string.isRequired,
  gameThumbnail: PropTypes.string,
  percentile: PropTypes.number,
  filters: PropTypes.object,
};

export default SaveScoreButton;

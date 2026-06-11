import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const useUserScores = (gameId) => {
  const user = useSelector((state) => state.auth.user);
  const [userScores, setUserScores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !gameId) { setUserScores([]); return; }
    setLoading(true);
    const q = query(
      collection(db, 'users', user.uid, 'scores'),
      where('gameId', '==', gameId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));
        setUserScores(docs);
        setLoading(false);
      },
      () => { setLoading(false); }
    );
    return unsub;
  }, [user?.uid, gameId]);

  return { userScores, loading };
};

export default useUserScores;

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
// import { getPerformance } from 'firebase/performance';

const firebaseConfig = {
  apiKey: 'AIzaSyAYdGDedLLPfXINfadAJiALOrmZLRaToH8',
  authDomain: 'bgpeen-1fc16.firebaseapp.com',
  projectId: 'bgpeen-1fc16',
  storageBucket: 'bgpeen-1fc16.appspot.com',
  messagingSenderId: '730875464009',
  appId: '1:730875464009:web:32742d8a37ed4e84',
  measurementId: 'G-D31H7RXK79',
};

const firebaseApp = initializeApp(firebaseConfig);

try {
  getAnalytics(firebaseApp);
} catch (e) {
  // Analytics may fail in development or unsupported environments
}
// const perf = getPerformance(firebaseApp);

const isLocalhost = window.location.hostname === 'localhost';

export const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
  ...(isLocalhost ? {} : { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }),
});

if (isLocalhost) {
  connectFirestoreEmulator(db, 'localhost', 5002);
}

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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

getAnalytics(firebaseApp);
// const perf = getPerformance(firebaseApp);
export const db = getFirestore(firebaseApp);

if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 5002);
}

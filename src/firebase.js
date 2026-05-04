import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';
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

// App Check — protects the add-game endpoint from abuse
// To set up: add VITE_RECAPTCHA_SITE_KEY to .env.local, enable App Check in
// Firebase Console, and register the debug token printed to the console here.
let _appCheck = null;
try {
  if (isLocalhost && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN)
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  _appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''),
    isTokenAutoRefreshEnabled: true,
  });
} catch {
  // App Check not configured (missing VITE_RECAPTCHA_SITE_KEY)
}

export const getAppCheckToken = async () => {
  if (!_appCheck) return null;
  try {
    return (await getToken(_appCheck)).token;
  } catch {
    return null;
  }
};

export const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
  ...(isLocalhost ? {} : { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }),
});

if (isLocalhost) {
  connectFirestoreEmulator(db, 'localhost', 5002);
}

import firebase from 'firebase/app';
import 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAYdGDedLLPfXINfadAJiALOrmZLRaToH8",
  authDomain: "bgpeen-1fc16.firebaseapp.com",
  projectId: "bgpeen-1fc16",
  storageBucket: "bgpeen-1fc16.appspot.com",
  messagingSenderId: "730875464009",
  appId: "1:730875464009:web:32742d8a37ed4e84",
  measurementId: "G-D31H7RXK79"
}

export const fire = firebase.initializeApp(firebaseConfig);
fire.analytics();
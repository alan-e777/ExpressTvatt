import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: 'amostailor-c759c.firebasestorage.app',
  messagingSenderId: '243897430746',
  appId: '1:243897430746:web:51bc913416dc8e1b3cabe3',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// React Native has no IndexedDB, so the web-only persistentLocalCache /
// persistentMultipleTabManager combo (previously used here) can leave Firestore
// unable to reach its backend ("could not fetch"). On RN we force long-polling —
// the WebChannel streaming transport is unreliable on the Hermes/RN networking
// stack — and use the default in-memory cache.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const realtimeDb = getDatabase(app);

export default app;

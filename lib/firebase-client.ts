import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCbk33Wq93lp0IFZLXGenji7Dyw2Gpb3LE",
  authDomain: "amostailor-c759c.firebaseapp.com",
  databaseURL: "https://amostailor-c759c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "amostailor-c759c",
  storageBucket: "amostailor-c759c.firebasestorage.app",
  messagingSenderId: "243897430746",
  appId: "1:243897430746:web:51bc913416dc8e1b3cabe3",
  measurementId: "G-LKMPBQH0XB",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);

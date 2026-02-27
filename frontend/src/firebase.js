import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAcneguUYhR0b-tKHd5gB4D9sMx5HTafJk",
  authDomain: "snip-music.firebaseapp.com",
  projectId: "snip-music",
  storageBucket: "snip-music.firebasestorage.app",
  messagingSenderId: "1056090308533",
  appId: "1:1056090308533:web:c41081898b2f0560b623fc",
  measurementId: "G-JKL3CPZ0C4",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

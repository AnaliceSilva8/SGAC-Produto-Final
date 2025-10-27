// frontend/src/firebase-config/config.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBUAFGxdPW6Or6R4HIeH1xLxpM5GHT4dKE",
  authDomain: "sgac-projetofinal.firebaseapp.com",
  projectId: "sgac-projetofinal",
  // --- ESTA LINHA FOI CORRIGIDA ---
  storageBucket: "sgac-projetofinal.firebasestorage.app", 
  messagingSenderId: "892463668104",
  appId: "1:892463668104:web:e7aa2111599cca2bae383d",
  measurementId: "G-F254JR4C0X"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
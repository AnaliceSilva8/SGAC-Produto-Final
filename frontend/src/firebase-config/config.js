// frontend/src/firebase-config/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 1. IMPORTA O STORAGE

const firebaseConfig = {
  // ...suas credenciais aqui...
  apiKey: "AIzaSyDaWe22c51Yo-V_XoLVJjaVRXDmvHopHsA",
  authDomain: "sgac-552b8.firebaseapp.com",
  projectId: "sgac-552b8",
  storageBucket: "sgac-552b8.appspot.com",
  messagingSenderId: "839402485526",
  appId: "1:839402485526:web:05a1ef61325284bafa4237",
  measurementId: "G-1G4Y289PTP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // 2. EXPORTA A INSTÂNCIA DO STORAGE
// frontend/src/firebase-config/config.js

// 1. Importações necessárias para os serviços do Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 2. A sua configuração do Firebase com o storageBucket CORRIGIDO
const firebaseConfig = {
  apiKey: "AIzaSyBUAFGxdPW6Or6R4HIeH1xLxpM5GHT4dKE",
  authDomain: "sgac-projetofinal.firebaseapp.com",
  projectId: "sgac-projetofinal",
  // AQUI ESTÁ A CORREÇÃO:
  storageBucket: "sgac-projetofinal.firebasestorage.app", 
  messagingSenderId: "892463668104",
  appId: "1:892463668104:web:e7aa2111599cca2bae383d",
  measurementId: "G-F254JR4C0X"
};

// 3. Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// 4. Exporta as instâncias dos serviços para o resto do seu aplicativo usar
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

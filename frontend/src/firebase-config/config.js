// frontend/src/firebase-config/config.js

// 1. Importações necessárias, incluindo getFunctions
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions"; // <<< PRECISA ESTAR AQUI

// 2. A sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBUAFGxdPW6Or6R4HIeH1xLxpM5GHT4dKE", // Considere usar variáveis de ambiente
  authDomain: "sgac-projetofinal.firebaseapp.com",
  projectId: "sgac-projetofinal",
  storageBucket: "sgac-projetofinal.appspot.com", // Formato padrão
  messagingSenderId: "892463668104",
  appId: "1:892463668104:web:e7aa2111599cca2bae383d",
  measurementId: "G-F254JR4C0X"
};

// 3. Inicializa o Firebase UMA VEZ
const app = initializeApp(firebaseConfig);

// 4. Exporta TODAS as instâncias dos serviços a partir da mesma 'app'
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
// <<< INICIALIZA E EXPORTA O FUNCTIONS CORRETAMENTE >>>
export const functions = getFunctions(app, 'us-central1'); // Especifique a região!
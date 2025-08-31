import { db } from '../firebase-config/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logHistoryEvent = async (clientId, acao, responsavel) => {
  if (!clientId || !acao || !responsavel) {
    console.error("Dados insuficientes para registrar no histórico.");
    return;
  }
  try {
    const historicoCollectionRef = collection(db, 'historicoCliente');
    await addDoc(historicoCollectionRef, {
      clientId,
      acao,
      responsavel,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao registrar evento no histórico: ", error);
  }
};
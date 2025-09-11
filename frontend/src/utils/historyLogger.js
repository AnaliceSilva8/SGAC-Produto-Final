import { db } from '../firebase-config/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Registra um evento no histórico de um cliente específico.
 * * @param {string} clientId - O ID do cliente para associar o evento.
 * @param {string} acao - A descrição da ação realizada (ex: "Dados Editados").
 * @param {string} responsavel - O nome ou email do usuário que realizou a ação.
 */
export const logHistoryEvent = async (clientId, acao, responsavel) => {
  if (!clientId || !acao || !responsavel) {
    console.error("Dados insuficientes para registrar no histórico.");
    return;
  }

  try {
    const historicoCollectionRef = collection(db, 'historicoCliente');
    await addDoc(historicoCollectionRef, {
      // AQUI ESTÁ A CORREÇÃO:
      // Agora estamos salvando o ID do cliente junto com o evento.
      clientId: clientId, 
      acao: acao,
      responsavel: responsavel,
      timestamp: serverTimestamp() // Usa o timestamp do servidor para consistência
    });
  } catch (error) {
    console.error("Erro ao registrar evento no histórico: ", error);
  }
};

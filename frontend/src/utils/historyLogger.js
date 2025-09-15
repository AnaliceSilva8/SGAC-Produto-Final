import { db } from '../firebase-config/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Registra um evento no histórico de um cliente específico.
 * * @param {string} clientId - O ID do documento do cliente.
 * @param {string} event - A descrição do evento que ocorreu.
 * @param {string} responsible - O nome do usuário responsável pela ação.
 */
export const logHistoryEvent = async (clientId, event, responsible) => {
  // Se o ID do cliente não for fornecido, não continue.
  if (!clientId) {
    console.error("Erro de log: O ID do cliente é necessário para registrar o histórico.");
    return;
  }

  try {
    // --- CORREÇÃO PRINCIPAL AQUI ---
    // Crie uma referência para a subcoleção 'historico' DENTRO do cliente.
    const historyCollectionRef = collection(db, 'clientes', clientId, 'historico');

    // Adicione o novo documento de log a essa subcoleção.
    await addDoc(historyCollectionRef, {
      evento: event,
      responsavel: responsible,
      timestamp: serverTimestamp(),
    });

  } catch (error) {
    // A mensagem de erro agora será mais específica no console.
    console.error("Erro ao registrar evento no histórico: ", error);
  }
};
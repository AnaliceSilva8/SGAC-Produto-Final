import React, { useState, useEffect, useCallback } from 'react';
// Alterado para um caminho relativo para garantir a localização do arquivo
import { db } from '../../firebase-config/config'; 
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
// Verifique se o nome deste arquivo CSS no seu projeto é exatamente igual
import './HistoricoCompletoTab.css';

const HistoricoCompletoTab = ({ client }) => {
  const [historico, setHistorico] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistorico = useCallback(async () => {
    if (!client || !client.id) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
      const historicoCollectionRef = collection(db, 'historicoCliente');
      const q = query(
        historicoCollectionRef,
        where('clientId', '==', client.id),
        orderBy('timestamp', 'desc')
      );
      
      const data = await getDocs(q);
      const historicoData = data.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          timestamp: docData.timestamp ? docData.timestamp.toDate() : new Date(),
        };
      });
      setHistorico(historicoData);
    } catch (error) {
      console.error("Erro ao buscar histórico: ", error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  if (isLoading) {
    return <div className="historico-container"><p>Carregando histórico...</p></div>;
  }

  return (
    <div className="historico-container">
      <h3>Histórico de Atividades</h3>
      {historico.length === 0 ? (
        <p>Nenhuma atividade registrada para este cliente.</p>
      ) : (
        <div className="timeline">
          {historico.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-action">{item.acao}</span>
                  <span className="timeline-date">
                    {item.timestamp.toLocaleDateString('pt-BR')} às {item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="timeline-responsible">
                  Responsável: <strong>{item.responsavel}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoricoCompletoTab;
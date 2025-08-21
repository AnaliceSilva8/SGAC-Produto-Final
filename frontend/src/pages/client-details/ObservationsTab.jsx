import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase-config/config';
import { collection, addDoc, query, getDocs, getDoc, serverTimestamp, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import './ObservationsTab.css';

// Lista de sugestões de texto
const suggestions = [
  'Liguei para o cliente e pedi os seguintes documentos:',
  'Atendi o cliente hoje no escritório.',
  'Recebi do cliente os documentos:',
  'Devolvi ao cliente os documentos:',
  'Cliente agendou consulta para:',
];

function ObservationsTab({ client }) {
  const [user] = useAuthState(auth);
  const [observationText, setObservationText] = useState('');
  const [observations, setObservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [selectedObservations, setSelectedObservations] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      }
    };
    fetchUserInfo();
  }, [user]);

  const fetchObservations = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, `clientes/${client.id}/observacoes`), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const obsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setObservations(obsList);
    } catch (error) {
      console.error("Erro ao buscar observações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (client.id) {
      fetchObservations();
    }
  }, [client.id]);

  const handleAddObservation = async () => {
    if (!observationText.trim() || !userInfo) return;
    try {
      const responsibleName = `${userInfo.cargo.toUpperCase()}: ${userInfo.nome.toUpperCase()}`;
      await addDoc(collection(db, `clientes/${client.id}/observacoes`), {
        descricao: observationText,
        responsavel: responsibleName,
        timestamp: serverTimestamp(),
        userId: user.uid,
      });
      setObservationText('');
      fetchObservations();
    } catch (error) {
      console.error("Erro ao adicionar observação:", error);
    }
  };
  
  const handleSelectObservation = (id) => {
    setSelectedObservations(prev =>
      prev.includes(id) ? prev.filter(obsId => obsId !== id) : [...prev, id]
    );
  };

  const handleDeleteObservations = async () => {
    try {
      for (const obsId of selectedObservations) {
        await deleteDoc(doc(db, `clientes/${client.id}/observacoes`, obsId));
      }
      setSelectedObservations([]);
      fetchObservations();
    } catch (error) {
      console.error("Erro ao excluir observações:", error);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  // Função para adicionar a sugestão ao texto
  const handleSuggestionClick = (suggestion) => {
    // Adiciona a sugestão ao texto existente, com um espaço se já houver texto
    setObservationText(prevText => prevText ? `${prevText.trim()} ${suggestion}` : suggestion);
  };

  return (
    <div className="observations-tab-container">
      <div className="add-observation-section">
        <h3 className="client-name-header">{client.NOMECLIENTE}</h3>
        
        {/* Container para o campo de texto e as sugestões */}
        <div className="add-observation-content">
          <textarea
            value={observationText}
            onChange={(e) => setObservationText(e.target.value)}
            placeholder="Digite aqui sua observação..."
            className="observation-textarea"
          />
          <div className="suggestions-list">
            {suggestions.map((text, index) => (
              <button key={index} onClick={() => handleSuggestionClick(text)} className="suggestion-item">
                + {text}
              </button>
            ))}
          </div>
        </div>

        <div className="observation-buttons">
          <button onClick={handleAddObservation} className="btn-add-observation">Adicionar observação</button>
          <button onClick={() => setObservationText('')} className="btn-cancel-observation">Cancelar</button>
        </div>
      </div>

      <div className="history-section">
        {/* O histórico de observações permanece o mesmo */}
        <h4>Histórico de observações</h4>
        <div className="observations-grid">
          <div className="observation-header select-header"></div>
          <div className="observation-header">Data</div>
          <div className="observation-header">Horário</div>
          <div className="observation-header">Descrição</div>
          <div className="observation-header observation-responsible-header">Responsável</div>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>Carregando histórico...</div>
          ) : (
            observations.map(obs => (
              <React.Fragment key={obs.id}>
                <div className="observation-cell cell-select">
                  <input
                    type="checkbox"
                    className="observation-checkbox"
                    checked={selectedObservations.includes(obs.id)}
                    onChange={() => handleSelectObservation(obs.id)}
                  />
                </div>
                <div className="observation-cell">{obs.timestamp?.toLocaleDateString('pt-BR')}</div>
                <div className="observation-cell">{obs.timestamp?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="observation-cell">{obs.descricao}</div>
                <div className="observation-cell observation-responsible-cell">{obs.responsavel}</div>
              </React.Fragment>
            ))
          )}
        </div>
        {selectedObservations.length > 0 && (
          <button onClick={() => setIsDeleteModalOpen(true)} className="btn-delete-observation">
            Excluir Observação
          </button>
        )}
      </div>

      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          onConfirm={handleDeleteObservations}
          onCancel={() => setIsDeleteModalOpen(false)}
          title="Confirmar Exclusão"
          warningText="Esta ação não pode ser desfeita."
          checkboxLabel="Sim, eu entendo e quero excluir a(s) observação(ões)."
          confirmButtonText="Excluir"
        >
          Você tem certeza que deseja excluir permanentemente a(s) <strong>{selectedObservations.length}</strong> observação(ões) selecionada(s)?
        </DeleteConfirmationModal>
      )}
    </div>
  );
}

export default ObservationsTab;
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase-config/config';
// Import 'doc' para criar a referência da subcoleção
import { collection, addDoc, query, getDoc, serverTimestamp, orderBy, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Swal from 'sweetalert2';
import './ObservationsTab.css';
import { logHistoryEvent } from '../../utils/historyLogger';
import { useUserRole } from '../../hooks/useUserRole';

// --- DEFINIÇÃO DO TOAST ---
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

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
  const { role } = useUserRole();

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

  useEffect(() => {
    if (!client?.id) {
        setObservations([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const observationsRef = collection(db, 'clientes', client.id, 'observacoes');
    const q = query(observationsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const obsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
        }));
        setObservations(obsList);
        setIsLoading(false);
    }, (error) => {
        console.error("Erro ao ouvir observações:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();

  }, [client]);

  const handleAddObservation = async () => {
    if (!observationText.trim() || !userInfo || !client?.id) {
        Toast.fire({
          icon: 'warning', 
          title: 'Digite uma observação para salvar.'
        });
        return;
    }

    try {
      const responsibleName = `${userInfo.cargo.toUpperCase()}: ${userInfo.nome.toUpperCase()}`;
      
      const observationsRef = collection(db, 'clientes', client.id, 'observacoes');
      
      await addDoc(observationsRef, {
        descricao: observationText,
        responsavel: responsibleName,
        timestamp: serverTimestamp(),
        userId: user.uid,
      });
      
      const responsavelLog = userInfo.nome || user.email;
      await logHistoryEvent(client.id, `Adicionou a observação: "${observationText}"`, responsavelLog);

      setObservationText('');
      
      Toast.fire({
        icon: 'success', 
        title: 'Observação adicionada!'
      });

    } catch (error) {
      console.error("Erro ao adicionar observação:", error);
      Toast.fire({ icon: 'error', title: 'Não foi possível salvar a observação.' });
    }
  };
  
  const handleDeleteObservations = async () => {
    if (!client?.id) return;
    try {
      const deletePromises = selectedObservations.map(obsId => 
        deleteDoc(doc(db, 'clientes', client.id, 'observacoes', obsId))
      );
      await Promise.all(deletePromises);
      
      const responsavelLog = userInfo.nome || user.email;
      await logHistoryEvent(client.id, `Excluiu ${selectedObservations.length} observação(ões)`, responsavelLog);

      Toast.fire({
        icon: 'success',
        title: `A(s) ${selectedObservations.length} observação(ões) foram excluídas.`
      });
      setSelectedObservations([]);

    } catch (error) {
      console.error("Erro ao excluir observações:", error);
      Toast.fire({ icon: 'error', title: 'Falha ao excluir a(s) observação(ões).' });
    }
  };

  const handleSelectObservation = (id) => {
    setSelectedObservations(prev =>
      prev.includes(id) ? prev.filter(obsId => obsId !== id) : [...prev, id]
    );
  };

  // Esta é a confirmação de exclusão (DEVE ser um modal)
  const confirmDelete = () => {
    Swal.fire({
      title: `Excluir ${selectedObservations.length} observação(ões)?`,
      text: "Esta ação não pode ser desfeita!", icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) handleDeleteObservations();
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setObservationText(prevText => prevText ? `${prevText.trim()} ${suggestion}` : suggestion);
  };

  return (
    <div className="observations-tab-container">
      <div className="add-observation-section">
        <h3 className="client-name-header">{client.NOMECLIENTE}</h3>
        <div className="add-observation-content">
          <textarea value={observationText} onChange={(e) => setObservationText(e.target.value)}
            placeholder="Digite aqui sua observação..." className="observation-textarea"/>
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
        <h4>Histórico de observações</h4>
        {/* --- ALTERAÇÃO: Adiciona classe condicional ao grid --- */}
        <div className={`observations-grid ${role !== 'admin' ? 'non-admin' : ''}`}>
          
          {/* --- ALTERAÇÃO: Cabeçalho do checkbox condicional --- */}
          {role === 'admin' && (
            <div className="observation-header select-header"></div>
          )}

          <div className="observation-header">Data</div>
          <div className="observation-header">Horário</div>
          <div className="observation-header">Descrição</div>
          <div className="observation-header observation-responsible-header">Responsável</div>
          
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>Carregando...</div>
          ) : (
            observations.map(obs => (
              <React.Fragment key={obs.id}>
                
                {/* --- ALTERAÇÃO: Célula do checkbox condicional --- */}
                {role === 'admin' && (
                  <div className="observation-cell cell-select">
                    <input type="checkbox" className="observation-checkbox"
                      checked={selectedObservations.includes(obs.id)}
                      onChange={() => handleSelectObservation(obs.id)} />
                  </div>
                )}
                
                <div className="observation-cell">{obs.timestamp?.toLocaleDateString('pt-BR')}</div>
                <div className="observation-cell">{obs.timestamp?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="observation-cell">{obs.descricao}</div>
                <div className="observation-cell observation-responsible-cell">{obs.responsavel}</div>
              </React.Fragment>
            ))
          )}
        </div>
        
        {/* --- ALTERAÇÃO: Botão de excluir condicional --- */}
        {role === 'admin' && selectedObservations.length > 0 && (
          <button onClick={confirmDelete} className="btn-delete-observation">
            Excluir Observação
          </button>
        )}
      </div>
    </div>
  );
}

export default ObservationsTab;
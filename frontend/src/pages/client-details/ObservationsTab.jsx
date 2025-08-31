import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase-config/config';
import { collection, addDoc, query, getDoc, serverTimestamp, orderBy, doc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Swal from 'sweetalert2';
import './ObservationsTab.css';
import { logHistoryEvent } from '../../utils/historyLogger';

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

  // EFEITO CORRIGIDO: Agora usa onSnapshot para atualizações em tempo real
  useEffect(() => {
    if (!client?.id) {
        setObservations([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const q = query(
        collection(db, 'observacoes'),
        where("clientId", "==", client.id),
        orderBy('timestamp', 'desc')
    );

    // A função onSnapshot "ouve" as mudanças no banco de dados
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

    // Função de limpeza: para de "ouvir" quando o componente é desmontado
    return () => unsubscribe();

  }, [client]); // Dependência: refaz a "escuta" se o cliente mudar

  const handleAddObservation = async () => {
    if (!observationText.trim() || !userInfo) {
        Swal.fire('Atenção!', 'Digite uma observação e certifique-se de estar logado.', 'warning');
        return;
    }

    try {
      const responsibleName = `${userInfo.cargo.toUpperCase()}: ${userInfo.nome.toUpperCase()}`;
      // A lógica de adicionar continua a mesma
      await addDoc(collection(db, 'observacoes'), {
        clientId: client.id,
        descricao: observationText,
        responsavel: responsibleName,
        timestamp: serverTimestamp(),
        userId: user.uid,
      });
      
      const responsavelLog = userInfo.nome || user.email;
      await logHistoryEvent(client.id, `Adicionou a observação: "${observationText}"`, responsavelLog);

      setObservationText('');
      // NÃO PRECISA MAIS CHAMAR fetchObservations() AQUI, a atualização é automática

      Swal.fire({
        icon: 'success', title: 'Observação adicionada!', toast: true,
        position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
      });

    } catch (error) {
      console.error("Erro ao adicionar observação:", error);
      Swal.fire('Erro!', 'Não foi possível salvar a observação.', 'error');
    }
  };
  
  const handleSelectObservation = (id) => {
    setSelectedObservations(prev =>
      prev.includes(id) ? prev.filter(obsId => obsId !== id) : [...prev, id]
    );
  };

  const handleDeleteObservations = async () => {
    try {
      const deletePromises = selectedObservations.map(obsId => 
        deleteDoc(doc(db, 'observacoes', obsId))
      );
      await Promise.all(deletePromises);
      
      const responsavelLog = userInfo.nome || user.email;
      await logHistoryEvent(client.id, `Excluiu ${selectedObservations.length} observação(ões)`, responsavelLog);

      // A lista vai se atualizar sozinha, mas o Swal e a limpeza do state são necessários
      Swal.fire('Excluído!', `A(s) ${selectedObservations.length} observação(ões) foram excluídas.`, 'success');
      setSelectedObservations([]);

    } catch (error)      {
      console.error("Erro ao excluir observações:", error);
      Swal.fire('Erro!', 'Falha ao excluir a(s) observação(ões).', 'error');
    }
  };

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
        <div className="observations-grid">
          <div className="observation-header select-header"></div>
          <div className="observation-header">Data</div>
          <div className="observation-header">Horário</div>
          <div className="observation-header">Descrição</div>
          <div className="observation-header observation-responsible-header">Responsável</div>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>Carregando...</div>
          ) : (
            observations.map(obs => (
              <React.Fragment key={obs.id}>
                <div className="observation-cell cell-select">
                  <input type="checkbox" className="observation-checkbox"
                    checked={selectedObservations.includes(obs.id)}
                    onChange={() => handleSelectObservation(obs.id)} />
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
          <button onClick={confirmDelete} className="btn-delete-observation">
            Excluir Observação
          </button>
        )}
      </div>
    </div>
  );
}

export default ObservationsTab;
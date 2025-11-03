import React, { useState, useEffect, useRef, useContext } from 'react'; // --- ALTERAÇÃO: Adicionado 'useContext' e 'useEffect' ---
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase-config/config';
import { collection, getDocs, query, where } from "firebase/firestore"; 
import './DashboardPage.css';
import AddClientModal from '../add-client/AddClientModal';
// --- ALTERAÇÃO 1: Importar o Contexto de Ajuda ---
import { useHelp } from '../../contexto/HelpContext';
// --- FIM DA ALTERAÇÃO ---

const formatDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return 'N/A';
  const parts = dateString.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]
}/${parts[0]}`;
  return dateString;
};

function DashboardPage() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  // Estados dos cards do rodapé
  const [newClientsCount, setNewClientsCount] = useState(0);
  const [activeProcessCount, setActiveProcessCount] = useState(0); 

  const selectedLocation = localStorage.getItem('selectedLocation');

  // --- ALTERAÇÃO 2: Adicionar este bloco ---
  const { setHelpContent } = useHelp();

  useEffect(() => {
      const helpText = `
          <h2>Ajuda: Dashboard (Início)</h2>
          <p>Esta é a sua tela principal, onde você pode ver e acessar rapidamente todos os seus clientes.</p>
          <ul>
              <li><strong>Barra de Busca:</strong> Permite filtrar clientes por nome, CPF ou data de nascimento.</li>
              <li><strong>+ Adicionar Cliente:</strong> Abre o formulário para cadastrar um novo cliente no sistema.</li>
              <li><strong>Lista de Clientes:</strong> Exibe os clientes cadastrados. Clicar no nome de um cliente leva à sua ficha detalhada.</li>
              <li><strong>Visualizar Processos:</strong> Atalho para ver a aba de processos daquele cliente.</li>
              <li><strong>Cards no Rodapé:</strong> Mostram um resumo rápido do total de clientes, novos clientes (cadastrados nos últimos 7 dias) e processos em andamento.</li>
          </ul>
      `;
      setHelpContent(helpText);

      // Limpa o conteúdo quando o usuário sair desta página
      return () => setHelpContent(null);
  }, [setHelpContent]);
  // --- FIM DA ALTERAÇÃO ---

  const fetchClients = async () => {
    if (!selectedLocation) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      const clientsCollection = collection(db, "clientes");
      
      const q = query(
        clientsCollection, 
        where("LOCATION", "==", selectedLocation)
      );

      const data = await getDocs(q);
      const clientList = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      clientList.sort((a, b) => {
        if (a.NOMECLIENTE < b.NOMECLIENTE) return -1;
        if (a.NOMECLIENTE > b.NOMECLIENTE) return 1;
        return 0;
      });

      setClients(clientList);

    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      alert("Não foi possível carregar os clientes. Verifique sua conexão ou contate o suporte.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [selectedLocation, navigate]);

  // Lógica para CLIENTES NOVOS
  useEffect(() => {
    if (clients.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const newClients = clients.filter(client => {
        if (client.DATAADC && typeof client.DATAADC.toDate === 'function') {
          const clientAddedDate = client.DATAADC.toDate();
          return clientAddedDate >= sevenDaysAgo;
        }
        return false;
      });

      setNewClientsCount(newClients.length);
    }
  }, [clients]);

  // Lógica para PROCESSOS EM ANDAMENTO
  useEffect(() => {
    const fetchProcessCounts = async () => {
      if (clients.length === 0) {
        return; 
      }
      const activeStatuses = ['Ativo', 'Em análise', 'Aguardando Documentos'];
      const promises = clients.map(client => {
        const processosRef = collection(db, 'clientes', client.id, 'processos');
        const q = query(processosRef, where('STATUS', 'in', activeStatuses));
        return getDocs(q); 
      });
      const querySnapshots = await Promise.all(promises);
      let totalCount = 0;
      querySnapshots.forEach(snapshot => {
        totalCount += snapshot.size; 
      });
      setActiveProcessCount(totalCount);
    };
    fetchProcessCounts();
  }, [clients]); 

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase().trim();
    const name = (client.NOMECLIENTE || '').toLowerCase().trim();
    const cpf = (client.CPF || '').replace(/[^\d]/g, '');
    const birthDate = formatDate(client.DATANASCIMENTO);
    const searchNumbers = search.replace(/[^\d]/g, '');
    return name.includes(search) || (searchNumbers.length > 0 && cpf.includes(searchNumbers)) || birthDate.includes(search);
  });

  return (
    <>
      <div className="toolbar">
        <div className="search-bar">
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Busque por nome, CPF ou data de nascimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
        </div>
        <button className="add-client-btn" onClick={() => setIsModalOpen(true)}>
          + Adicionar cliente
        </button>
      </div>

      <div className="client-list-container">
        {isLoading ? <p>Carregando clientes de {selectedLocation}...</p> : (
          
          <>
            <div className="client-list-header">
              <span>NOME</span>
              <span>CPF</span>
              <span>DATA DE NASCIMENTO</span>
              <span className="header-actions-cell">AÇÕES</span>
            </div>
            
            <ul className="client-list">
              {filteredClients.map(client => (
                <li key={client.id} className="client-list-item">
                  <Link to={`/cliente/${client.id}`} className="client-name-link">
                    {client.NOMECLIENTE || 'N/A'}
                  </Link>
                  <span>{client.CPF || 'N/A'}</span>
                  <span>{formatDate(client.DATANASCIMENTO)}</span>
                  
                  <Link 
                    to={`/cliente/${client.id}`} 
                    state={{ defaultTab: 'processos' }} 
                    className="view-process-btn"
                  >
                    Visualizar Processos
                  </Link>
                  
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      
      <footer className="dashboard-footer">
        <div className="summary-card">
          <h4>TOTAL DE CLIENTES ({selectedLocation})</h4>
          <p>{clients.length}</p>
        </div>
        <div className="summary-card">
          <h4>CLIENTES NOVOS</h4><p>{newClientsCount}</p>
        </div>
        <div className="summary-card">
          <h4>PROCESSOS EM ANDAMENTO</h4><p>{activeProcessCount}</p>
        </div>
      </footer>

      {isModalOpen && (
        <AddClientModal
          onClose={handleCloseModal}
          onClientAdded={fetchClients}
        />
      )}
    </>
  );
}

export default DashboardPage;
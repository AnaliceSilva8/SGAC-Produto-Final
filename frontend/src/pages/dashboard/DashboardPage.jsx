import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase-config/config';
import { collection, getDocs, query, where } from "firebase/firestore"; // Removido o 'orderBy' daqui
import './DashboardPage.css';
import AddClientModal from '../add-client/AddClientModal';

const formatDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return 'N/A';
  const parts = dateString.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateString;
};

function DashboardPage() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const selectedLocation = localStorage.getItem('selectedLocation');

  const fetchClients = async () => {
    if (!selectedLocation) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      const clientsCollection = collection(db, "clientes");
      
      // 1. A CONSULTA AGORA APENAS FILTRA, SEM ORDENAR
      const q = query(
        clientsCollection, 
        where("LOCATION", "==", selectedLocation)
      );

      const data = await getDocs(q);
      const clientList = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // 2. A ORDENAÇÃO É FEITA AQUI, NO CÓDIGO
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

  // O restante do seu componente (o JSX) continua o mesmo
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
          <ul className="client-list">
            {filteredClients.map(client => (
              <li key={client.id} className="client-list-item">
                <Link to={`/cliente/${client.id}`} className="client-name-link">
                  {client.NOMECLIENTE || 'N/A'}
                </Link>
                <span>{client.CPF || 'N/A'}</span>
                <span>{formatDate(client.DATANASCIMENTO)}</span>
                <button className="view-process-btn">Visualizar Processos</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <footer className="dashboard-footer">
        <div className="summary-card">
          <h4>TOTAL DE CLIENTES ({selectedLocation})</h4>
          <p>{clients.length}</p>
        </div>
        <div className="summary-card">
          <h4>CLIENTES NOVOS</h4><p>0</p>
        </div>
        <div className="summary-card">
          <h4>PROCESSOS EM ANDAMENTO</h4><p>0</p>
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
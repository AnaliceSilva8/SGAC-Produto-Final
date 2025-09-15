import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase-config/config';
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
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
    
    // Estados para os novos contadores
    const [newClientsCount, setNewClientsCount] = useState(0);
    const [ongoingProcessesCount, setOngoingProcessesCount] = useState(0);

    const navigate = useNavigate();
    const searchInputRef = useRef(null);

    const selectedLocation = localStorage.getItem('selectedLocation');

    // Função para calcular clientes novos e processos em andamento
    const calculateDashboardMetrics = async (clientList) => {
        // 1. Calcular Clientes Novos (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newClients = clientList.filter(client => {
            if (!client.DATAADC) return false;
            // Suporta tanto Timestamps do Firestore quanto strings 'AAAA-MM-DD'
            const clientDate = client.DATAADC.toDate ? client.DATAADC.toDate() : new Date(client.DATAADC);
            return clientDate >= thirtyDaysAgo;
        });
        setNewClientsCount(newClients.length);

        // 2. Calcular Processos em Andamento
        let totalOngoing = 0;
        const processPromises = clientList.map(async (client) => {
            const processesCollection = collection(db, "clientes", client.id, "processos");
            const q = query(processesCollection, 
                where("STATUS", "not-in", ["Finalizado com Êxito", "Finalizado sem Êxito"])
            );
            const processesSnapshot = await getDocs(q);
            return processesSnapshot.size; // .size é mais eficiente que .docs.length
        });
        
        const ongoingCounts = await Promise.all(processPromises);
        totalOngoing = ongoingCounts.reduce((sum, count) => sum + count, 0);
        setOngoingProcessesCount(totalOngoing);
    };

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

            clientList.sort((a, b) => a.NOMECLIENTE.localeCompare(b.NOMECLIENTE));

            setClients(clientList);
            // Chama a função para calcular as métricas após buscar os clientes
            await calculateDashboardMetrics(clientList);

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
    
    // Função para navegar para a aba de processos do cliente
    const handleViewProcess = (clientId) => {
        navigate(`/cliente/${clientId}?tab=processos`);
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
                    <ul className="client-list">
                        {filteredClients.map(client => (
                            <li key={client.id} className="client-list-item">
                                <Link to={`/cliente/${client.id}`} className="client-name-link">
                                    {client.NOMECLIENTE || 'N/A'}
                                </Link>
                                <span>{client.CPF || 'N/A'}</span>
                                <span>{formatDate(client.DATANASCIMENTO)}</span>
                                {/* Botão atualizado para chamar a nova função */}
                                <button 
                                    className="view-process-btn" 
                                    onClick={() => handleViewProcess(client.id)}
                                >
                                    Visualizar Processos
                                </button>
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
                    <h4>CLIENTES NOVOS</h4>
                    {/* Exibe o novo estado */}
                    <p>{newClientsCount}</p>
                </div>
                <div className="summary-card">
                    <h4>PROCESSOS EM ANDAMENTO</h4>
                    {/* Exibe o novo estado */}
                    <p>{ongoingProcessesCount}</p>
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
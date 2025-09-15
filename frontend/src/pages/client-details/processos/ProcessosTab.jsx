import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase-config/config';
// Importa 'onSnapshot' para atualizações em tempo real
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import './ProcessosTab.css';
import AddProcessoModal from './AddProcessoModal';
import DetalhesDoProcesso from './DetalhesDoProcesso'; 

const StatusBadge = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'Ativo': return '#28a745';
            case 'Em Análise': return '#17a2b8';
            case 'Arquivado': return '#6c757d';
            case 'Aguardando Documentos': return '#ffc107';
            case 'Finalizado com Êxito': return '#007bff';
            case 'Finalizado sem Êxito': return '#dc3545';
            default: return '#6c757d';
        }
    };
    const style = {
        backgroundColor: getStatusColor(),
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
    };
    return <span style={style}>{status}</span>;
};


function ProcessosTab({ client }) {
    const [processos, setProcessos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProcesso, setSelectedProcesso] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Efeito para buscar e ouvir processos em tempo real
    useEffect(() => {
        if (!client || !client.id) {
            setProcessos([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        // --- CORREÇÃO PRINCIPAL AQUI ---
        // 1. A referência agora aponta para a SUBCOLEÇÃO de processos dentro do cliente
        const processosRef = collection(db, 'clientes', client.id, 'processos');
        
        // 2. A query é feita nesta subcoleção, ordenada pela data.
        const q = query(processosRef, orderBy('DATA_ENTRADA', 'desc'));

        // 3. onSnapshot escuta as mudanças em tempo real
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const processosList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProcessos(processosList);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao ouvir os processos:", error); // Mensagem de erro mais clara
            setLoading(false);
        });

        // 4. Função de limpeza para parar de escutar
        return () => unsubscribe();

    }, [client]);
    
    // Função para fechar o modal e atualizar a lista (agora automático)
    const handleProcessoAdded = () => {
        setIsModalOpen(false);
    };

    if (loading) {
        return <p>A carregar processos...</p>;
    }

    if (selectedProcesso) {
        return (
            <DetalhesDoProcesso 
                processo={selectedProcesso} 
                client={client}
                onBack={() => setSelectedProcesso(null)}
                onProcessoUpdate={() => {}} // A atualização é automática, não precisa de lógica aqui
            />
        );
    }

    return (
        <div className="processos-tab-container">
            <div className="processos-header">
                <h3>Processos Vinculados</h3>
                <button className="add-processo-btn" onClick={() => setIsModalOpen(true)}>
                    + Adicionar Processo
                </button>
            </div>

            {processos.length === 0 ? (
                <p className="no-processos-message">Nenhum processo cadastrado para este cliente.</p>
            ) : (
                <ul className="processos-list">
                    {processos.map((processo) => (
                        <li key={processo.id} className="processo-list-item" onClick={() => setSelectedProcesso(processo)}>
                            <div className="processo-info">
                                <span className="processo-numero">{processo.ESPECIE}</span>
                                <span className="processo-subinfo">{processo.NUMERO_PROCESSO || 'Proc. Administrativo'}</span>
                            </div>
                            <StatusBadge status={processo.STATUS} />
                        </li>
                    ))}
                </ul>
            )}

            {isModalOpen && (
                <AddProcessoModal
                    isOpen={isModalOpen}
                    client={client}
                    onClose={() => setIsModalOpen(false)}
                    onProcessoAdded={handleProcessoAdded}
                />
            )}
        </div>
    );
}

export default ProcessosTab;
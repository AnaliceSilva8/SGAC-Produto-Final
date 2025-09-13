import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase-config/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import './ProcessosTab.css';
import AddProcessoModal from './AddProcessoModal';
import DetalhesDoProcesso from './DetalhesDoProcesso'; 

const StatusBadge = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'Ativo': return '#28a745';
            case 'Em análise': return '#17a2b8';
            case 'Arquivado': return '#6c757d';
            case 'Suspenso': return '#ffc107';
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

    const fetchProcessos = useCallback(async () => {
        if (!client || !client.id) return;
        setLoading(true);
        try {
            const processosRef = collection(db, 'processos');
            const q = query(
                processosRef,
                where('clientId', '==', client.id),
                orderBy('dataInicio', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const processosList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProcessos(processosList);
        } catch (error) {
            console.error("Erro ao buscar processos:", error);
        } finally {
            setLoading(false);
        }
    }, [client]);

    useEffect(() => {
        fetchProcessos();
    }, [fetchProcessos]);
    
    const handleProcessoAdded = () => {
        fetchProcessos();
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
                onProcessoUpdate={fetchProcessos}
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
                                <span className="processo-numero">{processo.areaDireito}</span>
                                <span className="processo-subinfo">{processo.numeroProcesso || 'Proc. Administrativo'}</span>
                            </div>
                            <StatusBadge status={processo.status} />
                        </li>
                    ))}
                </ul>
            )}

            {isModalOpen && (
                <AddProcessoModal
                    client={client}
                    onClose={() => setIsModalOpen(false)}
                    onProcessoAdded={handleProcessoAdded}
                />
            )}
        </div>
    );
}

export default ProcessosTab;
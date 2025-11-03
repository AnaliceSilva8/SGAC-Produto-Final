import React, { useState, useEffect, useCallback } from 'react';
// --- NOVO: Importar 'doc' e 'deleteDoc' do Firestore ---
import { db, auth } from '../../../firebase-config/config'; // auth pode ser necessário para userInfo
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
// --- NOVO: Importar hook de perfil e ícone de lixeira ---
import { useUserRole } from '../../../hooks/useUserRole';
import { FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2'; // Importar Swal
import { useAuthState } from 'react-firebase-hooks/auth'; // Importar useAuthState
import { logHistoryEvent } from '../../../utils/historyLogger'; // Importar logger
import './ProcessosTab.css';
import AddProcessoModal from './AddProcessoModal';
import DetalhesDoProcesso from './DetalhesDoProcesso';

// Componente StatusBadge (sem alterações)
const StatusBadge = ({ status }) => {
    // ... (código igual)
    const getStatusColor = () => { switch (status) { case 'Ativo': return '#28a745'; case 'Em Análise': case 'Em análise': return '#17a2b8'; case 'Arquivado': return '#6c757d'; case 'Aguardando Documentos': return '#ffc107'; case 'Finalizado com Êxito': return '#007bff'; case 'Finalizado sem Êxito': return '#dc3545'; default: return '#6c757d'; } }; const style = { backgroundColor: getStatusColor(), color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', }; return <span style={style}>{status}</span>;
};


function ProcessosTab({ client }) {
    const [processos, setProcessos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProcesso, setSelectedProcesso] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // --- NOVO: Obter perfil do usuário e informações ---
    const { role } = useUserRole();
    const [user] = useAuthState(auth);
    const [userInfo, setUserInfo] = useState(null);

     // --- NOVO: Buscar informações do usuário para log ---
     const fetchUserInfo = useCallback(async () => {
        if (user) {
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserInfo(userDoc.data());
            } else {
                // Fallback caso o documento do usuário não exista na coleção 'usuarios'
                setUserInfo({ nome: user.email }); // Usar email como fallback
            }
        } else {
            setUserInfo(null);
        }
    }, [user]);

    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);

    // Efeito para buscar processos (sem alterações na lógica de busca)
    useEffect(() => {
        // ... (lógica igual para onSnapshot)
        if (!client || !client.id) { setProcessos([]); setLoading(false); return; } setLoading(true); const processosRef = collection(db, 'clientes', client.id, 'processos'); const q = query(processosRef, orderBy('DATA_ENTRADA', 'desc')); const unsubscribe = onSnapshot(q, (querySnapshot) => { const processosList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setProcessos(processosList); setLoading(false); }, (error) => { console.error("Erro ao ouvir os processos:", error); setLoading(false); }); return () => unsubscribe();
    }, [client]);

    const handleProcessoAdded = () => {
        setIsModalOpen(false);
    };

    // --- NOVO: Função para excluir processo ---
    const handleDeleteProcesso = (processoToDelete, event) => {
        event.stopPropagation(); // Impede que o clique na lixeira abra os detalhes

        if (!userInfo) {
             Swal.fire('Erro!', 'Não foi possível identificar o usuário. Tente novamente.', 'error');
             return;
        }

        Swal.fire({
            title: `Excluir Processo?`,
            html: `Tem certeza que deseja excluir o processo <strong>${processoToDelete.ESPECIE || 'N/A'}</strong>?<br/>Número: ${processoToDelete.NUMERO_PROCESSO || 'Adm.'}<br/>Esta ação não pode ser desfeita!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const processoRef = doc(db, 'clientes', client.id, 'processos', processoToDelete.id);
                try {
                    await deleteDoc(processoRef);

                    // Registrar no histórico
                    const responsavelLog = userInfo.nome || user.email; // Usa nome ou email
                    await logHistoryEvent(
                        client.id,
                        `Excluiu o processo: ${processoToDelete.ESPECIE || 'N/A'} (${processoToDelete.NUMERO_PROCESSO || 'Adm.'})`,
                        responsavelLog
                    );

                    Swal.fire(
                        'Excluído!',
                        'O processo foi excluído com sucesso.',
                        'success'
                    );
                    // A lista será atualizada automaticamente pelo onSnapshot
                } catch (error) {
                    console.error("Erro ao excluir processo:", error);
                    Swal.fire(
                        'Erro!',
                        'Não foi possível excluir o processo.',
                        'error'
                    );
                }
            }
        });
    };


    if (loading) {
        return <p>A carregar processos...</p>;
    }

    // Se um processo está selecionado, mostra os detalhes (sem alterações aqui)
    if (selectedProcesso) {
        return (
            <DetalhesDoProcesso
                processo={selectedProcesso}
                client={client}
                onBack={() => setSelectedProcesso(null)}
                // onProcessoUpdate não é mais necessário aqui pois onSnapshot atualiza a lista
            />
        );
    }

    // Listagem principal de processos
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
                        // --- ALTERADO: Adicionado container extra e botão de exclusão ---
                        <li key={processo.id} className="processo-list-item-wrapper">
                            {/* O clique neste div interno ainda abre os detalhes */}
                            <div className="processo-list-item-content" onClick={() => setSelectedProcesso(processo)}>
                                <div className="processo-info">
                                    <span className="processo-numero">{processo.ESPECIE || 'Tipo não informado'}</span>
                                    <span className="processo-subinfo">{processo.NUMERO_PROCESSO || 'Proc. Administrativo'}</span>
                                </div>
                                <StatusBadge status={processo.STATUS || 'Status N/A'} />
                            </div>
                            {/* Botão de exclusão visível apenas para admins */}
                            {role === 'admin' && (
                                <button
                                    className="processo-delete-btn"
                                    onClick={(e) => handleDeleteProcesso(processo, e)}
                                    title="Excluir Processo"
                                >
                                    <FaTrash />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {isModalOpen && (
                <AddProcessoModal
                    // isOpen foi removido da prop, não era usado
                    client={client}
                    onClose={() => setIsModalOpen(false)}
                    onProcessoAdded={handleProcessoAdded}
                />
            )}
        </div>
    );
}

export default ProcessosTab;
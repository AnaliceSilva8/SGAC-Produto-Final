import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../../../firebase-config/config';
import { doc, collection, addDoc, query, orderBy, serverTimestamp, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import Swal from 'sweetalert2';
import { FaFileUpload, FaDownload, FaTrash, FaEdit, FaSave, FaTimes, FaChevronLeft } from 'react-icons/fa';
import './ProcessoDetalhes.css';
import { useUserRole } from '../../../hooks/useUserRole';
// --- ALTERAÇÃO 1: Importar o novo componente ---
import AudienciasProcesso from './AudienciasProcesso'; 

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

const EventoItem = ({ evento }) => {
    return (
        <div className="evento-item">
            <div className="evento-content">
                <p className="evento-descricao">{evento.descricao}</p>
                <span className="evento-meta">
                    {evento.createdAt?.toDate().toLocaleDateString('pt-BR')} às {evento.createdAt?.toDate().toLocaleTimeString('pt-BR')} por {evento.responsavel}
                </span>
            </div>
        </div>
    );
};

function DetalhesDoProcesso({ processo, client, onBack }) {
    const [user] = useAuthState(auth);
    const [userInfo, setUserInfo] = useState(null);
    const [currentProcesso, setCurrentProcesso] = useState(processo);
    const [novoEvento, setNovoEvento] = useState('');
    const [historico, setHistorico] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [fileToUpload, setFileToUpload] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const { role } = useUserRole();
    
    // Efeito para buscar dados (onSnapshot) - (Sem alterações na lógica)
    useEffect(() => {
        if (!client?.id || !processo?.id) { setLoading(false); return; }
        setLoading(true);

        const processoRef = doc(db, 'clientes', client.id, 'processos', processo.id);
        const unsubscribeProcesso = onSnapshot(processoRef, (docSnap) => {
            if (docSnap.exists()) { setCurrentProcesso({ id: docSnap.id, ...docSnap.data() }); }
        }, (error) => console.error("Erro ao ouvir processo:", error));

        const historicoRef = collection(db, 'clientes', client.id, 'processos', processo.id, 'historico');
        const qHist = query(historicoRef, orderBy('createdAt', 'desc'));
        const unsubscribeHistorico = onSnapshot(qHist, (snapshot) => {
            setHistorico(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => console.error("Erro ao ouvir histórico:", error));

        const documentosRef = collection(db, 'clientes', client.id, 'processos', processo.id, 'documentos');
        const qDocs = query(documentosRef, orderBy('createdAt', 'desc'));
        const unsubscribeDocumentos = onSnapshot(qDocs, (snapshot) => {
            setDocumentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false); 
        }, (error) => {
            console.error("Erro ao ouvir documentos:", error);
            setLoading(false);
        });
        
        const fetchUserInfo = async () => {
            if (user) {
                const userDocRef = doc(db, 'usuarios', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) setUserInfo(userDoc.data());
            }
        };
        fetchUserInfo();

        return () => {
            unsubscribeProcesso();
            unsubscribeHistorico();
            unsubscribeDocumentos();
        };
    }, [client?.id, processo?.id, user]);


    if (!currentProcesso || !client) {
        return <div className="loading-container">A carregar...</div>;
    }
    
    // Funções de formatação de data (sem alterações)
    const formatDateForDisplay = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };
    
    // --- ALTERAÇÃO 2: Remover 'dataAudiencia' da edição ---
    const handleEditToggle = () => {
        if (!isEditing) {
            setFormData({
                status: currentProcesso.STATUS,
                faseAtual: currentProcesso.FASE_ATUAL || '',
                // dataAudiencia: formatDateForInput(currentProcesso.dataAudiencia), // REMOVIDO
            });
        }
        setIsEditing(!isEditing);
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- ALTERAÇÃO 3: Remover 'dataAudiencia' do salvamento ---
    const handleSaveChanges = async () => {
        setIsSaving(true);
        const processoRef = doc(db, 'clientes', client.id, 'processos', currentProcesso.id);
        const historicoRef = collection(db, 'clientes', client.id, 'processos', currentProcesso.id, 'historico');
        const responsavel = userInfo?.nome || user.email;
        const historyLogs = [];

        if (formData.status !== currentProcesso.STATUS) {
            historyLogs.push(`Status alterado de "${currentProcesso.STATUS}" para "${formData.status}".`);
        }
        if (formData.faseAtual !== (currentProcesso.FASE_ATUAL || '')) {
            historyLogs.push(`Fase atual alterada de "${currentProcesso.FASE_ATUAL || 'Não definida'}" para "${formData.faseAtual}".`);
        }
        
        // Lógica da data da audiência REMOVIDA daqui

        try {
            if (historyLogs.length > 0) {
                await updateDoc(processoRef, {
                    STATUS: formData.status,
                    FASE_ATUAL: formData.faseAtual,
                    // dataAudiencia: ... // REMOVIDO
                });
    
                for (const log of historyLogs) {
                    await addDoc(historicoRef, { descricao: log, responsavel, createdAt: serverTimestamp() });
                }
            }
            Toast.fire({ icon: 'success', title: 'Alterações salvas com sucesso.' });
            setIsEditing(false);
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Não foi possível salvar as alterações.' });
        } finally {
            setIsSaving(false);
        }
    };

    // handleAddEvento (usando Toasts)
    const handleAddEvento = async (e) => {
        e.preventDefault();
        if (!novoEvento.trim() || !userInfo) return;
        setIsSaving(true);
        try {
            const historicoRef = collection(db, 'clientes', client.id, 'processos', currentProcesso.id, 'historico');
            await addDoc(historicoRef, {
                descricao: novoEvento,
                responsavel: userInfo?.nome || user.email,
                createdAt: serverTimestamp(),
            });
            setNovoEvento('');
            Toast.fire({ icon: 'success', title: 'Evento adicionado.' });
        } catch (error) {
            console.error("Erro ao adicionar evento: ", error);
            Toast.fire({ icon: 'error', title: 'Erro ao adicionar evento.' });
        } finally {
            setIsSaving(false);
        }
    };

    // handleFileUpload (usando Toasts)
    const handleFileUpload = async () => {
        if (!fileToUpload) return;
        setIsUploading(true);
        const filePath = `clientes/${client.id}/processos/${currentProcesso.id}/${Date.now()}_${fileToUpload.name}`;
        const storageRef = ref(storage, filePath);
        
        try {
            await uploadBytes(storageRef, fileToUpload);
            const downloadURL = await getDownloadURL(storageRef);
            
            const documentosRef = collection(db, 'clientes', client.id, 'processos', currentProcesso.id, 'documentos');
            await addDoc(documentosRef, {
                nome: fileToUpload.name,
                url: downloadURL,
                path: filePath,
                createdAt: serverTimestamp(),
            });
            Toast.fire({ icon: 'success', title: 'Documento anexado com sucesso.' });
            setFileToUpload(null);
            document.getElementById('file-input').value = null;
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Falha ao anexar o documento.' });
        } finally {
            setIsUploading(false);
        }
    };
    
    // handleDeleteDocument (usando Modal de confirmação + Toast)
    const handleDeleteDocument = async (docData) => {
        Swal.fire({
            title: `Excluir "${docData.nome}"?`, text: "Esta ação não pode ser desfeita!", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const docRef = doc(db, 'clientes', client.id, 'processos', currentProcesso.id, 'documentos', docData.id);
                const storageRef = ref(storage, docData.path);
                try {
                    await deleteDoc(docRef);
                    await deleteObject(storageRef);
                    Toast.fire({ icon: 'success', title: 'O documento foi removido.' });
                } catch (error) {
                    Toast.fire({ icon: 'error', title: 'Não foi possível remover o documento.' });
                }
            }
        });
    };

    return (
        <div className="processo-detalhes-container">
            <button className="back-button-icon" onClick={onBack} title="Voltar">
                <FaChevronLeft />
            </button>

            <div className="detalhes-header">
                <h3>{currentProcesso.ESPECIE}</h3>
                <div className="header-controls">
                    <p>Cliente: {client.NOMECLIENTE}</p>
                    <div className="edit-controls">
                        {isEditing ? (
                            <>
                                <button onClick={handleSaveChanges} className="save-btn" disabled={isSaving}><FaSave /> Salvar</button>
                                <button onClick={handleEditToggle} className="cancel-btn"><FaTimes /> Cancelar</button>
                            </>
                        ) : (
                            <button onClick={handleEditToggle} className="edit-btn"><FaEdit /> Editar</button>
                        )}
                    </div>
                </div>
            </div>

            <div className="detalhes-body-grid">
                
                {/* Coluna 1: Informações */}
                <div className={`info-grid processo-card ${isEditing ? 'info-grid-edit' : ''}`}>
                    {isEditing ? (
                        <>
                            <div className="info-item"><strong>Nº Processo (CNJ)</strong><p>{currentProcesso.NUMERO_PROCESSO || 'Não informado'}</p></div>
                            <div className="info-item"><strong>Data de Início (DER)</strong><p>{formatDateForDisplay(currentProcesso.DATA_ENTRADA)}</p></div>
                            <div className="info-item">
                                <label><strong>Status</strong></label>
                                <select name="status" value={formData.status} onChange={handleInputChange}>
                                    <option value="Ativo">Ativo</option>
                                    <option value="Em análise">Em análise</option>
                                    <option value="Arquivado">Arquivado</option>
                                    <option value="Aguardando Documentos">Aguardando Documentos</option>
                                    <option value="Finalizado com Êxito">Finalizado com Êxito</option>
                                    <option value="Finalizado sem Êxito">Finalizado sem Êxito</option>
                                </select>
                            </div>
                            <div className="info-item">
                                <label><strong>Fase Atual</strong></label>
                                <input type="text" name="faseAtual" value={formData.faseAtual} onChange={handleInputChange} />
                            </div>
                            {/* O campo Data da Audiência foi REMOVIDO daqui */}
                        </>
                    ) : (
                        <>
                            <div className="info-item"><strong>Nº Processo (CNJ)</strong><p>{currentProcesso.NUMERO_PROCESSO || 'Não informado'}</p></div>
                            <div className="info-item"><strong>Data de Início (DER)</strong><p>{formatDateForDisplay(currentProcesso.DATA_ENTRADA)}</p></div>
                            <div className="info-item"><strong>Status</strong><p>{currentProcesso.STATUS}</p></div>
                            <div className="info-item"><strong>Fase Atual</strong><p>{currentProcesso.FASE_ATUAL || 'Não informada'}</p></div>
                            {/* O campo Data da Audiência foi REMOVIDO daqui */}
                        </>
                    )}
                </div>

                {/* Coluna 2: Documentos E Audiências */}
                <div className="coluna-direita-wrapper">
                    <div className="documentos-section processo-card">
                        <h4>Documentos do Processo</h4>
                        <div className="upload-area">
                            <input type="file" id="file-input" onChange={(e) => setFileToUpload(e.target.files[0])} />
                            <button onClick={handleFileUpload} disabled={isUploading || !fileToUpload}>
                                <FaFileUpload /> {isUploading ? 'Anexando...' : 'Anexar'}
                            </button>
                        </div>
                        {documentos.length > 0 ? (
                            <ul className="documentos-list">
                                {documentos.map(docData => (
                                    <li key={docData.id} className="documento-item">
                                        <span className="documento-item-nome">{docData.nome}</span>
                                        <div className="documento-item-actions">
                                            <a href={docData.url} target="_blank" rel="noopener noreferrer" title="Baixar"><FaDownload /></a>
                                            
                                            {/* --- ALTERAÇÃO FINAL: Botão de excluir condicional --- */}
                                            {role === 'admin' && (
                                                <button onClick={() => handleDeleteDocument(docData)} title="Excluir"><FaTrash /></button>
                                            )}
                                            {/* --- FIM DA ALTERAÇÃO --- */}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="empty-list-message">Nenhum documento anexado a este processo.</p>}
                    </div>

                    <AudienciasProcesso 
                        clientId={client.id} 
                        processoId={currentProcesso.id} 
                        userInfo={userInfo}
                    />
                </div>
            </div>

            {/* Seção de Eventos (abaixo das 2 colunas) */}
            <div className="evento-section processo-card">
                <h4>Eventos</h4>
                <form onSubmit={handleAddEvento} className="evento-form">
                    <textarea
                        value={novoEvento}
                        onChange={(e) => setNovoEvento(e.target.value)}
                        placeholder="Adicione uma nova movimentação ou evento manualmente..."
                        rows="5"
                    ></textarea>
                    <button type="submit" disabled={isSaving}>
                        {isSaving ? 'Adicionando...' : 'Adicionar Evento'}
                    </button>
                </form>
                <div className="eventos-list">
                    {loading ? <p>A carregar eventos...</p> : historico.length > 0 ? (
                        historico.map((evento) => (
                            <EventoItem key={evento.id} evento={evento} />
                        ))
                    ) : <p className="empty-list-message">Nenhum evento registrado.</p>}
                </div>
            </div>
        </div>
    );
}

export default DetalhesDoProcesso;
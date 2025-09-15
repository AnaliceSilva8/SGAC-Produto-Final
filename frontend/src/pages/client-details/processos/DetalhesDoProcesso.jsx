import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../../../firebase-config/config';
// Importa onSnapshot para escutar em tempo real
import { doc, collection, addDoc, query, orderBy, serverTimestamp, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import Swal from 'sweetalert2';
import { FaFileUpload, FaDownload, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './ProcessoDetalhes.css';

const TimelineItem = ({ evento }) => {
    return (
        <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
                <p className="timeline-descricao">{evento.descricao}</p>
                <span className="timeline-meta">
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

    // Efeito para buscar todos os dados em tempo real
    useEffect(() => {
        if (!client?.id || !processo?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // --- CORREÇÃO 1: OUVIR O DOCUMENTO PRINCIPAL DO PROCESSO ---
        const processoRef = doc(db, 'clientes', client.id, 'processos', processo.id);
        const unsubscribeProcesso = onSnapshot(processoRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentProcesso({ id: docSnap.id, ...docSnap.data() });
            }
        }, (error) => console.error("Erro ao ouvir processo:", error));

        // --- CORREÇÃO 2: OUVIR A SUBCOLEÇÃO DE HISTÓRICO ---
        const historicoRef = collection(db, 'clientes', client.id, 'processos', processo.id, 'historico');
        const qHist = query(historicoRef, orderBy('createdAt', 'desc'));
        const unsubscribeHistorico = onSnapshot(qHist, (snapshot) => {
            setHistorico(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => console.error("Erro ao ouvir histórico:", error));

        // --- CORREÇÃO 3: OUVIR A SUBCOLEÇÃO DE DOCUMENTOS ---
        const documentosRef = collection(db, 'clientes', client.id, 'processos', processo.id, 'documentos');
        const qDocs = query(documentosRef, orderBy('createdAt', 'desc'));
        const unsubscribeDocumentos = onSnapshot(qDocs, (snapshot) => {
            setDocumentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false); // Considera carregado após buscar os documentos
        }, (error) => {
            console.error("Erro ao ouvir documentos:", error);
            setLoading(false);
        });
        
        // Busca dados do usuário logado
        const fetchUserInfo = async () => {
            if (user) {
                const userDocRef = doc(db, 'usuarios', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) setUserInfo(userDoc.data());
            }
        };
        fetchUserInfo();

        // Função de limpeza para parar de ouvir os snapshots
        return () => {
            unsubscribeProcesso();
            unsubscribeHistorico();
            unsubscribeDocumentos();
        };
    }, [client?.id, processo?.id, user]);


    if (!currentProcesso || !client) {
        return <div className="loading-container">A carregar...</div>;
    }
    
    const formatDateForInput = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return '';
        const date = timestamp.toDate();
        const adjustedDate = new Date(date.getTime() - (date.getTimezoneOffset() * -60000));
        return adjustedDate.toISOString().split('T')[0];
    };

    const formatDateForDisplay = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };
    
    const handleEditToggle = () => {
        if (!isEditing) {
            setFormData({
                status: currentProcesso.STATUS, // Ajustado para STATUS
                faseAtual: currentProcesso.FASE_ATUAL || '', // Ajustado para FASE_ATUAL
                dataAudiencia: formatDateForInput(currentProcesso.dataAudiencia),
            });
        }
        setIsEditing(!isEditing);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        // --- CORREÇÃO 4: REFERÊNCIAS PARA UPDATE E ADIÇÃO DE HISTÓRICO ---
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
        
        const oldDate = formatDateForInput(currentProcesso.dataAudiencia);
        if (formData.dataAudiencia !== oldDate) {
            const newDateText = formData.dataAudiencia ? new Date(formData.dataAudiencia).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Nenhuma';
            historyLogs.push(`Data da audiência alterada para ${newDateText}.`);
        }

        try {
            if (historyLogs.length > 0) {
                await updateDoc(processoRef, {
                    STATUS: formData.status,
                    FASE_ATUAL: formData.faseAtual,
                    dataAudiencia: formData.dataAudiencia ? new Date(formData.dataAudiencia + 'T12:00:00.000Z') : null,
                });
    
                for (const log of historyLogs) {
                    await addDoc(historicoRef, { descricao: log, responsavel, createdAt: serverTimestamp() });
                }
            }
            Swal.fire('Sucesso!', 'Alterações salvas com sucesso.', 'success');
            setIsEditing(false);
        } catch (error) {
            Swal.fire('Erro!', 'Não foi possível salvar as alterações.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddEvento = async (e) => {
        e.preventDefault();
        if (!novoEvento.trim() || !userInfo) return;
        setIsSaving(true);
        try {
            // --- CORREÇÃO 5: REFERÊNCIA PARA ADICIONAR EVENTO ---
            const historicoRef = collection(db, 'clientes', client.id, 'processos', currentProcesso.id, 'historico');
            await addDoc(historicoRef, {
                descricao: novoEvento,
                responsavel: userInfo?.nome || user.email,
                createdAt: serverTimestamp(),
            });
            setNovoEvento('');
        } catch (error) {
            console.error("Erro ao adicionar evento: ", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async () => {
        if (!fileToUpload) return;
        setIsUploading(true);
        // Path no storage mais organizado
        const filePath = `clientes/${client.id}/processos/${currentProcesso.id}/${Date.now()}_${fileToUpload.name}`;
        const storageRef = ref(storage, filePath);
        
        try {
            await uploadBytes(storageRef, fileToUpload);
            const downloadURL = await getDownloadURL(storageRef);
            
            // --- CORREÇÃO 6: REFERÊNCIA PARA ADICIONAR DOCUMENTO ---
            const documentosRef = collection(db, 'clientes', client.id, 'processos', currentProcesso.id, 'documentos');
            await addDoc(documentosRef, {
                nome: fileToUpload.name,
                url: downloadURL,
                path: filePath,
                createdAt: serverTimestamp(),
            });

            Swal.fire('Sucesso!', 'Documento anexado com sucesso.', 'success');
            setFileToUpload(null);
            document.getElementById('file-input').value = null;
        } catch (error) {
            Swal.fire('Erro!', 'Falha ao anexar o documento.', 'error');
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDeleteDocument = async (docData) => {
        Swal.fire({
            title: `Excluir "${docData.nome}"?`, text: "Esta ação não pode ser desfeita!", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                // --- CORREÇÃO 7: REFERÊNCIAS PARA EXCLUIR DOCUMENTO ---
                const docRef = doc(db, 'clientes', client.id, 'processos', currentProcesso.id, 'documentos', docData.id);
                const storageRef = ref(storage, docData.path);
                try {
                    await deleteDoc(docRef);
                    await deleteObject(storageRef);
                    Swal.fire('Excluído!', 'O documento foi removido.', 'success');
                } catch (error) {
                    Swal.fire('Erro!', 'Não foi possível remover o documento.', 'error');
                }
            }
        });
    };

    return (
        <div className="processo-detalhes-container">
            <button className="back-button" onClick={onBack}>
                &larr; Voltar para a lista de processos
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

            <div className={`info-grid ${isEditing ? 'info-grid-edit' : ''}`}>
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
                        <div className="info-item">
                            <label><strong>Data da Audiência</strong></label>
                            <input type="date" name="dataAudiencia" value={formData.dataAudiencia} onChange={handleInputChange} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="info-item"><strong>Nº Processo (CNJ)</strong><p>{currentProcesso.NUMERO_PROCESSO || 'Não informado'}</p></div>
                        <div className="info-item"><strong>Data de Início (DER)</strong><p>{formatDateForDisplay(currentProcesso.DATA_ENTRADA)}</p></div>
                        <div className="info-item"><strong>Status</strong><p>{currentProcesso.STATUS}</p></div>
                        <div className="info-item"><strong>Fase Atual</strong><p>{currentProcesso.FASE_ATUAL || 'Não informada'}</p></div>
                        <div className="info-item"><strong>Data da Audiência</strong><p>{formatDateForDisplay(currentProcesso.dataAudiencia)}</p></div>
                    </>
                )}
            </div>

            <div className="documentos-section">
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
                                    <button onClick={() => handleDeleteDocument(docData)} title="Excluir"><FaTrash /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p>Nenhum documento anexado a este processo.</p>}
            </div>

            <div className="timeline-section">
                <h4>Linha do Tempo do Processo</h4>
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
                <div className="timeline">
                    {loading ? <p>A carregar histórico...</p> : historico.length > 0 ? (
                        historico.map((evento) => (
                            <TimelineItem key={evento.id} evento={evento} />
                        ))
                    ) : <p>Nenhum evento registado nesta linha do tempo.</p>}
                </div>
            </div>
        </div>
    );
}

export default DetalhesDoProcesso;
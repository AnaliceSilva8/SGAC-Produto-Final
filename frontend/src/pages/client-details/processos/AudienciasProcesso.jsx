import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase-config/config';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FaPlus, FaCheck } from 'react-icons/fa';
import './AudienciasProcesso.css'; // Vamos criar este arquivo a seguir

// Toast temporário
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// Modal para Adicionar/Concluir Audiência
const AudienciaModal = ({ isOpen, onClose, onSave, audiencia }) => {
    const [data, setData] = useState('');
    const [observacao, setObservacao] = useState('');

    const isEditMode = !!audiencia; // Estamos concluindo (editando) ou adicionando?

    useEffect(() => {
        if (isEditMode) {
            // Concluindo: A data não pode mudar, só adiciona observação
            setData(audiencia.data.toDate().toISOString().split('T')[0]);
            setObservacao(''); // Começa com observação de conclusão vazia
        } else {
            // Adicionando: Zera os campos
            setData('');
            setObservacao('');
        }
    }, [isOpen, audiencia, isEditMode]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!isEditMode && !data) {
            Toast.fire({ icon: 'warning', title: 'A data é obrigatória.' });
            return;
        }
        onSave(isEditMode ? { observacaoConclusao: observacao } : { data, observacaoInicial: observacao });
    };

    return (
        <div className="audiencia-modal-overlay">
            <div className="audiencia-modal-content">
                <h2>{isEditMode ? 'Concluir Audiência' : 'Agendar Nova Audiência'}</h2>
                
                <div className="form-group">
                    <label>Data da Audiência</label>
                    <input 
                        type="date" 
                        value={data} 
                        onChange={(e) => setData(e.target.value)}
                        disabled={isEditMode} // Não pode editar a data ao concluir
                    />
                </div>
                
                <div className="form-group">
                    <label>{isEditMode ? 'Observação da Conclusão' : 'Observação Inicial (Opcional)'}</label>
                    <textarea 
                        value={observacao} 
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder={isEditMode ? 'Descreva o que aconteceu na audiência...' : 'Motivo, local, etc...'}
                    />
                </div>

                <div className="audiencia-modal-actions">
                    <button onClick={onClose} className="btn-cancel">Cancelar</button>
                    <button onClick={handleSubmit} className="btn-save">{isEditMode ? 'Concluir Audiência' : 'Agendar'}</button>
                </div>
            </div>
        </div>
    );
};


// Componente Principal do Card de Audiências
function AudienciasProcesso({ clientId, processoId, userInfo }) {
    const [audiencias, setAudiencias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAudiencia, setSelectedAudiencia] = useState(null); // Para saber qual audiência concluir

    // Referência da subcoleção de audiências
    const audienciasRef = collection(db, 'clientes', clientId, 'processos', processoId, 'audiencias');

    // Busca as audiências em tempo real
    useEffect(() => {
        const q = query(audienciasRef, orderBy('data', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAudiencias(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao ouvir audiências:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [clientId, processoId]); // Dependências corretas

    // Salva uma NOVA audiência
    const handleSaveAudiencia = async ({ data, observacaoInicial }) => {
        try {
            const dataDate = new Date(data + 'T12:00:00.000Z'); // Evita problemas de fuso
            const dataTimestamp = Timestamp.fromDate(dataDate);

            await addDoc(audienciasRef, {
                data: dataTimestamp,
                status: 'Agendada',
                observacaoInicial: observacaoInicial || '',
                observacaoConclusao: '',
                createdAt: serverTimestamp(),
                responsavelAgendamento: userInfo?.nome || 'Não identificado'
            });

            Toast.fire({ icon: 'success', title: 'Audiência agendada!' });
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            Toast.fire({ icon: 'error', title: 'Erro ao agendar.' });
        }
    };

    // Salva a CONCLUSÃO de uma audiência
    const handleSaveConclusao = async ({ observacaoConclusao }) => {
        if (!selectedAudiencia) return;
        
        const audienciaRef = doc(db, 'clientes', clientId, 'processos', processoId, 'audiencias', selectedAudiencia.id);

        try {
            await updateDoc(audienciaRef, {
                status: 'Concluída',
                observacaoConclusao: observacaoConclusao || '',
                concluidaAt: serverTimestamp(),
                responsavelConclusao: userInfo?.nome || 'Não identificado'
            });

            Toast.fire({ icon: 'success', title: 'Audiência concluída!' });
            setSelectedAudiencia(null); // Fecha o modal
        } catch (error) {
            console.error(error);
            Toast.fire({ icon: 'error', title: 'Erro ao concluir.' });
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return timestamp.toDate().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    return (
        <>
            <div className="processo-card audiencias-card">
                <h4>
                    Audiências
                    <button onClick={() => { setSelectedAudiencia(null); setIsModalOpen(true); }} className="btn-add-audiencia" title="Agendar nova audiência">
                        <FaPlus /> Agendar
                    </button>
                </h4>
                
                <div className="audiencias-list">
                    {isLoading && <p>Carregando...</p>}
                    {!isLoading && audiencias.length === 0 && (
                        <p className="empty-list-message">Nenhuma audiência agendada.</p>
                    )}
                    {audiencias.map(aud => (
                        <div key={aud.id} className="audiencia-item">
                            <div className={`audiencia-status status-${aud.status.toLowerCase()}`}>
                                {aud.status}
                            </div>
                            <div className="audiencia-detalhes">
                                <span className="audiencia-data">{formatDate(aud.data)}</span>
                                {aud.observacaoInicial && <p className="audiencia-obs"><span>Obs. Agendamento:</span> {aud.observacaoInicial}</p>}
                                {aud.status === 'Concluída' && aud.observacaoConclusao && (
                                    <p className="audiencia-obs-concluida"><span>Obs. Conclusão:</span> {aud.observacaoConclusao}</p>
                                )}
                            </div>
                            {aud.status === 'Agendada' && (
                                <button 
                                    className="btn-concluir-audiencia"
                                    onClick={() => { setSelectedAudiencia(aud); setIsModalOpen(true); }}
                                    title="Concluir Audiência"
                                >
                                    <FaCheck /> Concluir
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <AudienciaModal 
                isOpen={isModalOpen || !!selectedAudiencia}
                onClose={() => { setIsModalOpen(false); setSelectedAudiencia(null); }}
                onSave={selectedAudiencia ? handleSaveConclusao : handleSaveAudiencia}
                audiencia={selectedAudiencia}
            />
        </>
    );
}

export default AudienciasProcesso;
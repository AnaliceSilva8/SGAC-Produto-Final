import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase-config/config';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Swal from 'sweetalert2';
import { IMaskInput } from 'react-imask';
import { logHistoryEvent } from '../../../utils/historyLogger';
import './AddProcessoModal.css';

function AddProcessoModal({ client, onClose, onProcessoAdded }) {
    const initialState = {
        numeroProcesso: '',
        tipoBeneficio: '',
        status: 'Ativo',
        nit: client?.NIT || '',
        nb: '',
        dataInicio: '',
        faseAtual: '',
        poloAtivo: client?.NOMECLIENTE || '',
        poloPassivo: 'INSS',
    };

    const [formData, setFormData] = useState(initialState);
    const [isSaving, setIsSaving] = useState(false);
    const [user] = useAuthState(auth);
    const [userInfo, setUserInfo] = useState(null);

    // Busca informações do usuário logado para os logs
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

    // Reseta o formulário quando o modal é reaberto
    useEffect(() => {
        setFormData({
            ...initialState,
            nit: client?.NIT || '',
            poloAtivo: client?.NOMECLIENTE || '',
        });
    }, [client]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    
    const handleMaskedInputChange = (value, name) => {
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.tipoBeneficio || !formData.dataInicio) {
            Swal.fire('Atenção!', 'Tipo de Benefício e Data de Início são obrigatórios.', 'warning');
            return;
        }
        if (!client?.id || !userInfo) {
            Swal.fire('Erro!', 'Cliente ou usuário não identificado. Por favor, faça o login novamente.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // --- CORREÇÃO PRINCIPAL AQUI ---
            // 1. A referência agora aponta para a SUBCOLEÇÃO 'processos' dentro do cliente
            const processosRef = collection(db, 'clientes', client.id, 'processos');

            // 2. Adiciona o documento na subcoleção correta
            await addDoc(processosRef, {
                // ...formData, // Mantém os dados do formulário
                // O nome do campo no banco será 'ESPECIE' para consistência com o ProcessosTab.jsx
                ESPECIE: formData.tipoBeneficio,
                NUMERO_PROCESSO: formData.numeroProcesso,
                STATUS: formData.status,
                NIT: formData.nit,
                NB: formData.nb,
                // O nome do campo no banco será 'DATA_ENTRADA' para consistência
                DATA_ENTRADA: formData.dataInicio,
                FASE_ATUAL: formData.faseAtual,
                POLO_ATIVO: formData.poloAtivo,
                POLO_PASSIVO: formData.poloPassivo,
                DATA_CADASTRO: serverTimestamp(),
            });

            const responsibleLog = userInfo.nome || user.email;
            await logHistoryEvent(client.id, `Adicionou o processo: ${formData.tipoBeneficio}`, responsibleLog);

            Swal.fire('Sucesso!', 'Processo adicionado com sucesso!', 'success');
            onProcessoAdded(); // Atualiza a lista e fecha o modal
            onClose();

        } catch (error) {
            console.error("Erro ao adicionar processo: ", error);
            Swal.fire('Erro!', 'Não foi possível adicionar o processo.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Adicionar Novo Processo Previdenciário</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="processo-form">
                    <div className="form-grid">
                        
                        <div className="form-group full-width">
                            <label htmlFor="tipoBeneficio">Tipo de Benefício / Ação</label>
                            <select
                                id="tipoBeneficio"
                                name="tipoBeneficio"
                                value={formData.tipoBeneficio}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Selecione o tipo de benefício...</option>
                                <option value="Aposentadoria por Idade">Aposentadoria por Idade</option>
                                <option value="Aposentadoria por Tempo de Contribuição">Aposentadoria por Tempo de Contribuição</option>
                                <option value="Auxílio-Doença">Auxílio-Doença (Benefício por Incapacidade Temporária)</option>
                                <option value="Auxílio-Acidente">Auxílio-Acidente</option>
                                <option value="Pensão por Morte">Pensão por Morte</option>
                                <option value="Salário Maternidade">Salário Maternidade</option>
                                <option value="BPC/LOAS">BPC/LOAS (Benefício de Prestação Continuada)</option>
                                <option value="Revisão de Benefício">Revisão de Benefício</option>
                                <option value="Recurso Administrativo">Recurso Administrativo</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="numeroProcesso">Número do Processo (CNJ)</label>
                            <IMaskInput
                                mask="0000000-00.0000.0.00.0000"
                                id="numeroProcesso"
                                name="numeroProcesso"
                                value={formData.numeroProcesso}
                                onAccept={(val) => handleMaskedInputChange(val, 'numeroProcesso')}
                                placeholder='Opcional se for processo administrativo'
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="dataInicio">Data de Início (DER)</label>
                            <input
                                type="date"
                                id="dataInicio"
                                name="dataInicio"
                                value={formData.dataInicio}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="nit">NIT / PIS / PASEP</label>
                            <input type="text" id="nit" name="nit" value={formData.nit} onChange={handleInputChange} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="nb">Nº do Benefício (NB)</label>
                            <input type="text" id="nb" name="nb" value={formData.nb} onChange={handleInputChange} placeholder='Opcional'/>
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="Ativo">Ativo</option>
                                <option value="Em análise">Em análise</option>
                                <option value="Arquivado">Arquivado</option>
                                <option value="Suspenso">Suspenso</option>
                                <option value="Finalizado com Êxito">Finalizado com Êxito</option>
                                <option value="Finalizado sem Êxito">Finalizado sem Êxito</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="faseAtual">Fase Atual</label>
                            <input type="text" id="faseAtual" name="faseAtual" value={formData.faseAtual} onChange={handleInputChange} placeholder="Ex: Aguardando perícia" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="poloAtivo">Polo Ativo</label>
                            <input type="text" id="poloAtivo" name="poloAtivo" value={formData.poloAtivo} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="poloPassivo">Polo Passivo</label>
                            <input type="text" id="poloPassivo" name="poloPassivo" value={formData.poloPassivo} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={onClose} disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="save-btn" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar Processo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddProcessoModal;
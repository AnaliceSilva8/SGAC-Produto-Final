import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../firebase-config/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Swal from 'sweetalert2';
import { IMaskInput } from 'react-imask';
import { logHistoryEvent } from '../../../utils/historyLogger';
import './AddProcessoModal.css';

// --- ALTERAÇÃO 1: DEFINIÇÃO DO TOAST ---
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
// --- FIM DA ALTERAÇÃO 1 ---

function AddProcessoModal({ client, onClose, onProcessoAdded }) {
    const initialState = { /* ... (igual) ... */ numeroProcesso: '', tipoBeneficio: '', status: 'Ativo', nit: client?.NIT || '', nb: '', dataInicio: '', faseAtual: '', poloAtivo: client?.NOMECLIENTE || '', poloPassivo: 'INSS', };
    const [formData, setFormData] = useState(initialState);
    const [isSaving, setIsSaving] = useState(false);
    const [user] = useAuthState(auth);
    const [userInfo, setUserInfo] = useState(null);

    // useEffects (fetchUserInfo, reset form) - Sem alterações
    useEffect(() => { const fetchUserInfo = async () => { if (user) { const userDocRef = doc(db, 'usuarios', user.uid); const userDoc = await getDoc(userDocRef); if (userDoc.exists()) { setUserInfo(userDoc.data()); } } }; fetchUserInfo(); }, [user]);
    useEffect(() => { setFormData({ ...initialState, nit: client?.NIT || '', poloAtivo: client?.NOMECLIENTE || '', }); }, [client]);

    // Handlers (handleInputChange, handleMaskedInputChange) - Sem alterações
    const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prevState => ({ ...prevState, [name]: value })); };
    const handleMaskedInputChange = (value, name) => { setFormData(prevState => ({ ...prevState, [name]: value })); };

    // handleSubmit - Sem alterações na lógica, apenas na formatação da data
    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        if (!formData.tipoBeneficio || !formData.dataInicio) { 
            // --- ALTERAÇÃO 2: Aviso (agora é toast) ---
            Toast.fire({ icon: 'warning', title: 'Tipo de Benefício e Data de Início são obrigatórios.' }); 
            return; 
        } 
        if (!client?.id || !userInfo) { 
            // --- ALTERAÇÃO 3: Erro (agora é toast) ---
            Toast.fire({ icon: 'error', title: 'Cliente ou usuário não identificado.' }); 
            return; 
        } 
        setIsSaving(true); 
        try { 
            const processosRef = collection(db, 'clientes', client.id, 'processos'); 
            const dataInicioDate = new Date(formData.dataInicio + 'T12:00:00.000Z'); 
            const dataInicioTimestamp = Timestamp.fromDate(dataInicioDate); 
            await addDoc(processosRef, { 
                ESPECIE: formData.tipoBeneficio, 
                NUMERO_PROCESSO: formData.numeroProcesso, 
                STATUS: formData.status, 
                NIT: formData.nit, 
                NB: formData.nb, 
                DATA_ENTRADA: dataInicioTimestamp, 
                FASE_ATUAL: formData.faseAtual, 
                POLO_ATIVO: formData.poloAtivo, 
                POLO_PASSIVO: formData.poloPassivo, 
                DATA_CADASTRO: serverTimestamp(), 
            }); 
            const responsibleLog = userInfo.nome || user.email; 
            await logHistoryEvent(client.id, `Adicionou o processo: ${formData.tipoBeneficio}`, responsibleLog); 
            
            // --- ALTERAÇÃO 4: Sucesso (agora é toast) ---
            Toast.fire({ icon: 'success', title: 'Processo adicionado!' }); 
            
            onProcessoAdded(); 
            onClose(); 
        } catch (error) { 
            console.error("Erro:", error); 
            // --- ALTERAÇÃO 5: Erro (agora é toast) ---
            Toast.fire({ icon: 'error', title: 'Não foi possível adicionar o processo.' }); 
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
                            <label htmlFor="tipoBeneficio">Tipo de Benefício / Ação <span style={{ color: 'red' }}>*</span></label>
                            <select id="tipoBeneficio" name="tipoBeneficio" value={formData.tipoBeneficio} onChange={handleInputChange} required >
                                <option value="">Selecione o tipo...</option>
                                <option value="Aposentadoria por Idade">Aposentadoria por Idade</option>
                                <option value="Aposentadoria por Tempo de Contribuição">Aposentadoria por Tempo de Contribuição</option>
                                <option value="Auxílio-Doença">Auxílio-Doença (Incapacidade Temporária)</option>
                                <option value="Auxílio-Acidente">Auxílio-Acidente</option>
                                <option value="Pensão por Morte">Pensão por Morte</option>
                                <option value="Salário Maternidade">Salário Maternidade</option>
                                <option value="BPC/LOAS">BPC/LOAS</option>
                                <option value="Revisão de Benefício">Revisão de Benefício</option>
                                <option value="Recurso Administrativo">Recurso Administrativo</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="numeroProcesso">Número do Processo (CNJ)</label>
                            <IMaskInput mask="0000000-00.0000.0.00.0000" id="numeroProcesso" name="numeroProcesso" value={formData.numeroProcesso} onAccept={(val) => handleMaskedInputChange(val, 'numeroProcesso')} placeholder='Opcional (adm.)'/>
                        </div>
                        <div className="form-group">
                            <label htmlFor="dataInicio">Data de Início (DER) <span style={{ color: 'red' }}>*</span></label>
                            <input type="date" id="dataInicio" name="dataInicio" value={formData.dataInicio} onChange={handleInputChange} required />
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
                            <select id="status" name="status" value={formData.status} onChange={handleInputChange} >
                                <option value="Ativo">Ativo</option>
                                <option value="Em análise">Em análise</option>
                                <option value="Arquivado">Arquivado</option>
                                <option value="Aguardando Documentos">Aguardando Documentos</option>
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
                    <div className="modal-footer"> <button type="button" className="cancel-btn" onClick={onClose} disabled={isSaving}>Cancelar</button> <button type="submit" className="save-btn" disabled={isSaving}> {isSaving ? 'Salvando...' : 'Salvar Processo'} </button> </div>
                </form>
            </div>
        </div>
    );
}

export default AddProcessoModal;
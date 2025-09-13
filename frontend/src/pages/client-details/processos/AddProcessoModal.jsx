import React, { useState } from 'react';
import { db } from '../../../firebase-config/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { IMaskInput } from 'react-imask';
import './AddProcessoModal.css';

function AddProcessoModal({ client, onClose, onProcessoAdded }) {
    const initialState = {
        numeroProcesso: '',
        tipoBeneficio: '', // Campo alterado
        status: 'Ativo',
        nit: client?.NIT || '', // Novo campo, preenchido com o do cliente se existir
        nb: '', // Novo campo (Número do Benefício)
        dataInicio: '',
        faseAtual: '',
        poloAtivo: client?.NOMECLIENTE || '',
        poloPassivo: 'INSS', // Padrão para área previdenciária
    };

    const [formData, setFormData] = useState(initialState);
    const [isSaving, setIsSaving] = useState(false);

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
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'processos'), {
                ...formData,
                clientId: client.id,
                // Mantém o nome do campo como 'areaDireito' no banco para consistência, mas com o valor do tipo de benefício
                areaDireito: formData.tipoBeneficio, 
                dataInicio: new Date(formData.dataInicio), 
                createdAt: serverTimestamp(),
            });
            Swal.fire('Sucesso!', 'Processo adicionado com sucesso!', 'success');
            onProcessoAdded();
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
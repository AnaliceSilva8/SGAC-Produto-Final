import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config/config';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import './ClientDetailsPage.css';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import ObservationsTab from './ObservationsTab'; // 1. IMPORTAR O NOVO COMPONENTE

// Funções de validação e formatação (exatamente como no seu código)
function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  cpf = cpf.split('').map(el => +el);
  const rest = (count) => (cpf.slice(0, count).reduce((soma, el, index) => soma + el * (count + 1 - index), 0) * 10) % 11 % 10;
  return rest(9) === cpf[9] && rest(10) === cpf[10];
}

const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
};

function ClientDetailsPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dadosPessoais'); // 2. ESTADO PARA CONTROLAR A ABA ATIVA

  // Todas as suas funções (fetchClient, useEffects, handleInputChange, etc.) permanecem exatamente as mesmas
  const fetchClient = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'clientes', clientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setClientData(data);
        setFormData(data);
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [clientId]);
  
  useEffect(() => {
    if (isEditing && formData.DATANASCIMENTO) {
        const birthDate = new Date(formData.DATANASCIMENTO);
        if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
            setFormData(prevState => ({ ...prevState, IDADE: age >= 0 ? age.toString() : '' }));
        }
    }
  }, [formData.DATANASCIMENTO, isEditing]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (errors[id]) setErrors(prev => ({...prev, [id]: null}));
    const numericFields = ['RG', 'NUMERO', 'CNH', 'CTPS', 'NIT'];
    if (numericFields.includes(id)) {
      if (/^\d*$/.test(value)) {
        setFormData(prevState => ({ ...prevState, [id]: value }));
      }
    } else {
      setFormData(prevState => ({ ...prevState, [id]: value }));
    }
  };

  const handleMaskedInputChange = (value, fieldId) => {
    if (errors[fieldId]) setErrors(prev => ({...prev, [fieldId]: null}));
    setFormData(prevState => ({ ...prevState, [fieldId]: value }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.DATANASCIMENTO) {
        newErrors.DATANASCIMENTO = "Data de nascimento é obrigatória.";
    } else {
        const birthDate = new Date(formData.DATANASCIMENTO);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (birthDate > today) {
            newErrors.DATANASCIMENTO = "A data de nascimento não pode ser futura.";
        }
    }
    if (formData.CPF && !isValidCPF(formData.CPF)) {
        newErrors.CPF = "O CPF digitado é inválido.";
    }
    if (formData.NUMERO && formData.NUMERO.length > 0 && !/^\d+$/.test(formData.NUMERO)) {
        newErrors.NUMERO = "Este campo aceita apenas números.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      alert("Por favor, corrija os erros indicados.");
      return;
    }
    try {
      const docRef = doc(db, 'clientes', clientId);
      await updateDoc(docRef, formData);
      setClientData(formData);
      setIsEditing(false);
      alert("Dados salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      alert("Falha ao salvar os dados.");
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData(clientData);
    setErrors({});
  };

  const handleDeleteClient = async () => {
    try {
      const docRef = doc(db, 'clientes', clientId);
      await deleteDoc(docRef);
      alert("Cliente excluído com sucesso.");
      navigate('/dashboard'); // Redireciona para o dashboard após a exclusão
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      alert("Falha ao excluir o cliente.");
    }
  };

  if (loading) return <div className="loading-container">Carregando ficha...</div>;
  if (!clientData) return <div className="loading-container">Cliente não encontrado.</div>;

  const renderField = (label, id, type = 'text') => {
    // Sua função renderField permanece intacta
    const selectFields = {
        ESTADOCIVIL: [ {value: "", label: "Selecione..."}, {value: "Solteiro(a)", label: "Solteiro(a)"}, {value: "Casado(a)", label: "Casado(a)"}, {value: "Divorciado(a)", label: "Divorciado(a)"}, {value: "Viúvo(a)", label: "Viúvo(a)"} ],
        SEXO: [ {value: "", label: "Selecione..."}, {value: "Feminino", label: "Feminino"}, {value: "Masculino", label: "Masculino"} ],
        ESCOLARIDADE: [ {value: "", label: "Selecione..."}, {value: "Sem escolaridade", label: "Sem escolaridade"}, {value: "Ensino Fundamental Incompleto", label: "Ensino Fundamental Incompleto"}, {value: "Ensino Fundamental Completo", label: "Ensino Fundamental Completo"}, {value: "Ensino Médio Incompleto", label: "Ensino Médio Incompleto"}, {value: "Ensino Médio Completo", label: "Ensino Médio Completo"}, {value: "Superior Incompleto", label: "Superior Incompleto"}, {value: "Superior Completo", label: "Superior Completo"}, {value: "Pós-graduação", label: "Pós-graduação"} ]
    };
    const maskedFields = { CPF: "000.000.000-00", TELEFONE: "(00) 00000-0000", CEP: "00000-000" };

    return (
        <div className="data-field">
            <label>{label}</label>
            {isEditing ? (
                <>
                    {selectFields[id] ? (
                        <select id={id} value={formData[id] || ''} onChange={handleInputChange}>
                            {selectFields[id].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : maskedFields[id] ? (
                        <IMaskInput
                            mask={maskedFields[id]} id={id} value={formData[id] || ''}
                            onAccept={(value) => handleMaskedInputChange(value, id)} className="input-style"
                        />
                    ) : (
                        <input id={id} type={type} value={formData[id] || ''} onChange={handleInputChange} disabled={id === 'IDADE'}/>
                    )}
                    {errors[id] && <p className="error-text" style={{color: 'red', fontSize: '0.8rem', marginTop: '4px'}}>{errors[id]}</p>}
                </>
            ) : (
                <p>{id === 'DATANASCIMENTO' ? formatDate(clientData[id]) : (clientData[id] || 'N/A')}</p>
            )}
        </div>
    );
  };

  return (
    <>
      <div className="client-details-wrapper">
        {/* 3. NAVEGAÇÃO DAS ABAS - AGORA INTERATIVA */}
        <nav className="tabs-nav">
            <button className={`tab-button ${activeTab === 'dadosPessoais' ? 'active' : ''}`} onClick={() => setActiveTab('dadosPessoais')}>Dados Pessoais</button>
            <button className={`tab-button ${activeTab === 'documentos' ? 'active' : ''}`} onClick={() => setActiveTab('documentos')}>Documentos</button>
            <button className={`tab-button ${activeTab === 'observacoes' ? 'active' : ''}`} onClick={() => setActiveTab('observacoes')}>Observações</button>
            <button className={`tab-button ${activeTab === 'processos' ? 'active' : ''}`} onClick={() => setActiveTab('processos')}>Processos</button>
        </nav>

        {/* 4. RENDERIZAÇÃO CONDICIONAL DO CONTEÚDO */}
        <div className="tab-content">
            {activeTab === 'dadosPessoais' && (
                <>
                    <div className="data-grid full-width-grid">
                        {renderField("Nome Completo", "NOMECLIENTE")}
                        {renderField("CPF", "CPF", "masked")}
                        {renderField("Data de Nascimento", "DATANASCIMENTO", "date")}
                        {renderField("Idade", "IDADE")}
                        {renderField("RG", "RG")}
                        {renderField("Sexo", "SEXO")}
                        {renderField("Profissão", "PROFISSAO")}
                        {renderField("Estado Civil", "ESTADOCIVIL")}
                        {renderField("Escolaridade", "ESCOLARIDADE")}
                        {renderField("Telefone", "TELEFONE", "masked")}
                        {renderField("E-mail", "EMAIL", "email")}
                        {renderField("Senha GOV", "SENHA_GOV")}
                        {renderField("CEP", "CEP", "masked")}
                        {renderField("Estado", "ESTADO")}
                        {renderField("Cidade", "CIDADE")}
                        {renderField("Bairro", "BAIRRO")}
                        {renderField("Rua", "RUA")}
                        {renderField("Número", "NUMERO")}
                        {renderField("Complemento", "COMPLEMENTO")}
                        {renderField("CNH", "CNH")}
                        {renderField("CTPS", "CTPS")}
                        {renderField("NIT", "NIT")}
                    </div>
                
                    <div className="action-buttons">
                        {isEditing ? (
                            <>
                                <button className="action-btn primary" onClick={handleSave}>Salvar Alterações</button>
                                <button className="action-btn" onClick={handleCancelEdit}>Cancelar</button>
                            </>
                        ) : (
                            <>
                                <button className="action-btn primary" onClick={() => setIsEditing(true)}>Editar Dados</button>
                                <button className="action-btn delete" onClick={() => setIsDeleteModalOpen(true)}>Excluir Cliente</button>
                                <button className="action-btn">Gerar Contratos</button>
                            </>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'observacoes' && <ObservationsTab client={clientData} />}

            {activeTab === 'documentos' && <div><h4>Funcionalidade de Documentos em construção.</h4></div>}
            {activeTab === 'processos' && <div><h4>Funcionalidade de Processos em construção.</h4></div>}
        </div>
      </div>

      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          clientName={clientData.NOMECLIENTE}
          onConfirm={handleDeleteClient}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </>
  );
}

export default ClientDetailsPage;
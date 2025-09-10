// frontend/src/pages/client-details/ClientDetailsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../../firebase-config/config';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { IMaskInput } from 'react-imask';
import Swal from 'sweetalert2';
import { FaUserCircle } from 'react-icons/fa';
import './ClientDetailsPage.css';
import ObservationsTab from './ObservationsTab';
import DocumentsTab from './DocumentsTab';
import HistoricoCompletoTab from './HistoricoCompletoTab';
import { logHistoryEvent } from '../../utils/historyLogger';
import GenerateContractModal from '../../components/modals/GenerateContractModal';

// Funções de validação e formatação (sem alterações)
function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  const cpfArray = cpf.split('').map(el => +el);
  const rest = (count) => (cpfArray.slice(0, count).reduce((soma, el, index) => soma + el * (count + 1 - index), 0) * 10) % 11 % 10;
  return rest(9) === cpfArray[9] && rest(10) === cpfArray[10];
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
    // --- CORREÇÃO FINAL: Usamos um único estado para os dados do cliente e um estado separado para o formulário de edição ---
    const [client, setClient] = useState(null); 
    const [formData, setFormData] = useState(null); // Estado apenas para o formulário de edição
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState('dadosPessoais');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [user] = useAuthState(auth);
    const [userInfo, setUserInfo] = useState(null);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);

    const fetchClient = useCallback(async () => {
        if (!clientId) return;
        try {
            setLoading(true);
            const docRef = doc(db, 'clientes', clientId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setClient(data); // Armazena os dados originais, incluindo o ID
                setFormData(data); // Inicializa o formulário com os dados
            } else {
                Swal.fire("Erro", "Cliente não encontrado.", "error");
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Erro ao buscar cliente:", error);
        } finally {
            setLoading(false);
        }
    }, [clientId, navigate]);

    useEffect(() => {
        fetchClient();
    }, [fetchClient]);
    
    useEffect(() => {
        const fetchUserInfo = async () => {
          if (user) {
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) { setUserInfo(userDoc.data()); }
          }
        };
        fetchUserInfo();
    }, [user]);
    
    useEffect(() => {
        if (isEditing && formData?.DATANASCIMENTO) {
            const birthDate = new Date(formData.DATANASCIMENTO);
            if (!isNaN(birthDate.getTime())) {
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
                setFormData(prevState => ({ ...prevState, IDADE: age >= 0 ? age.toString() : '' }));
            }
        }
    }, [formData?.DATANASCIMENTO, isEditing]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        if (errors[id]) setErrors(prev => ({...prev, [id]: null}));
        setFormData(prevState => ({ ...prevState, [id]: value }));
    };

    const handleMaskedInputChange = (value, fieldId) => {
        if (errors[fieldId]) setErrors(prev => ({...prev, [fieldId]: null}));
        setFormData(prevState => ({ ...prevState, [fieldId]: value }));
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (formData.CPF && !isValidCPF(formData.CPF)) {
            newErrors.CPF = "O CPF digitado é inválido.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !userInfo) {
            Swal.fire('Atenção!', 'Corrija os erros ou aguarde a identificação do usuário.', 'warning');
            return;
        }
        try {
            const dataToSave = { ...formData };
            if (photoFile) {
                const storageRef = ref(storage, `clientes/${clientId}/profilePicture.jpg`);
                await uploadBytes(storageRef, photoFile);
                dataToSave.photoURL = await getDownloadURL(storageRef);
            }
            const docRef = doc(db, 'clientes', clientId);
            delete dataToSave.id; // Remove o ID antes de salvar no Firestore
            await updateDoc(docRef, dataToSave);
            
            const responsavel = userInfo.nome || user.email;
            await logHistoryEvent(clientId, 'Dados Pessoais Editados', responsavel);

            setIsEditing(false);
            setPhotoFile(null);
            setPhotoPreview(null);
            Swal.fire('Sucesso!', 'Dados salvos com sucesso!', 'success');
            fetchClient(); // Re-busca os dados para garantir consistência
        } catch (error) {
            Swal.fire('Erro!', 'Falha ao salvar os dados.', 'error');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData(client); // Restaura o formulário com os dados originais
        setErrors({});
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const handleDeleteClient = async () => {
        if (!userInfo) {
            Swal.fire("Erro!", "Não foi possível identificar o usuário para registrar a ação.", "error");
            return;
        }
        try {
            const docRef = doc(db, 'clientes', clientId);
            await deleteDoc(docRef);
            await logHistoryEvent(clientId, 'Cliente Excluído', userInfo.nome || user.email);
            await Swal.fire('Excluído!', 'O cliente foi excluído com sucesso.', 'success');
            navigate('/dashboard');
        } catch (error) {
            Swal.fire('Erro!', 'Falha ao excluir o cliente.', 'error');
        }
    };

    const confirmDelete = () => {
        Swal.fire({
            title: `Excluir ${client.NOMECLIENTE}?`,
            text: "Esta ação não pode ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                handleDeleteClient();
            }
        });
    };

    const renderField = (label, id, options = {}) => {
        const { type = 'text', mask, selectOptions } = options;
        const valueToDisplay = isEditing ? formData[id] : client[id];
        const displayValue = id === 'DATANASCIMENTO' && !isEditing ? formatDate(valueToDisplay) : valueToDisplay;
        return (
            <div className="data-field">
                <label>{label}</label>
                {isEditing ? (
                    <>
                        {selectOptions ? (
                            <select id={id} value={formData[id] || ''} onChange={handleInputChange}>
                                {selectOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        ) : mask ? (
                            <IMaskInput
                                mask={mask} id={id} value={formData[id] || ''}
                                onAccept={(val) => handleMaskedInputChange(val, id)}
                                className="input-style"
                            />
                        ) : (
                            <input
                                id={id} type={type} value={formData[id] || ''}
                                onChange={handleInputChange} disabled={id === 'IDADE'}
                            />
                        )}
                        {errors[id] && <p className="error-text">{errors[id]}</p>}
                    </>
                ) : (
                    <p>{displayValue || 'N/A'}</p>
                )}
            </div>
        );
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'dadosPessoais':
                return (
                    <>
                        <div className="personal-data-layout">
                            <div className="photo-section">
                                <div className="photo-container">
                                    <img 
                                        src={photoPreview || (isEditing ? formData?.photoURL : client?.photoURL) || 'placeholder.png'}
                                        alt="Foto do Cliente" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                    />
                                    <div className="photo-placeholder" style={{ display: (photoPreview || (isEditing ? formData?.photoURL : client?.photoURL)) ? 'none' : 'flex' }}>
                                        <FaUserCircle className="photo-placeholder-icon" />
                                    </div>
                                    {isEditing && (
                                        <label htmlFor="photo-upload" className="photo-edit-overlay">
                                            Editar Foto
                                            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }}/>
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="data-grid full-width-grid">
                                {renderField("Nome Completo", "NOMECLIENTE")}
                                {renderField("CPF", "CPF", { mask: "000.000.000-00" })}
                                {renderField("Data de Nascimento", "DATANASCIMENTO", { type: 'date' })}
                                {renderField("Idade", "IDADE")}
                                {renderField("RG", "RG")}
                                {renderField("Sexo", "SEXO", { selectOptions: [ {value: "", label: "Selecione..."}, {value: "Feminino", label: "Feminino"}, {value: "Masculino", label: "Masculino"} ] })}
                                {renderField("Profissão", "PROFISSAO")}
                                {renderField("Estado Civil", "ESTADOCIVIL", { selectOptions: [ {value: "", label: "Selecione..."}, {value: "Solteiro(a)", label: "Solteiro(a)"}, {value: "Casado(a)", label: "Casado(a)"}, {value: "Divorciado(a)", label: "Divorciado(a)"}, {value: "Viúvo(a)", label: "Viúvo(a)"} ] })}
                                {renderField("Escolaridade", "ESCOLARIDADE", { selectOptions: [ {value: "", label: "Selecione..."}, {value: "Sem escolaridade", label: "Sem escolaridade"}, {value: "Ensino Fundamental Incompleto", label: "Ensino Fundamental Incompleto"}, {value: "Ensino Fundamental Completo", label: "Ensino Fundamental Completo"}, {value: "Ensino Médio Incompleto", label: "Ensino Médio Incompleto"}, {value: "Ensino Médio Completo", label: "Ensino Médio Completo"}, {value: "Superior Incompleto", label: "Superior Incompleto"}, {value: "Superior Completo", label: "Superior Completo"}, {value: "Pós-graduação", label: "Pós-graduação"} ] })}
                                {renderField("Telefone", "TELEFONE", { mask: "(00) 00000-0000" })}
                                {renderField("E-mail", "EMAIL", { type: 'email' })}
                                {renderField("Senha GOV", "SENHA_GOV")}
                                {renderField("CEP", "CEP", { mask: "00000-000" })}
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
                                    <button className="action-btn delete" onClick={confirmDelete}>Excluir Cliente</button>
                                    <button className="action-btn" onClick={() => setIsContractModalOpen(true)}>Gerar Contratos</button>
                                </>
                            )}
                        </div>
                    </>
                );
            case 'documentos':
                return <DocumentsTab client={client} onDataChange={fetchClient} />;
            case 'observacoes':
                return <ObservationsTab client={client} />;
            case 'processos':
                return <div><h4>Funcionalidade de Processos em construção.</h4></div>;
            case 'historico':
                return <HistoricoCompletoTab client={client} />;
            default:
                return null;
        }
    };

    if (loading) return <div className="loading-container">Carregando ficha...</div>;
    if (!client) return <div className="loading-container">Cliente não encontrado.</div>;

    return (
        <div className="client-details-wrapper">
            <nav className="tabs-nav">
                <button className={`tab-button ${activeTab === 'dadosPessoais' ? 'active' : ''}`} onClick={() => setActiveTab('dadosPessoais')}>Dados Pessoais</button>
                <button className={`tab-button ${activeTab === 'documentos' ? 'active' : ''}`} onClick={() => setActiveTab('documentos')}>Documentos</button>
                <button className={`tab-button ${activeTab === 'observacoes' ? 'active' : ''}`} onClick={() => setActiveTab('observacoes')}>Observações</button>
                <button className={`tab-button ${activeTab === 'processos' ? 'active' : ''}`} onClick={() => setActiveTab('processos')}>Processos</button>
                <button className={`tab-button ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}>Histórico Completo</button>
            </nav>

            <div className="tab-content">
                {renderContent()}
            </div>

            {isContractModalOpen && (
                <GenerateContractModal
                    client={client} // Sempre passamos o estado 'client', que garantidamente tem o ID
                    onClose={() => setIsContractModalOpen(false)}
                    onContractsGenerated={fetchClient}
                />
            )}
        </div>
    );
}

export default ClientDetailsPage;
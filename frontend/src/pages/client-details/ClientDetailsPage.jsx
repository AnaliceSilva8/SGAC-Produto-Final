import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db, storage, auth } from '../../firebase-config/config';

// --- ALTERAÇÃO AQUI: 'deleteObject' foi REMOVIDO desta linha ---
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, onSnapshot } from 'firebase/firestore'; 
// --- ALTERAÇÃO AQUI: 'deleteObject' (e 'ref') vêm do storage ---
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 

import { useAuthState } from 'react-firebase-hooks/auth';
import { IMaskInput } from 'react-imask';
import Swal from 'sweetalert2';
import { FaUserCircle } from 'react-icons/fa';
import './ClientDetailsPage.css';
import ObservationsTab from './ObservationsTab';
import DocumentsTab from './DocumentsTab';
import { logHistoryEvent } from '../../utils/historyLogger';
import GenerateContractModal from '../../components/modals/GenerateContractModal';
import ProcessosTab from './processos/ProcessosTab';
import { useHelp } from '../../contexto/HelpContext';
import { useUserRole } from '../../hooks/useUserRole';

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

// Funções (isValidCPF, formatDate, profissoesComuns) - Sem alterações
function isValidCPF(cpf) { /* ...código igual... */ if (typeof cpf !== 'string') return false; cpf = cpf.replace(/[^\d]+/g, ''); if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false; const cpfArray = cpf.split('').map(el => +el); const rest = (count) => (cpfArray.slice(0, count).reduce((soma, el, index) => soma + el * (count + 1 - index), 0) * 10) % 11 % 10; return rest(9) === cpfArray[9] && rest(10) === cpfArray[10];}
const formatDate = (dateString) => { /* ...código igual... */ if (!dateString || typeof dateString !== 'string') return ''; const parts = dateString.split('-'); if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`; return dateString;};
const profissoesComuns = [ /* ...lista igual... */ "Advogado(a)", "Agricultor(a)", "Aposentado(a)", "Autônomo(a)", "Auxiliar Administrativo", "Bóia-fria", "Caixa", "Caseiro(a)", "Comerciante", "Costureira", "Cozinheiro(a)", "Diarista", "Doméstica", "Dona de Casa", "Eletricista", "Empresário(a)", "Enfermeiro(a)", "Estudante", "Funcionário(a) Público(a)", "Garçom / Garçonete", "Gari", "Lavrador(a)", "Manicure / Pedicure", "Mecânico(a)", "Médico(a)", "Motorista", "Operador(a) de Máquinas", "Padeiro(a)", "Pedreiro(a)", "Pensionista", "Pescador(a)", "Professor(a)", "Serviços Gerais", "Técnico(a) em Enfermagem", "Tratorista", "Vendedor(a)", "Zelador(a)",].sort();

function ClientDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Estados (sem alterações na declaração)
    const [client, setClient] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState(() => location.state?.defaultTab || 'dadosPessoais');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [user] = useAuthState(auth);
    const [userInfo, setUserInfo] = useState(null);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [showOutraProfissaoEdit, setShowOutraProfissaoEdit] = useState(false);
    const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);

    const { setHelpContent } = useHelp();
    const { role } = useUserRole();
    

    // Este useEffect ATUALIZA a ajuda conforme a ABA muda
    useEffect(() => {
        let helpText = '';
        switch (activeTab) {
            case 'dadosPessoais':
                helpText = `
                    <h2>Ajuda: Ficha do Cliente</h2>
                    <p>Aqui você vê todas as informações pessoais e de contato do cliente.</p>
                    <ul>
                        <li><strong>Editar Dados:</strong> Habilita a edição de todos os campos e da foto do cliente.</li>
                        <li><strong>Excluir Cliente:</strong> Remove permanentemente o cliente do sistema (ação irreversível).</li>
                        <li><strong>Gerar Contratos:</strong> Abre um modal para selecionar e gerar documentos PDF (como procuração, contrato de honorários, etc.) com base nos dados do cliente.</li>
                    </ul>
                `;
                break;
            case 'documentos':
                helpText = `
                    <h2>Ajuda: Documentos do Cliente</h2>
                    <p>Esta aba armazena os documentos gerais do cliente (Ex: RG, CPF, Comprovante de Residência).</p>
                    <p><strong>Diferença:</strong> Documentos específicos de um processo (como um laudo ou petição) devem ser anexados dentro da aba "Processos", no detalhe do processo correspondente.</p>
                `;
                break;
            case 'observacoes':
                helpText = `
                    <h2>Ajuda: Observações</h2>
                    <p>Use esta área como um histórico de contatos e anotações rápidas sobre o cliente. Tudo o que for salvo aqui não pode ser editado, garantindo a integridade do histórico.</p>
                `;
                break;
            case 'processos':
                helpText = `
                    <h2>Ajuda: Processos</h2>
                    <p>Lista todos os processos (judiciais ou administrativos) vinculados a este cliente.</p>
                    <ul>
                        <li><strong>+ Adicionar Processo:</strong> Abre o formulário para criar um novo processo para este cliente.</li>
                        <li><strong>Clicar no Processo:</strong> Abre a tela de "Detalhes do Processo".</li>
                        <li><strong>Lixeira (Admin):</strong> Permite excluir um processo (ação irreversível).</li>
                    </ul>
                `;
                break;
            default:
                helpText = '<h2>Ajuda</h2><p>Selecione uma aba para ver a ajuda contextual.</p>';
        }
        setHelpContent(helpText);

    }, [activeTab, setHelpContent]); // Depende da 'activeTab'

    // Este useEffect limpa a ajuda ao SAIR da página inteira
    useEffect(() => {
        return () => {
            setHelpContent(null);
        };
    }, [setHelpContent]); 


    // fetchClient (resetar photoMarkedForRemoval)
    const fetchClient = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const docRef = doc(db, 'clientes', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setClient(data);
                setFormData(data);
                setPhotoMarkedForRemoval(false); 
            } else { 
                Toast.fire({ icon: "error", title: "Cliente não encontrado." }); 
                navigate("/");
            }
        } catch (error) { console.error("Erro ao buscar cliente:", error); } finally { setLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchClient(); }, [fetchClient]);
    useEffect(() => { /* fetchUserInfo igual */ const fetchUserInfo = async () => { if (user) { const userDocRef = doc(db, 'usuarios', user.uid); const userDoc = await getDoc(userDocRef); if (userDoc.exists()) { setUserInfo(userDoc.data()); } } }; fetchUserInfo(); }, [user]);
    useEffect(() => { /* calcular idade igual */ if (isEditing && formData?.DATANASCIMENTO) { const birthDate = new Date(formData.DATANASCIMENTO); if (!isNaN(birthDate.getTime())) { const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } setFormData(prevState => ({ ...prevState, IDADE: age >= 0 ? age.toString() : '' })); } } }, [formData?.DATANASCIMENTO, isEditing]);


    // useEffect para preparar estado da edição
    useEffect(() => {
        if (isEditing && client) {
             if (!formData || formData.id !== client.id || formData !== client) { 
                 setFormData(client);
                 setPhotoMarkedForRemoval(false); 
                 setPhotoPreview(null);
                 setPhotoFile(null);
                const currentProfissao = client.PROFISSAO;
                setShowOutraProfissaoEdit(Boolean(currentProfissao && !profissoesComuns.includes(currentProfissao)));
            }
        } else if (!isEditing && client) {
            setShowOutraProfissaoEdit(false);
            setErrors({});
            setPhotoMarkedForRemoval(false); 
            setPhotoPreview(null);
            setPhotoFile(null);
            if (client) setFormData(client); 
        }
    }, [isEditing, client]);


    // Handlers de input (handleInputChange, handleMaskedInputChange, handleProfissaoSelectChangeEdit) - Sem alterações
    const handleInputChange = (e) => { /* ...código igual... */ const { id, value } = e.target; if (id === 'PROFISSAO' && errors.PROFISSAO) setErrors(prev => ({...prev, PROFISSAO: null})); else if (errors[id]) setErrors(prev => ({...prev, [id]: null})); setFormData(prevState => ({ ...prevState, [id]: value })); };
    const handleMaskedInputChange = (value, fieldId) => { /* ...código igual... */ if (errors[fieldId]) setErrors(prev => ({...prev, [fieldId]: null})); setFormData(prevState => ({ ...prevState, [fieldId]: value })); };
    const handleProfissaoSelectChangeEdit = (e) => { /* ...código igual... */ const { value } = e.target; const isOutra = value === 'Outra...'; setShowOutraProfissaoEdit(isOutra); setFormData(prevState => ({ ...prevState, PROFISSAO: isOutra ? '' : value })); if (errors.PROFISSAO || errors.PROFISSAO_SELECT) { setErrors(prev => ({...prev, PROFISSAO: null, PROFISSAO_SELECT: null})); } };

    // handlePhotoSelect (resetar photoMarkedForRemoval)
    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setPhotoMarkedForRemoval(false); 
        }
    };

    // (Esta é a confirmação de remoção de foto, que DEVE ser um modal)
    const handleRemovePhotoClick = () => {
        Swal.fire({
            title: 'Remover Foto?',
            text: "A foto será removida ao salvar as alterações.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, remover!', cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setPhotoMarkedForRemoval(true); 
                setPhotoPreview(null); 
                setPhotoFile(null); 
            }
        });
    }

    // validateForm (sem alterações)
    const validateForm = () => { /* ...código igual... */ const newErrors = {}; if (formData.CPF && !isValidCPF(formData.CPF)) { newErrors.CPF = "O CPF digitado é inválido."; } const selectElement = document.getElementById('PROFISSAO_SELECT'); const selectValue = selectElement ? selectElement.value : ''; if (selectValue === 'Outra...' && !formData.PROFISSAO?.trim()) { newErrors.PROFISSAO = "Digite a profissão."; } setErrors(newErrors); return !newErrors.CPF && !newErrors.PROFISSAO; };


    const handleSave = async () => {
        if (!validateForm() || !userInfo) {
            Toast.fire({ icon: 'warning', title: 'Corrija os erros antes de salvar.' });
            return;
        }
        try {
            setLoading(true); // Adiciona o loading
            const dataToSave = { ...formData };
            const photoPathInStorage = `clientes/${id}/profilePicture.jpg`;
            let photoToDeletePath = null; 

             if (document.getElementById('PROFISSAO_SELECT')?.value === "") {
                 dataToSave.PROFISSAO = "";
             }

            // Lógica da foto:
            if (photoFile) {
                if (client?.photoURL) { 
                    photoToDeletePath = photoPathInStorage; 
                }
                const storageRef = ref(storage, photoPathInStorage);
                await uploadBytes(storageRef, photoFile);
                dataToSave.photoURL = await getDownloadURL(storageRef); 
                console.log("Nova foto salva:", dataToSave.photoURL);

            } else if (photoMarkedForRemoval) {
                if (client?.photoURL) { 
                    photoToDeletePath = photoPathInStorage; 
                }
                dataToSave.photoURL = null; 
                console.log("Foto marcada para remoção.");

            } else {
                console.log("Nenhuma alteração na foto.");
            }

            // Atualiza o Firestore
            const docRef = doc(db, 'clientes', id);
            delete dataToSave.id;
            await updateDoc(docRef, dataToSave);
            console.log("Firestore atualizado.");

            // Deleta a foto antiga do Storage SE necessário
            if (photoToDeletePath) {
                try {
                    const oldStorageRef = ref(storage, photoToDeletePath);
                    await deleteObject(oldStorageRef);
                    console.log("Foto antiga/removida deletada do Storage:", photoToDeletePath);
                } catch (storageError) {
                    console.warn("Aviso: Falha ao deletar foto do Storage.", storageError);
                }
            }

            const responsavel = userInfo.nome || user.email;
            await logHistoryEvent(id, 'Dados Pessoais Editados', responsavel);
            setIsEditing(false);
            
            Toast.fire({ icon: 'success', title: 'Dados salvos com sucesso!' });
            
            setClient({ ...dataToSave, id: id }); 

        } catch (error) {
            console.error("Erro detalhado ao salvar:", error);
            Toast.fire({ icon: 'error', title: `Falha ao salvar: ${error.message}` });
        } finally {
            setLoading(false); // Remove o loading
        }
    };


    const handleCancelEdit = () => {
        setIsEditing(false);
        // O reset já é feito pelo useEffect [isEditing, client]
    };


    const handleDeleteClient = async () => { 
        if (!userInfo) { 
            Toast.fire({ icon: "error", title: "Usuário não identificado. Tente novamente." }); 
            return; 
        } 
        try { 
            const docRef = doc(db, 'clientes', id); 
            await deleteDoc(docRef); 
            if (client?.photoURL) { 
                try { 
                    const photoRef = ref(storage, `clientes/${id}/profilePicture.jpg`); 
                    await deleteObject(photoRef); 
                } catch (storageError) { 
                    console.warn("...", storageError); 
                } 
            } 
            await logHistoryEvent(id, 'Cliente Excluído', userInfo.nome || user.email); 
            
            await Toast.fire({ icon: 'success', title: 'Cliente excluído com sucesso.' }); 
            
            navigate('/'); 
        } catch (error) { 
            Toast.fire({ icon: 'error', title: 'Falha ao excluir o cliente.' }); 
        } 
    };
    
    // (Esta é a confirmação de exclusão, que DEVE ser um modal)
    const confirmDelete = () => { 
        Swal.fire({ 
            title: `Excluir ${client.NOMECLIENTE}?`, 
            text: "Esta ação não pode ser revertida e excluirá todos os dados!", 
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


    // renderField (sem alterações na função em si)
    const renderField = (label, fieldId, options = {}) => { 
        const { type = 'text', mask, selectOptions } = options; 
        const valueForDisplay = client?.[fieldId]; 
        const valueForEdit = formData?.[fieldId]; 
        const displayValue = fieldId === 'DATANASCIMENTO' && !isEditing ? formatDate(valueForDisplay) : valueForDisplay; 
        
        if (!isEditing && !displayValue) { return null; } 
        
        if (isEditing && fieldId === 'PROFISSAO') { 
            let selectValue = ""; 
            if (valueForEdit) { // Se temos um valor no form
                if (profissoesComuns.includes(valueForEdit)) { 
                    selectValue = valueForEdit; // "Advogado(a)"
                } else { 
                    selectValue = 'Outra...'; // "Marceneiro"
                }
            } else if (showOutraProfissaoEdit) {
                 // Se o valor é '' (vazio) MAS o input "Outra" está visível
                 selectValue = 'Outra...';
            }
            // Se for '' e showOutraProfissaoEdit for false, selectValue continua "" ("Selecione...")

            return ( 
                <div className="data-field"> 
                    <label htmlFor="PROFISSAO_SELECT">Profissão</label> 
                    <select id="PROFISSAO_SELECT" value={selectValue} onChange={handleProfissaoSelectChangeEdit}> 
                        <option value="">Selecione...</option> 
                        {profissoesComuns.map(prof => (<option key={prof} value={prof}>{prof}</option>))} 
                        <option value="Outra...">Outra...</option> 
                    </select> 
                    {showOutraProfissaoEdit && ( 
                        // Se o valor for "Outra...", o input começa vazio
                        <input id="PROFISSAO" type="text" value={profissoesComuns.includes(valueForEdit) ? '' : (valueForEdit || '')} onChange={handleInputChange} placeholder="Digite a profissão..." style={{ marginTop: '5px' }} /> 
                    )} 
                    {errors.PROFISSAO && <p className="error-text">{errors.PROFISSAO}</p>} 
                </div> 
            ); 
        } 
        
        return ( 
            <div className="data-field"> 
                <label>{label}</label> 
                {isEditing ? ( 
                    <> 
                        {selectOptions ? ( 
                            <select id={fieldId} value={valueForEdit || ''} onChange={handleInputChange}> 
                                <option value="">Selecione...</option> 
                                {selectOptions.filter(opt => opt.value !== "").map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} 
                            </select> 
                        ) : mask ? ( 
                            <IMaskInput mask={mask} id={fieldId} value={valueForEdit || ''} onAccept={(val) => handleMaskedInputChange(val, fieldId)} className="input-style"/> 
                        ) : ( 
                            <input id={fieldId} type={type} value={valueForEdit || ''} onChange={handleInputChange} disabled={fieldId === 'IDADE'}/> 
                        )} 
                        {errors[fieldId] && <p className="error-text">{errors[fieldId]}</p>} 
                    </> 
                ) : ( 
                    <p title={displayValue}>{displayValue}</p> 
                )} 
            </div> 
        ); 
    };


    const renderContent = () => {
        switch (activeTab) {
            case 'dadosPessoais':
                let displayPhotoUrl = null;
                if (photoPreview) {
                    displayPhotoUrl = photoPreview; 
                } else if (!photoMarkedForRemoval) {
                    displayPhotoUrl = formData?.photoURL || null; 
                }

                return (
                    <>
                        <div className="personal-data-layout">
                            <div className="photo-section">
                                <div className="photo-container">
                                    {displayPhotoUrl ? (
                                        <img src={displayPhotoUrl} alt="Foto do Cliente" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                                    ) : (
                                         <div className="photo-placeholder" style={{ display: 'flex' }}>
                                             <FaUserCircle className="photo-placeholder-icon" />
                                         </div>
                                    )}

                                    {isEditing && (
                                        <>
                                            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }}/>
                                            <label
                                                htmlFor={!displayPhotoUrl ? "photo-upload" : ""}
                                                className="photo-edit-overlay"
                                                onClick={displayPhotoUrl ? handleRemovePhotoClick : null}
                                                style={{cursor: 'pointer'}}
                                            >
                                                {displayPhotoUrl ? "Remover Foto" : "Adicionar Foto"}
                                            </label>
                                        </>
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
                                    <button className="action-btn primary" onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
                                    <button className="action-btn" onClick={handleCancelEdit}>Cancelar</button>
                                </>
                            ) : (
                                <>
                                    <button className="action-btn primary" onClick={() => setIsEditing(true)}>Editar Dados</button>
                                    
                                    {/* --- ALTERAÇÃO 3: Botão de excluir condicional --- */}
                                    {role === 'admin' && (
                                        <button className="action-btn delete" onClick={confirmDelete}>Excluir Cliente</button>
                                    )}
                                    {/* --- FIM DA ALTERAÇÃO --- */}

                                    <button className="action-btn" onClick={() => setIsContractModalOpen(true)}>Gerar Contratos</button>
                                </>
                            )}
                        </div>
                    </>
                );
            case 'documentos': return <DocumentsTab client={client} onDataChange={fetchClient} />;
            case 'observacoes': return <ObservationsTab client={client} />;
            case 'processos': return <ProcessosTab client={client} />;
            default: return null;
        }
    };

    // Adicionado 'loading' ao estado de carregamento
    if (loading || !formData) return <div className="loading-container">Carregando ficha...</div>;
    if (!client) return <div className="loading-container">Cliente não encontrado.</div>;


    return (
        <div className="client-details-wrapper">
            <nav className="tabs-nav"> <button className={`tab-button ${activeTab === 'dadosPessoais' ? 'active' : ''}`} onClick={() => setActiveTab('dadosPessoais')}>Dados Pessoais</button> <button className={`tab-button ${activeTab === 'documentos' ? 'active' : ''}`} onClick={() => setActiveTab('documentos')}>Documentos</button> <button className={`tab-button ${activeTab === 'observacoes' ? 'active' : ''}`} onClick={() => setActiveTab('observacoes')}>Observações</button> <button className={`tab-button ${activeTab === 'processos' ? 'active' : ''}`} onClick={() => setActiveTab('processos')}>Processos</button> </nav>
            <div className="tab-content"> {renderContent()} </div>
            {isContractModalOpen && ( <GenerateContractModal client={client} onClose={() => setIsContractModalOpen(false)} onContractsGenerated={fetchClient} /> )}
        </div>
    );
}

export default ClientDetailsPage;
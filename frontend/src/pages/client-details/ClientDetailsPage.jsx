import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db, storage, auth } from '../../firebase-config/config';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
    // --- ALTERADO: Renomeado para photoMarkedForRemoval e inicializado como false ---
    const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);


    // fetchClient (resetar photoMarkedForRemoval)
    const fetchClient = useCallback(async () => {
        // ... (lógica igual)
        if (!id) return;
        try {
            setLoading(true);
            const docRef = doc(db, 'clientes', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                setClient(data);
                setFormData(data);
                setPhotoMarkedForRemoval(false); // Reseta aqui também
            } else { /* ... erro ... */ Swal.fire("Erro", "Cliente não encontrado.", "error"); navigate("/");}
        } catch (error) { /* ... erro ... */ console.error("Erro ao buscar cliente:", error); } finally { setLoading(false); }
    }, [id, navigate]);

    useEffect(() => { fetchClient(); }, [fetchClient]);
    useEffect(() => { /* fetchUserInfo igual */ const fetchUserInfo = async () => { if (user) { const userDocRef = doc(db, 'usuarios', user.uid); const userDoc = await getDoc(userDocRef); if (userDoc.exists()) { setUserInfo(userDoc.data()); } } }; fetchUserInfo(); }, [user]);
    useEffect(() => { /* calcular idade igual */ if (isEditing && formData?.DATANASCIMENTO) { const birthDate = new Date(formData.DATANASCIMENTO); if (!isNaN(birthDate.getTime())) { const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } setFormData(prevState => ({ ...prevState, IDADE: age >= 0 ? age.toString() : '' })); } } }, [formData?.DATANASCIMENTO, isEditing]);


    // useEffect para preparar estado da edição (resetar photoMarkedForRemoval)
    useEffect(() => {
        if (isEditing && client) {
            // Sincroniza formData se necessário (ao iniciar edição)
             if (!formData || formData.id !== client.id) {
                setFormData(client);
                setPhotoMarkedForRemoval(false); // Reseta ao iniciar
                setPhotoPreview(null);
                setPhotoFile(null);
            }
            // Lógica da profissão (igual)
            const currentProfissao = formData?.PROFISSAO || client.PROFISSAO;
            setShowOutraProfissaoEdit(Boolean(currentProfissao && !profissoesComuns.includes(currentProfissao)));
        } else if (!isEditing) {
            // Resetar estados ao sair da edição
            setShowOutraProfissaoEdit(false);
            setErrors({});
            setPhotoMarkedForRemoval(false); // Reseta ao sair
            setPhotoPreview(null);
            setPhotoFile(null);
            if (client) setFormData(client); // Reseta formData
        }
    }, [isEditing, client, formData]);


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
            setPhotoMarkedForRemoval(false); // Se selecionou nova, não está mais marcada para remover
            // Não precisa mais atualizar formData aqui, handleSave fará isso
        }
    };

    // --- ALTERADO: handleRemovePhotoClick - Foca em marcar para remoção e atualizar visual ---
    const handleRemovePhotoClick = () => {
        Swal.fire({
            title: 'Remover Foto?',
            text: "A foto será removida ao salvar as alterações.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, remover!', cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setPhotoMarkedForRemoval(true); // Marca que a intenção é remover
                setPhotoPreview(null); // Remove preview visual
                setPhotoFile(null); // Descarta arquivo selecionado
                // Não precisa mais mexer no formData.photoURL aqui, handleSave cuidará disso
            }
        });
    }

    // validateForm (sem alterações)
    const validateForm = () => { /* ...código igual... */ const newErrors = {}; if (formData.CPF && !isValidCPF(formData.CPF)) { newErrors.CPF = "O CPF digitado é inválido."; } const selectElement = document.getElementById('PROFISSAO_SELECT'); const selectValue = selectElement ? selectElement.value : ''; if (selectValue === 'Outra...' && !formData.PROFISSAO?.trim()) { newErrors.PROFISSAO = "Digite a profissão."; } setErrors(newErrors); return !newErrors.CPF && !newErrors.PROFISSAO; };


    // --- ALTERADO: handleSave - Usa photoMarkedForRemoval ---
    const handleSave = async () => {
        if (!validateForm() || !userInfo) {
            Swal.fire('Atenção!', 'Corrija os erros...', 'warning');
            return;
        }
        try {
            // Inicia dataToSave com formData atual (reflete edições de texto)
            const dataToSave = { ...formData };
            const photoPathInStorage = `clientes/${id}/profilePicture.jpg`;
            let photoToDeletePath = null; // Path da foto a deletar no Storage

            // Garante que se "Selecione..." ficou no select, salvamos como vazio
             if (document.getElementById('PROFISSAO_SELECT')?.value === "") {
                 dataToSave.PROFISSAO = "";
             }

            // Lógica da foto:
            if (photoFile) {
                // 1. Nova foto foi selecionada
                if (client?.photoURL) { // Se existia uma foto original
                    photoToDeletePath = photoPathInStorage; // Marca a original para deletar
                }
                const storageRef = ref(storage, photoPathInStorage);
                await uploadBytes(storageRef, photoFile);
                dataToSave.photoURL = await getDownloadURL(storageRef); // Salva a NOVA URL
                console.log("Nova foto salva:", dataToSave.photoURL);

            } else if (photoMarkedForRemoval) {
                // 2. Nenhuma nova foto, MAS a remoção foi marcada
                if (client?.photoURL) { // Verifica se realmente havia uma foto original para deletar
                    photoToDeletePath = photoPathInStorage; // Marca para deletar
                }
                dataToSave.photoURL = null; // Define URL como nula no Firestore
                console.log("Foto marcada para remoção.");

            } else {
                // 3. Nenhuma nova foto E remoção não foi marcada
                // dataToSave.photoURL já contém a URL original (vinda do formData inicializado)
                // ou null se nunca houve foto. Nenhuma ação de Storage necessária aqui.
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

            // Log e finalização (igual)
            const responsavel = userInfo.nome || user.email;
            await logHistoryEvent(id, 'Dados Pessoais Editados', responsavel);
            setIsEditing(false);
            // Estados resetados no useEffect de isEditing
            Swal.fire('Sucesso!', 'Dados salvos com sucesso!', 'success');
            fetchClient(); // Rebusca cliente

        } catch (error) {
            console.error("Erro detalhado ao salvar:", error);
            Swal.fire('Erro!', `Falha ao salvar os dados: ${error.message}`, 'error');
        }
    };


    // handleCancelEdit (Resetar photoMarkedForRemoval)
    const handleCancelEdit = () => {
        setIsEditing(false);
        // Resetar formData é feito pelo useEffect [isEditing, client]
        // Resetar outros estados também é feito lá
    };


    // handleDeleteClient e confirmDelete (sem alterações)
    const handleDeleteClient = async () => { /* ...código igual... */ if (!userInfo) { Swal.fire("Erro!", "...", "error"); return; } try { const docRef = doc(db, 'clientes', id); await deleteDoc(docRef); if (client?.photoURL) { try { const photoRef = ref(storage, `clientes/${id}/profilePicture.jpg`); await deleteObject(photoRef); } catch (storageError) { console.warn("...", storageError); } } await logHistoryEvent(id, 'Cliente Excluído', userInfo.nome || user.email); await Swal.fire('Excluído!', '...', 'success'); navigate('/'); } catch (error) { Swal.fire('Erro!', '...', 'error'); } };
    const confirmDelete = () => { /* ...código igual... */ Swal.fire({ title: `Excluir ${client.NOMECLIENTE}?`, text: "...", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar' }).then((result) => { if (result.isConfirmed) { handleDeleteClient(); } }); };


    // renderField (sem alterações na função em si)
    const renderField = (label, fieldId, options = {}) => { /* ...código igual... */ const { type = 'text', mask, selectOptions } = options; const valueForDisplay = client?.[fieldId]; const valueForEdit = formData?.[fieldId]; const displayValue = fieldId === 'DATANASCIMENTO' && !isEditing ? formatDate(valueForDisplay) : valueForDisplay; if (!isEditing && !displayValue) { return null; } if (isEditing && fieldId === 'PROFISSAO') { let selectValue = ""; if (valueForEdit) { if (profissoesComuns.includes(valueForEdit)) { selectValue = valueForEdit; } else { selectValue = 'Outra...'; } } return ( <div className="data-field"> <label htmlFor="PROFISSAO_SELECT">Profissão</label> <select id="PROFISSAO_SELECT" value={selectValue} onChange={handleProfissaoSelectChangeEdit}> <option value="">Selecione...</option> {profissoesComuns.map(prof => (<option key={prof} value={prof}>{prof}</option>))} <option value="Outra...">Outra...</option> </select> {showOutraProfissaoEdit && ( <input id="PROFISSAO" type="text" value={valueForEdit || ''} onChange={handleInputChange} placeholder="Digite a profissão..." style={{ marginTop: '5px' }} /> )} {errors.PROFISSAO && <p className="error-text">{errors.PROFISSAO}</p>} </div> ); } return ( <div className="data-field"> <label>{label}</label> {isEditing ? ( <> {selectOptions ? ( <select id={fieldId} value={valueForEdit || ''} onChange={handleInputChange}> <option value="">Selecione...</option> {selectOptions.filter(opt => opt.value !== "").map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </select> ) : mask ? ( <IMaskInput mask={mask} id={fieldId} value={valueForEdit || ''} onAccept={(val) => handleMaskedInputChange(val, fieldId)} className="input-style"/> ) : ( <input id={fieldId} type={type} value={valueForEdit || ''} onChange={handleInputChange} disabled={fieldId === 'IDADE'}/> )} {errors[fieldId] && <p className="error-text">{errors[fieldId]}</p>} </> ) : ( <p title={displayValue}>{displayValue}</p> )} </div> ); };


    // --- ALTERADO: renderContent (lógica da foto simplificada) ---
    const renderContent = () => {
        switch (activeTab) {
            case 'dadosPessoais':
                // Determina a URL da imagem a ser exibida AGORA
                // Prioridade: Preview (nova foto) > null (se marcada para remover) > formData.photoURL (valor atual no form)
                let displayPhotoUrl = null;
                if (photoPreview) {
                    displayPhotoUrl = photoPreview; // Mostra a nova foto selecionada
                } else if (!photoMarkedForRemoval) {
                    displayPhotoUrl = formData?.photoURL || null; // Mostra a foto atual do form, a menos que marcada para remover
                }
                // Se photoMarkedForRemoval for true, displayPhotoUrl permanecerá null

                return (
                    <>
                        <div className="personal-data-layout">
                            <div className="photo-section">
                                <div className="photo-container">
                                    {/* Exibição da foto ou placeholder */}
                                    {displayPhotoUrl ? (
                                        <img src={displayPhotoUrl} alt="Foto do Cliente" onError={(e) => { /* ... */ }} />
                                    ) : (
                                         <div className="photo-placeholder" style={{ display: 'flex' }}>
                                            <FaUserCircle className="photo-placeholder-icon" />
                                        </div>
                                    )}

                                    {/* Overlay de edição */}
                                    {isEditing && (
                                        <>
                                            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }}/>
                                            <label
                                                // Se HÁ foto (E não marcada p/ remover), click remove. Senão, click abre seletor.
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
                            {/* data-grid continua igual */}
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
                        {/* action-buttons continua igual */}
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
            // Cases 'documentos', 'observacoes', 'processos' (sem alterações)
            case 'documentos': return <DocumentsTab client={client} onDataChange={fetchClient} />;
            case 'observacoes': return <ObservationsTab client={client} />;
            case 'processos': return <ProcessosTab client={client} />;
            default: return null;
        }
    };

    if (loading || !formData) return <div className="loading-container">Carregando ficha...</div>;
    if (!client) return <div className="loading-container">Cliente não encontrado.</div>;


    return (
        <div className="client-details-wrapper">
            {/* nav e modal (sem alterações) */}
            <nav className="tabs-nav"> <button className={`tab-button ${activeTab === 'dadosPessoais' ? 'active' : ''}`} onClick={() => setActiveTab('dadosPessoais')}>Dados Pessoais</button> <button className={`tab-button ${activeTab === 'documentos' ? 'active' : ''}`} onClick={() => setActiveTab('documentos')}>Documentos</button> <button className={`tab-button ${activeTab === 'observacoes' ? 'active' : ''}`} onClick={() => setActiveTab('observacoes')}>Observações</button> <button className={`tab-button ${activeTab === 'processos' ? 'active' : ''}`} onClick={() => setActiveTab('processos')}>Processos</button> </nav>
            <div className="tab-content"> {renderContent()} </div>
            {isContractModalOpen && ( <GenerateContractModal client={client} onClose={() => setIsContractModalOpen(false)} onContractsGenerated={fetchClient} /> )}
        </div>
    );
}

export default ClientDetailsPage;
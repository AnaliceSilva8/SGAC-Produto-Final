// frontend/src/pages/signup/SignUpPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Swal from 'sweetalert2';
import { IMaskInput } from 'react-imask';
import logo from '../../assets/logo.png'; // IMPORTAÇÃO DA LOGO
import './SignUpPage.css'; // O CSS para a página de cadastro

// Função para validar o CPF
function isValidCPF(cpf) {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    cpf = cpf.split('').map(el => +el);
    const rest = (count) => (cpf.slice(0, count - 12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10;
    return rest(10) === cpf[9] && rest(11) === cpf[10];
}

function SignUpPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // TEMPORÁRIO: A chave de admin agora é verificada apenas no frontend para acesso à página.
    // A função de cadastro NÃO REQUER MAIS A CHAVE para ser chamada no backend.
    const FRONTEND_ADMIN_REGISTRATION_KEY = "123456"; // Chave de verificação apenas para acesso à página
    const [pageAccessGranted, setPageAccessGranted] = useState(false);

    useEffect(() => {
        if (!location.state || location.state.verifiedAdminKey !== FRONTEND_ADMIN_REGISTRATION_KEY) {
            Swal.fire({
                title: 'Acesso Negado',
                text: 'Você deve primeiro verificar a chave de administrador na página de login.',
                icon: 'warning',
                confirmButtonText: 'OK'
            }).then(() => {
                navigate('/login');
            });
        } else {
            setPageAccessGranted(true);
        }
    }, [location, navigate]);

    const [formData, setFormData] = useState({
        email: '', password: '', nome: '', cpf: '', dataNascimento: '', cargo: ''
    });
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Funções de controle do formulário
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setErrors(prev => ({ ...prev, [id]: null }));
        if (id === 'nome' && !/^[a-zA-Z\s]*$/.test(value)) return;
        setFormData(prevState => ({ ...prevState, [id]: value }));
    };
    const handleMaskedInputChange = (value, fieldId) => {
        if (errors[fieldId]) setErrors(prev => ({ ...prev, [fieldId]: null }));
        setFormData(prevState => ({ ...prevState, [fieldId]: value }));
    };
    const validateForm = () => {
        const newErrors = {};
        for (const key in formData) { 
            if (!formData[key]) { 
                newErrors[key] = "Este campo é obrigatório."; 
            }
        }
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = "Formato de e-mail inválido."; }
        // A validação de senha no frontend deve ser flexível, pois a Cloud Function já verifica o mínimo de 6 caracteres.
        // A Cloud Function também lançará 'auth/weak-password' se não atender aos requisitos do Firebase Auth.
        if (formData.password && formData.password.length < 6) { newErrors.password = "A senha deve ter no mínimo 6 caracteres."; }
        if (formData.dataNascimento) { const birthDate = new Date(formData.dataNascimento); const today = new Date(); today.setHours(0, 0, 0, 0); if (birthDate > today) { newErrors.dataNascimento = "A data não pode ser no futuro."; } }
        if (formData.cpf && !isValidCPF(formData.cpf)) { newErrors.cpf = "CPF inválido."; }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Função de submit que chama a Cloud Function
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            Swal.fire({
                title: 'Preencha todos os campos',
                text: 'Por favor, corrija os erros no formulário antes de continuar.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }
        setIsSaving(true);
        try {
            const functions = getFunctions();
            const createNewUser = httpsCallable(functions, 'createNewUser');
            
            // --- LOGS PARA DIAGNÓSTICO ---
            // A adminKey não é mais enviada para a CF, pois a CF não a verifica mais.
            console.log("Dados do usuário sendo enviados:", formData);
            // --- FIM DOS LOGS ---

            const result = await createNewUser({
                userData: formData,
                // adminKey: adminKey // Removido o envio da adminKey
            });

            if (result.data.success) {
                Swal.fire({
                    title: 'Sucesso!',
                    text: `Usuário ${formData.nome} criado com sucesso!`,
                    icon: 'success',
                }).then(() => {
                    navigate('/login');
                });
            } else {
                throw new Error(result.data.error || 'Ocorreu um erro inesperado no servidor.');
            }
        } catch (error) {
            console.error("Erro ao chamar a Cloud Function:", error);
            let errorMessage = 'Não foi possível cadastrar o usuário. Tente novamente.';
            if (error.code === 'already-exists') {
                errorMessage = 'Este e-mail já está cadastrado.';
            } else if (error.code === 'invalid-argument' && error.message.includes('6 caracteres')) {
                errorMessage = 'A senha deve ter no mínimo 6 caracteres.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Swal.fire({
                title: 'Erro!',
                text: errorMessage,
                icon: 'error',
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Só renderiza o formulário se o acesso à página foi concedido
    if (!pageAccessGranted) {
        return null;
    }

    // --- ESTRUTURA VISUAL (JSX) ---
    return (
        <div className="main-layout-container">
            <header className="signup-header">
                <img src={logo} alt="Logo SGAC" className="signup-logo" />
            </header>
            <div className="signup-page-container">
                <div className="signup-page-content">
                    <h2 className="signup-title">Cadastro de Novo Usuário</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid-signup-page">
                            <div className="input-group">
                                <label htmlFor="email">E-mail (para login)</label>
                                <input id="email" type="email" value={formData.email} onChange={handleInputChange} />
                                {errors.email && <p className="error-text">{errors.email}</p>}
                            </div>
                            <div className="input-group">
                                <label htmlFor="password">Senha</label>
                                <input id="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="Mínimo 6 caracteres"/>
                                {errors.password && <p className="error-text">{errors.password}</p>}
                            </div>
                            <div className="input-group">
                                <label htmlFor="nome">Nome Completo</label>
                                <input id="nome" type="text" value={formData.nome} onChange={handleInputChange} />
                                {errors.nome && <p className="error-text">{errors.nome}</p>}
                            </div>
                            <div className="input-group">
                                <label htmlFor="cpf">CPF</label>
                                <IMaskInput 
                                    mask="000.000.000-00" 
                                    id="cpf" 
                                    value={formData.cpf} 
                                    onAccept={(value) => handleMaskedInputChange(value, 'cpf')} 
                                    placeholder="___.___.___-__"
                                />
                                {errors.cpf && <p className="error-text">{errors.cpf}</p>}
                            </div>
                            <div className="input-group">
                                <label htmlFor="dataNascimento">Data de Nascimento</label>
                                <input id="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} />
                                {errors.dataNascimento && <p className="error-text">{errors.dataNascimento}</p>}
                            </div>
                            <div className="input-group">
                                <label htmlFor="cargo">Cargo / Função</label>
                                <select id="cargo" value={formData.cargo} onChange={handleInputChange}>
                                    <option value="">Selecione...</option>
                                    <option value="Advogado(a)">Advogado(a)</option>
                                    <option value="Secretário(a)">Secretário(a)</option>
                                    <option value="Estagiário(a)">Estagiário(a)</option>
                                </select>
                                {errors.cargo && <p className="error-text">{errors.cargo}</p>}
                            </div>
                        </div>
                        <div className="signup-page-buttons">
                            <button type="submit" className="btn-save" disabled={isSaving}>
                                {isSaving ? 'Salvando...' : 'Cadastrar'}
                            </button>
                            <button type="button" className="btn-cancel" onClick={() => navigate('/login')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default SignUpPage;
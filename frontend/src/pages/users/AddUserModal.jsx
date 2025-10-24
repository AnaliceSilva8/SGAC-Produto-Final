// frontend/src/pages/users/AddUserModal.jsx

import React, { useState, useEffect } from 'react';
import { IMaskInput } from 'react-imask';
import Swal from 'sweetalert2';

// --- CORREÇÕES PRINCIPAIS ---
// Importa apenas a instância 'auth' necessária. 'httpsCallable' e 'functions' foram removidos.
import { auth } from '../../firebase-config/config';
import './AddUserModal.css';


// (A função validaCPF não precisa de alterações)
function validaCPF(cpf) {
    cpf = String(cpf).replace(/[^\d]+/g, '');
    if (cpf === '') return false;
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
}

function AddUserModal({ isOpen, onClose, onUserAdded }) {
    const initialFormData = {
        nome: '',
        email: '',
        cpf: '',
        dataNascimento: '',
        password: '',
        cargo: '',
        perfil: 'normal',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialFormData);
            setErrors({});
        }
    }, [isOpen]);

    // (As funções de validação e input handlers permanecem as mesmas)
    const validateField = (name, value) => {
        let errorMsg = '';
        switch (name) {
            case 'nome':
                if (!value) errorMsg = 'O nome completo é obrigatório.';
                break;
            case 'email':
                if (!value) errorMsg = 'O e-mail é obrigatório.';
                else if (!/\S+@\S+\.\S+/.test(value)) errorMsg = 'O e-mail é inválido.';
                break;
            case 'cpf':
                const numericCpf = String(value).replace(/[^\d]+/g, '');
                if (!numericCpf) errorMsg = 'O CPF é obrigatório.';
                else if (!validaCPF(numericCpf)) errorMsg = 'O CPF é inválido.';
                break;
            case 'dataNascimento':
                if (!value) {
                    errorMsg = 'A data de nascimento é obrigatória.';
                } else {
                    const dob = new Date(value + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (dob >= today) {
                        errorMsg = "A data de nascimento deve ser anterior ao dia de hoje.";
                    } else {
                        let age = today.getFullYear() - dob.getFullYear();
                        const m = today.getMonth() - dob.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                            age--;
                        }
                        if (age < 18) {
                            errorMsg = "O usuário deve ter no mínimo 18 anos.";
                        }
                    }
                }
                break;
            case 'password':
                if (!value) errorMsg = 'A senha é obrigatória.';
                else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value)) {
                    errorMsg = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
                }
                break;
            case 'cargo':
                if (!value) errorMsg = 'O cargo é obrigatório.';
                break;
            default:
                break;
        }
        return errorMsg;
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };
    const handleBlur = (e) => {
        const { name, value } = e.target;
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    // --- LÓGICA DE SUBMISSÃO TOTALMENTE ATUALIZADA ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        let formIsValid = true; const newErrors = {}; Object.keys(formData).forEach(key => { if (key === 'perfil') return; const error = validateField(key, formData[key]); if (error) { newErrors[key] = error; formIsValid = false; } }); setErrors(newErrors); if (!formIsValid) return;

        setIsLoading(true);
        try {
            console.log("--- INICIANDO SUBMISSÃO (VIA API EXPRESS) ---");
            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error("Usuário não autenticado. Faça login novamente.");
            }

            // Pega o token do usuário logado (o admin) para enviar ao backend
            const idToken = await currentUser.getIdToken(true);
            
            // Faz a chamada para o seu backend Express
            const response = await fetch('http://localhost:5000/api/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Envia o token para a verificação de segurança no backend
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            // Verifica se a resposta do backend indica um erro
            if (!response.ok) {
                // Lança um erro com a mensagem que veio do backend para ser exibida no Swal
                throw new Error(result.message || 'Ocorreu um erro desconhecido no servidor.');
            }
            
            console.log("API Express executada com sucesso:", result.message);

            await Swal.fire({ icon: 'success', title: 'Sucesso!', text: `Usuário ${formData.nome} cadastrado com sucesso.`, timer: 3000, showConfirmButton: false });
            
            if (onUserAdded) { onUserAdded(); }
            onClose();

        } catch (error) {
            console.error("ERRO DETALHADO NO HANDLE SUBMIT:", error);
            Swal.fire({ icon: 'error', title: 'Erro!', text: `Falha ao criar usuário: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Cadastrar Novo Usuário</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form" noValidate>
                    {/* O resto do seu formulário (não precisa de alterações) */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="nome">Nome Completo</label>
                            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} onBlur={handleBlur} />
                            {errors.nome && <span className="error-text">{errors.nome}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">E-mail</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="cpf">CPF</label>
                            <IMaskInput mask="000.000.000-00" id="cpf" name="cpf" value={formData.cpf} onAccept={(value) => handleInputChange({ target: { name: 'cpf', value } })} onBlur={handleBlur} />
                            {errors.cpf && <span className="error-text">{errors.cpf}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="dataNascimento">Data de Nascimento</label>
                            <input type="date" id="dataNascimento" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} onBlur={handleBlur} />
                            {errors.dataNascimento && <span className="error-text">{errors.dataNascimento}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Senha</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} onBlur={handleBlur} />
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="cargo">Cargo/Função</label>
                            <select id="cargo" name="cargo" value={formData.cargo} onChange={handleInputChange} onBlur={handleBlur}>
                                <option value="" disabled>Selecione...</option>
                                <option value="Advogado">Advogado</option>
                                <option value="Secretária">Secretária</option>
                                <option value="Estagiário">Estagiário</option>
                            </select>
                            {errors.cargo && <span className="error-text">{errors.cargo}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="perfil">Perfil de Acesso</label>
                            <select id="perfil" name="perfil" value={formData.perfil} onChange={handleInputChange}>
                                <option value="normal">Normal</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
                        <button type="submit" className="btn-confirm" disabled={isLoading}>{isLoading ? 'Cadastrando...' : 'Cadastrar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddUserModal;
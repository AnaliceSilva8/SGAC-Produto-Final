// frontend/src/pages/users/AddUserModal.jsx

import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { IMaskInput } from 'react-imask';
import Swal from 'sweetalert2';
import './AddUserModal.css';

function AddUserModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        cpf: '',
        dataNascimento: '',
        password: '',
        cargo: '',
        perfil: 'normal',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

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
                if (!value) errorMsg = 'O CPF é obrigatório.';
                else if (value.replace(/\D/g, '').length !== 11) errorMsg = 'O CPF deve ter 11 dígitos.';
                break;
            case 'dataNascimento':
                if (!value) errorMsg = 'A data de nascimento é obrigatória.';
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        let formIsValid = true;
        const newErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                newErrors[key] = error;
                formIsValid = false;
            }
        });

        setErrors(newErrors);

        if (!formIsValid) {
            return;
        }

        setIsLoading(true);
        try {
            const functions = getFunctions();
            const createNewUser = httpsCallable(functions, 'createNewUser');
            await createNewUser({ userData: formData });

            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: `Usuário ${formData.nome} cadastrado com sucesso.`,
                timer: 3000,
                showConfirmButton: false
            });
            onClose(); // Fecha o modal
        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: error.message || 'Não foi possível cadastrar o usuário. Tente novamente.'
            });
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
                            <IMaskInput
                                mask="000.000.000-00"
                                id="cpf"
                                name="cpf"
                                value={formData.cpf}
                                onAccept={(value) => handleInputChange({ target: { name: 'cpf', value } })}
                                onBlur={handleBlur}
                            />
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
                                <option value="Secretário">Secretário</option>
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
                        <button type="submit" className="btn-confirm" disabled={isLoading}>
                            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddUserModal;
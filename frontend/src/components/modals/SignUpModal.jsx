// frontend/src/components/modals/SignUpModal.jsx
import './SignUpModal.css'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import Swal from 'sweetalert2'; // 1. Importar o SweetAlert2


// Função para validar o CPF (sem alterações, já estava correta)
function isValidCPF(cpf) {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    cpf = cpf.split('').map(el => +el);
    const rest = (count) => (cpf.slice(0, count - 12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10;
    return rest(10) === cpf[9] && rest(11) === cpf[10];
}

function SignUpModal({ onClose }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '', password: '', nome: '', cpf: '', dataNascimento: '', cargo: ''
    });
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: null }));

        // Bloqueia números no campo nome
        if (id === 'nome' && !/^[a-zA-Z\s]*$/.test(value)) return;

        setFormData(prevState => ({ ...prevState, [id]: value }));
    };

    const handleMaskedInputChange = (value, fieldId) => {
        if (errors[fieldId]) setErrors(prev => ({ ...prev, [fieldId]: null }));
        setFormData(prevState => ({ ...prevState, [fieldId]: value }));
    };

    const validateForm = () => {
        const newErrors = {};
        // Validação de todos os campos obrigatórios
        for (const key in formData) {
            if (!formData[key]) {
                newErrors[key] = "Este campo é obrigatório.";
            }
        }
        // Validação de formato de e-mail
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Formato de e-mail inválido.";
        }
        // Validação de senha forte
        if (formData.password && !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
            newErrors.password = "A senha deve ter 8+ caracteres, 1 maiúscula e 1 número.";
        }
        // Validação de data de nascimento
        if (formData.dataNascimento) {
            const birthDate = new Date(formData.dataNascimento);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (birthDate > today) {
                newErrors.dataNascimento = "A data não pode ser no futuro.";
            }
        }
        // Validação de CPF
        if (formData.cpf && !isValidCPF(formData.cpf)) {
            newErrors.cpf = "CPF inválido.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        setIsSaving(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await setDoc(doc(db, 'usuarios', user.uid), {
                nome: formData.nome,
                cpf: formData.cpf,
                dataNascimento: formData.dataNascimento,
                cargo: formData.cargo,
                email: user.email
            });
            
            // 2. Substituir o alert() por SweetAlert2
            Swal.fire({
                title: 'Sucesso!',
                text: `Usuário ${formData.nome} criado com sucesso!`,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                onClose(); // Fechar o modal após o usuário clicar em OK
            });

        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            let errorMessage = "Falha no cadastro. Verifique os dados e tente novamente.";
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Este e-mail já está cadastrado. Por favor, utilize outro.";
                setErrors(prev => ({ ...prev, email: "Este e-mail já está cadastrado." }));
            }
            
            // 3. Usar SweetAlert2 para todos os erros
            Swal.fire({
                title: 'Erro!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });

        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content signup-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="signup-title">Cadastro de Novo Usuário</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid-signup">
                        <div className="input-group">
                            <label htmlFor="email">E-mail (para login)</label>
                            <input id="email" type="email" value={formData.email} onChange={handleInputChange} />
                            {errors.email && <p className="error-text">{errors.email}</p>}
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Senha</label>
                            <input id="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="8+ caracteres, 1 maiúscula, 1 número" />
                            {errors.password && <p className="error-text">{errors.password}</p>}
                        </div>
                        <div className="input-group">
                            <label htmlFor="nome">Nome Completo</label>
                            <input id="nome" type="text" value={formData.nome} onChange={handleInputChange} />
                            {errors.nome && <p className="error-text">{errors.nome}</p>}
                        </div>
                        <div className="input-group">
                            <label htmlFor="cpf">CPF</label>
                            <IMaskInput mask="000.000.000-00" id="cpf" value={formData.cpf} onAccept={(value) => handleMaskedInputChange(value, 'cpf')} />
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

                    <div className="modal-buttons">
                        <button type="submit" className="btn-save" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Cadastrar'}
                        </button>
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SignUpModal;
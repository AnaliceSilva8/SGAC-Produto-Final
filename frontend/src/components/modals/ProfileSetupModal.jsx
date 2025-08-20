// frontend/src/components/modals/ProfileSetupModal.jsx
import React, { useState } from 'react';
import { db } from '../../firebase-config/config';
import { doc, setDoc } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import './ProfileSetupModal.css';

function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  cpf = cpf.split('').map(el => +el);
  const rest = (count) => (cpf.slice(0, count-12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10;
  return rest(10) === cpf[9] && rest(11) === cpf[10];
}

function ProfileSetupModal({ user, onProfileComplete }) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    cargo: ''
  });

  // NOVO ESTADO PARA CONTROLAR OS ERROS INDIVIDUALMENTE
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    // Limpa o erro do campo específico ao começar a digitar
    if(errors[id]) {
        setErrors(prevErrors => ({ ...prevErrors, [id]: null }));
    }
    
    if (id === 'nome') {
      if (/^[a-zA-Z\s]*$/.test(value)) {
        setFormData(prevState => ({ ...prevState, [id]: value }));
      }
    } else {
      setFormData(prevState => ({ ...prevState, [id]: value }));
    }
  };

  const handleMaskedInputChange = (value, fieldId) => {
    if(errors[fieldId]) {
        setErrors(prevErrors => ({ ...prevErrors, [fieldId]: null }));
    }
    setFormData(prevState => ({ ...prevState, [fieldId]: value }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) newErrors.nome = "Nome completo é obrigatório.";
    if (!formData.cpf.trim()) newErrors.cpf = "CPF é obrigatório.";
    if (!formData.dataNascimento) newErrors.dataNascimento = "Data de nascimento é obrigatória.";
    if (!formData.cargo) newErrors.cargo = "Cargo / Função é obrigatório.";
    
    if (formData.dataNascimento) {
        const birthDate = new Date(formData.dataNascimento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (birthDate > today) {
            newErrors.dataNascimento = "A data de nascimento não pode ser no futuro.";
        }
    }

    if (formData.cpf && !isValidCPF(formData.cpf)) {
        newErrors.cpf = "O CPF digitado é inválido.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // A validação agora apenas mostra os erros na tela, sem alert
      return;
    }

    try {
      const userDocRef = doc(db, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        ...formData,
        email: user.email
      });

      alert("Perfil criado com sucesso!");
      onProfileComplete({ uid: user.uid, email: user.email, ...formData });
    } catch (error) {
      console.error("Erro ao criar perfil:", error);
      alert("Não foi possível criar o perfil.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content profile-setup-modal">
        <form onSubmit={handleSubmit}>
          <h2>Bem-vindo(a)!</h2>
          <p>Este é o seu primeiro acesso. Por favor, complete seu perfil para continuar.</p>
          
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
                placeholder="000.000.000-00"
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
          
          <div className="modal-buttons">
            <button type="submit" className="btn-save">Salvar e Continuar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetupModal;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import './SignUpPage.css';
import logo from '../../assets/logo.png';

function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  cpf = cpf.split('').map(el => +el);
  const rest = (count) => (cpf.slice(0, count-12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10;
  return rest(10) === cpf[9] && rest(11) === cpf[10];
}

function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '', password: '', nome: '', cpf: '', dataNascimento: '', cargo: ''
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'nome' && !/^[a-zA-Z\s]*$/.test(value)) return;
    setFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleMaskedInputChange = (value, fieldId) => {
    setFormData(prevState => ({ ...prevState, [fieldId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password || !formData.nome || !formData.cpf || !formData.dataNascimento || !formData.cargo) {
      setError("Todos os campos são obrigatórios.");
      return;
    }
    if (!isValidCPF(formData.cpf)) {
      setError("O CPF digitado é inválido.");
      return;
    }

    setIsSaving(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        nome: formData.nome,
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento,
        cargo: formData.cargo,
        email: user.email
      });

      alert(`Usuário ${formData.nome} criado com sucesso!`);
      navigate('/login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está cadastrado.");
      } else {
        setError("Falha no cadastro. Verifique os dados.");
      }
      console.error("Erro ao criar usuário:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="signup-page-container">
      <div className="signup-form-wrapper">
        <img src={logo} alt="Logo" className="signup-logo" />
        <h2>Cadastro de Novo Usuário</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid-signup">
            <div className="input-group">
              <label htmlFor="email">E-mail (para login)</label>
              <input id="email" type="email" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="password">Senha (mínimo 6 caracteres)</label>
              <input id="password" type="password" value={formData.password} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="nome">Nome Completo</label>
              <input id="nome" type="text" value={formData.nome} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="cpf">CPF</label>
              <IMaskInput mask="000.000.000-00" id="cpf" value={formData.cpf} onAccept={(value) => handleMaskedInputChange(value, 'cpf')} />
            </div>
            <div className="input-group">
              <label htmlFor="dataNascimento">Data de Nascimento</label>
              <input id="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} />
            </div>
            <div className="input-group">
              <label htmlFor="cargo">Cargo / Função</label>
              <select id="cargo" value={formData.cargo} onChange={handleInputChange}>
                  <option value="">Selecione...</option>
                  <option value="Advogado(a)">Advogado(a)</option>
                  <option value="Secretário(a)">Secretário(a)</option>
                  <option value="Estagiário(a)">Estagiário(a)</option>
              </select>
            </div>
          </div>
          {error && <p className="error-text-signup">{error}</p>}
          <div className="signup-buttons">
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Cadastrar Usuário'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => navigate('/login')}>
              Voltar para o Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignUpPage;
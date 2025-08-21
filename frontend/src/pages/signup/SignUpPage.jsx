import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config/config';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (errors[id]) {
        setErrors(prev => ({ ...prev, [id]: undefined }));
    }
    if (id === 'nome' && !/^[a-zA-Z\s]*$/.test(value)) return;
    setFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleMaskedInputChange = (value, fieldId) => {
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: undefined }));
    }
    setFormData(prevState => ({ ...prevState, [fieldId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.email || !formData.password || !formData.nome || !formData.cpf || !formData.dataNascimento || !formData.cargo) {
      newErrors.form = "Todos os campos são obrigatórios.";
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (formData.password && !passwordRegex.test(formData.password)) {
      newErrors.password = "A senha deve ter 6+ caracteres, 1 maiúscula e 1 número.";
    }
    if (formData.cpf && !isValidCPF(formData.cpf)) {
      newErrors.cpf = "O CPF digitado é inválido.";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      const usersRef = collection(db, 'usuarios');
      const q = query(usersRef, where("cpf", "==", formData.cpf));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setErrors({ cpf: "Este CPF já está cadastrado em outra conta." });
        setIsSaving(false);
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await sendEmailVerification(user);

      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: formData.nome,
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento,
        cargo: formData.cargo,
        email: user.email
      });

      alert(`Usuário criado! Um link de verificação foi enviado para ${formData.email}. Por favor, verifique sua caixa de entrada para ativar a conta.`);
      navigate('/login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: "Este e-mail já está cadastrado." });
      } else {
        setErrors({ form: "Falha no cadastro. Verifique os dados." });
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="signup-page-container">
      <div className="side-panel"></div>
      <main className="signup-main-content">
        <header className="signup-header">
          <img src={logo} alt="Logo Doirado & Idalino" />
          <h1>DOIRADO & IDALINO</h1>
        </header>
        <div className="signup-form-container">
          <h2>Cadastro de Novo Usuário</h2>
          <p>Preencha os dados para criar a conta.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-signup">
              <div className="input-group">
                <label htmlFor="nome">Nome Completo</label>
                <input id="nome" type="text" value={formData.nome} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="cpf">CPF</label>
                <IMaskInput mask="000.000.000-00" id="cpf" value={formData.cpf} onAccept={(value) => handleMaskedInputChange(value, 'cpf')} required />
                {errors.cpf && <p className="field-error">{errors.cpf}</p>}
              </div>
              <div className="input-group">
                <label htmlFor="dataNascimento">Data de Nascimento</label>
                <input id="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="cargo">Cargo / Função</label>
                <select id="cargo" value={formData.cargo} onChange={handleInputChange} required>
                    <option value="">Selecione...</option>
                    <option value="Advogado(a)">Advogado(a)</option>
                    <option value="Secretário(a)">Secretário(a)</option>
                    <option value="Estagiário(a)">Estagiário(a)</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="email">E-mail (para login)</label>
                <input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
              <div className="input-group">
                <label htmlFor="password">Senha</label>
                <input 
                  id="password" 
                  type="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  placeholder="6+ caracteres, 1 maiúscula, 1 número"
                  required 
                />
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
            </div>
            {errors.form && <p className="form-error-message">{errors.form}</p>}
            <div className="signup-buttons">
              <button type="submit" className="btn-save" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Cadastrar Usuário'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => navigate('/login')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </main>
      <div className="side-panel"></div>
    </div>
  );
}

export default SignUpPage;
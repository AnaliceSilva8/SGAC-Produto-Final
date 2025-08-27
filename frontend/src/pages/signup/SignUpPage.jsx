import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config/config';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // 1. sendEmailVerification removido
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import Swal from 'sweetalert2'; // 2. SweetAlert importado
import './SignUpPage.css';
import logo from '../../assets/logo.png';

// Função de validação de CPF corrigida e funcional
function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  const cpfArray = cpf.split('').map(el => +el);
  const rest = (count) => (cpfArray.slice(0, count).reduce((soma, el, index) => soma + el * (count + 1 - index), 0) * 10) % 11 % 10;

  return rest(9) === cpfArray[9] && rest(10) === cpfArray[10];
}

function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '', password: '', nome: '', cpf: '', dataNascimento: '', cargo: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  // 3. O estado 'errors' foi removido, pois o SweetAlert cuidará de tudo.

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

    // --- Validações com SweetAlert ---
    const { email, password, nome, cpf, dataNascimento, cargo } = formData;
    if (!email || !password || !nome || !cpf || !dataNascimento || !cargo) {
      Swal.fire('Atenção!', 'Todos os campos são obrigatórios.', 'warning');
      return;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      Swal.fire('Senha Inválida', 'A senha deve ter 6+ caracteres, pelo menos 1 letra maiúscula e 1 número.', 'warning');
      return;
    }
    if (!isValidCPF(cpf)) {
      Swal.fire('CPF Inválido', 'O CPF digitado não é válido. Por favor, verifique.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      // Verifica se CPF já existe
      const usersRef = collection(db, 'usuarios');
      const q = query(usersRef, where("cpf", "==", cpf));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Swal.fire('CPF já cadastrado', 'Este CPF já está associado a outra conta.', 'error');
        setIsSaving(false);
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // await sendEmailVerification(user); // 4. Verificação de email REMOVIDA

      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: nome,
        cpf: cpf,
        dataNascimento: dataNascimento,
        cargo: cargo,
        email: user.email
      });

      // 5. Alerta de sucesso
      await Swal.fire({
        icon: 'success',
        title: 'Usuário Criado com Sucesso!',
        text: `O usuário ${nome} foi cadastrado. Você será redirecionado para o login.`,
        timer: 3000,
        timerProgressBar: true
      });
      navigate('/login');

    } catch (error) {
      console.error("Erro no cadastro:", error);
      if (error.code === 'auth/email-already-in-use') {
        Swal.fire('E-mail já cadastrado', 'Este e-mail já está associado a outra conta.', 'error');
      } else {
        Swal.fire('Falha no Cadastro', 'Ocorreu um erro inesperado. Por favor, tente novamente.', 'error');
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
              {/* 6. As mensagens de erro inline foram removidas dos campos */}
              <div className="input-group">
                <label htmlFor="nome">Nome Completo</label>
                <input id="nome" type="text" value={formData.nome} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="cpf">CPF</label>
                <IMaskInput mask="000.000.000-00" id="cpf" value={formData.cpf} onAccept={(value) => handleMaskedInputChange(value, 'cpf')} required />
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
              </div>
            </div>
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
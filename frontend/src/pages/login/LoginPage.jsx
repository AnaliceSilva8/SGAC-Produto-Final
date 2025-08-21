import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config/config';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import logo from '../../assets/logo.png';
import ForgotPasswordModal from "../../components/modals/ForgotPasswordModal.jsx";
import ProfileSetupModal from "../../components/modals/ProfileSetupModal.jsx";
import RegistrationKeyModal from "../../components/modals/RegistrationKeyModal.jsx";
import './login.css';

function LoginPage() { 
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Tibagi');
  const [error, setError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [firstLoginUser, setFirstLoginUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // VERIFICAÇÃO ADICIONADA AQUI
      if (!user.emailVerified) {
        setError("Seu e-mail ainda não foi verificado. Por favor, cheque sua caixa de entrada.");
        // Desloga o usuário para evitar que ele fique em um estado "autenticado mas não autorizado"
        await auth.signOut(); 
        return;
      }

      localStorage.setItem('selectedLocation', location);

      const userDocRef = doc(db, 'usuarios', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        navigate('/');
      } else {
        setFirstLoginUser(user);
        setNeedsProfileSetup(true);
      }
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/invalid-credential') {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Ocorreu um erro ao tentar fazer login.');
      }
      setPassword('');
      console.error("Erro do Firebase:", firebaseError.code);
    }
  };

  // O restante do seu componente (o JSX) continua o mesmo
  return (
    <>
      <div className="login-page-container">
        <div className="side-panel"></div>
        <main className="login-main-content">
          <header className="login-header">
            <img src={logo} alt="Logo Doirado & Idalino" />
            <h1>DOIRADO & IDALINO</h1>
          </header>
          <div className="login-form-container">
            <h2>Login</h2>
            <p>Digite seus dados de acesso no campo abaixo.</p>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="location">Unidade</label>
                <select id="location" value={location} onChange={(e) => setLocation(e.target.value)} required>
                  <option value="Tibagi">Tibagi</option>
                  <option value="Londrina">Londrina</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="email">E-mail</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Digite aqui..." />
              </div>
              <div className="input-group">
                <label htmlFor="password">Senha</label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Digite aqui..." />
              </div>
              {error && <p className="error-message">{error}</p>}
              <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); setIsForgotModalOpen(true); }}>
                Esqueci minha senha
              </a>
              <button type="submit" className="btn-login">Acessar</button>
              <button type="button" className="btn-register" onClick={() => setIsKeyModalOpen(true)}>
                Cadastre-se
              </button>
            </form>
          </div>
        </main>
        <div className="side-panel"></div>
      </div>
      
      {isForgotModalOpen && <ForgotPasswordModal onClose={() => setIsForgotModalOpen(false)} />}
      {needsProfileSetup && <ProfileSetupModal user={firstLoginUser} onProfileComplete={() => navigate('/')} />}
      {isKeyModalOpen && <RegistrationKeyModal onCancel={() => setIsKeyModalOpen(false)} onAccessGranted={() => navigate('/cadastro')} />}
    </>
  );
}

export default LoginPage;
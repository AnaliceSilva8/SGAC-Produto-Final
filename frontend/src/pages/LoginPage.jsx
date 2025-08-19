// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import './login.css'; 
import { auth } from '../firebase-config/config';
import { signInWithEmailAndPassword } from "firebase/auth";
import logo from '../assets/logo.png';
import ForgotPasswordModal from "./forgot-password/ForgotPasswordModal.jsx";

function LoginPage() { 
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // 1. NOVO ESTADO PARA GUARDAR A MENSAGEM DE ERRO
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Limpa erros antigos antes de tentar o login

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (firebaseError) {
      // 2. EM VEZ DE 'alert', ATUALIZAMOS O ESTADO DO ERRO
      setError('E-mail ou senha inválidos.');
      setPassword(''); // Limpa o campo de senha para o usuário tentar novamente
      console.error("Erro do Firebase:", firebaseError.code);
    }
  };

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
                <label htmlFor="email">E-mail</label>
                <input 
                  type="email" 
                  id="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="Digite aqui..." 
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Senha</label>
                <input 
                  type="password" 
                  id="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Digite aqui..." 
                />
              </div>

              {/* 3. EXIBIMOS A MENSAGEM DE ERRO AQUI, SE ELA EXISTIR */}
              {error && <p className="error-message">{error}</p>}

              <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); setIsForgotModalOpen(true); }}>
                Esqueci minha senha
              </a>
              <button type="submit" className="btn-login">Acessar</button>
            </form>
          </div>
        </main>
        <div className="side-panel"></div>
      </div>
      
      {isForgotModalOpen && <ForgotPasswordModal onClose={() => setIsForgotModalOpen(false)} />}
    </>
  );
}

export default LoginPage;
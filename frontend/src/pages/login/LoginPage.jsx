// frontend/src/pages/login/LoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase-config/config';
import { signInWithEmailAndPassword } from "firebase/auth";
import logo from '../../assets/logo.png';
import ForgotPasswordModal from "../../components/modals/ForgotPasswordModal.jsx";
import Swal from 'sweetalert2';
import './login.css';

function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [location, setLocation] = useState('Tibagi');
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem('selectedLocation', location);
            navigate('/'); // Navega para a página principal após o login
        } catch (firebaseError) {
            let errorMessage = 'Ocorreu um erro inesperado. Verifique sua conexão ou tente novamente mais tarde.';
            if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
                errorMessage = 'E-mail ou senha inválidos.';
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Falha no Login',
                text: errorMessage,
            });

            setPassword('');
            console.error("Erro do Firebase:", firebaseError.code, firebaseError.message);
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
                            <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); setIsForgotModalOpen(true); }}>
                                Esqueci minha senha
                            </a>
                            <button type="submit" className="btn-login">Acessar</button>
                            {/* O botão "Cadastre-se" foi removido */}
                        </form>
                    </div>
                </main>
                <div className="side-panel"></div>
            </div>
            
            {isForgotModalOpen && <ForgotPasswordModal onClose={() => setIsForgotModalOpen(false)} />}
            {/* Os modais de ProfileSetup e RegistrationKey foram removidos */}
        </>
    );
}

export default LoginPage;
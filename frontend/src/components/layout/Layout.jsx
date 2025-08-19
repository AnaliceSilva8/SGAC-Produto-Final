// frontend/src/components/layout/Layout.jsx
import React from 'react';
// 1. IMPORTAMOS O 'Link' PARA CRIAR LINKS DE NAVEGAÇÃO
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../firebase-config/config';
import { signOut } from 'firebase/auth';
import './Layout.css';
import logo from '../../assets/logo.png';

function Layout({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/login')).catch(console.error);
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <nav className="sidebar-nav">
          <ul>
            {/* 2. ENVOLVEMOS O ITEM 'li' COM O COMPONENTE 'Link' */}
            <Link to="/" className="sidebar-link">
              <li className="active">
                <i className="fa-solid fa-users"></i>
                <span>Clientes</span>
              </li>
            </Link>
            <li>
              <i className="fa-solid fa-bell"></i>
              <span>Notificações</span>
            </li>
            <li>
              <i className="fa-solid fa-calendar-days"></i>
              <span>Atendimentos</span>
            </li>
            <li>
              <i className="fa-solid fa-user"></i>
              <span>Usuário</span>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer"><span>?</span> Ajuda</div>
      </aside>
      
      <div className="page-content">
        <div className="top-bar"></div>
        <header className="main-header">
          <h1>DOIRADO & IDALINO</h1>
          <button onClick={handleLogout} className="logout-btn">Sair</button>
        </header>
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
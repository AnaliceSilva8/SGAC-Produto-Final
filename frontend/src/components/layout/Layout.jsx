import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import './Layout.css';
import logo from '../../assets/logo.png';
import { useCollection } from 'react-firebase-hooks/firestore';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { auth as firebaseAuth } from '../../firebase-config/config';

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para saber a página atual
  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // --- Lógica para buscar notificações não lidas (adicionada) ---
  const notificacoesRef = collection(db, 'notificacoes');
  const q = currentUser
    ? query(
        notificacoesRef,
        where('usuarioId', '==', currentUser.uid),
        where('lida', '==', false)
      )
    : null;

  const [notificacoesNaoLidasSnapshot] = useCollection(q);
  const numNaoLidas = notificacoesNaoLidasSnapshot?.docs.length || 0;
  // --- Fim da lógica ---

  const handleLogout = () => {
    signOut(firebaseAuth).then(() => {
      localStorage.removeItem('selectedLocation');
      navigate('/login');
    }).catch(console.error);
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <img src={logo} alt="Logo" className="sidebar-logo" />
        <nav className="sidebar-nav">
          <ul>
            <Link to="/" className="sidebar-link">
              <li className={location.pathname === '/' ? 'active' : ''}>
                <i className="fa-solid fa-users"></i>
                <span>Clientes</span>
              </li>
            </Link>

            <Link to="/notificacoes" className="sidebar-link">
              <li className={location.pathname === '/notificacoes' ? 'active' : ''}>
                <i className="fa-solid fa-bell"></i>
                <span>Notificações</span>
                {numNaoLidas > 0 && <span className="notification-badge-menu">{numNaoLidas}</span>}
              </li>
            </Link>

            <Link to="/atendimentos" className="sidebar-link">
              <li className={location.pathname === '/atendimentos' ? 'active' : ''}>
                <i className="fa-solid fa-calendar-days"></i>
                <span>Atendimentos</span>
              </li>
            </Link>
            
            <Link to="/usuario" className="sidebar-link">
              <li className={location.pathname === '/usuario' ? 'active' : ''}>
                <i className="fa-solid fa-user"></i>
                <span>Usuário</span>
              </li>
            </Link>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <Link to="#" className="sidebar-link">
            <span>?</span> Ajuda
          </Link>
        </div>
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
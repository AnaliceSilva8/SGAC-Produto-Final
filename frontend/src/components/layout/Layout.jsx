// frontend/src/components/layout/Layout.jsx

import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { auth as firebaseAuth } from '../../firebase-config/config';
import { useUserRole } from '../../hooks/useUserRole'; // Importando o hook de perfil
import logo from '../../assets/logo.png';
import './Layout.css';


function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const db = getFirestore();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const { role } = useUserRole(); // Usando o hook para obter o perfil

    const selectedLocation = localStorage.getItem('selectedLocation');

    const notificacoesQuery = currentUser && selectedLocation
        ? query(
            collection(db, 'notificacoes'),
            where('usuarioId', '==', currentUser.uid),
            where('lida', '==', false),
            where('location', '==', selectedLocation)
        )
        : null;

    const [notificacoesNaoLidasSnapshot] = useCollection(notificacoesQuery);
    const numNaoLidas = notificacoesNaoLidasSnapshot?.docs.length || 0;

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
                        
                        {/* Link de "Usuários" visível apenas para administradores */}
                        {role === 'admin' && (
                            <Link to="/usuarios" className="sidebar-link">
                                <li className={location.pathname === '/usuarios' ? 'active' : ''}>
                                    <i className="fa-solid fa-user-gear"></i>
                                    <span>Usuários</span>
                                </li>
                            </Link>
                        )}
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
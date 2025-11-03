import React, { useContext } from 'react'; // --- ALTERAÇÃO: Importado useContext ---
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { auth as firebaseAuth } from '../../firebase-config/config';
import { useUserRole } from '../../hooks/useUserRole'; 
import logo from '../../assets/logo.png';
import './Layout.css';

// --- ALTERAÇÃO 1: Importar o useHelp e o ícone de Ajuda ---
import { useHelp } from '../../contexto/HelpContext'; 
import { FaQuestionCircle } from 'react-icons/fa';
// --- FIM DA ALTERAÇÃO ---


function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const db = getFirestore();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const { role } = useUserRole(); 

    // --- ALTERAÇÃO 2: Pegar a função para abrir o modal ---
    const { setIsHelpModalOpen } = useHelp();

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

    // --- ALTERAÇÃO 3: Criar a função que abre o modal ---
    const handleHelpClick = (e) => {
        e.preventDefault(); // Impede o link de navegar
        setIsHelpModalOpen(true); // Abre o modal de ajuda
    };
    // --- FIM DA ALTERAÇÃO ---

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
                    {/* --- ALTERAÇÃO 4: Link de Ajuda atualizado com ícone e onClick --- */}
                    <Link to="#" className="sidebar-link nav-link-ajuda" onClick={handleHelpClick}>
                        <FaQuestionCircle /> <span>Ajuda</span>
                    </Link>
                    {/* --- FIM DA ALTERAÇÃO --- */}
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
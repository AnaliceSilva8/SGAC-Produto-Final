// frontend/src/pages/notifications/NotificationsPage.jsx

import React, { useState, useEffect, useCallback, useContext } from 'react'; // NOVO: Adicionado useContext
import { auth, db } from '../../firebase-config/config'; // NOVO: db ainda é usado para a função de apagar
import { Timestamp, doc, setDoc } from 'firebase/firestore'; // NOVO: Reduzido o que importamos do firestore
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaTrash, FaBirthdayCake, FaBriefcase, FaUserCheck, FaCalendarAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // NOVO: Importe seu contexto que gerencia a unidade atual
import './NotificationsPage.css';

// Configurações visuais (sem alterações)
const notificationConfig = {
    aniversario_cliente: { icon: <FaBirthdayCake />, color: '#3498db' },
    aniversario_processo: { icon: <FaBriefcase />, color: '#f1c40f' },
    aniversario_cadastro: { icon: <FaUserCheck />, color: '#2ecc71' },
    atendimento_hoje: { icon: <FaCalendarAlt />, color: '#e74c3c' },
    atendimento_amanha: { icon: <FaCalendarAlt />, color: '#e67e22' },
    default: { icon: '🔔', color: '#95a5a6' }
};

// ALTERADO: Função de formatação para lidar com a data vinda do backend (string)
const formatTimestamp = (timestamp) => {
    let date;
    if (typeof timestamp === 'string') {
        date = new Date(timestamp); // Converte a string ISO da API para um objeto Date
    } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate(); // Mantém compatibilidade com o formato do Firestore
    } else {
        return 'Data inválida';
    }
    return date.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

function NotificationsPage() {
    const [user] = useAuthState(auth);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // NOVO: Acessa a unidade atual do contexto global da sua aplicação
    const { currentLocation } = useContext(AuthContext);

    // ALTERADO: A lógica de carregamento foi completamente substituída
    useEffect(() => {
        const fetchNotifications = async () => {
            // Só executa se tivermos um usuário e uma unidade selecionada
            if (!user || !currentLocation) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // 1. Pega o token de autenticação do Firebase para autorizar a requisição
                const token = await user.getIdToken();

                // 2. Faz a chamada para a API do backend
                const response = await fetch('http://localhost:5000/api/notificacoes', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        // 3. Envia o cabeçalho com a unidade atual para o backend fazer o filtro!
                        'X-Current-Location': currentLocation 
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha ao buscar notificações.');
                }
                
                // 4. Recebe os dados já filtrados e atualiza o estado
                const data = await response.json();
                setNotifications(data);

            } catch (error) {
                console.error("Erro ao buscar notificações via API:", error);
                setNotifications([]); // Limpa as notificações em caso de erro
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
        
        // A busca será refeita sempre que o usuário logar/deslogar ou a unidade mudar
    }, [user, currentLocation]);

    // Função de apagar (sem alterações na lógica principal, mas agora é mais independente)
    const handleDelete = useCallback(async (notificationId) => {
        if (!user) return;
        
        // Remove a notificação da tela imediatamente
        setNotifications(prev => prev.filter(n => n.id !== notificationId));

        // Envia a atualização para o Firestore em segundo plano
        try {
            const statusRef = doc(db, `notificacoes/${notificationId}/statusPorUsuario/${user.uid}`);
            await setDoc(statusRef, { apagada: true, lida: true }, { merge: true });
        } catch (error) {
            console.error("Erro ao apagar notificação no Firestore:", error);
            // Opcional: Adicionar lógica para reverter a UI se o Firestore falhar
        }
    }, [user]);

    return (
        <div className="notifications-container">
            <h1>Notificações</h1>
            <div className="notifications-list">
                {loading && <p>Carregando notificações...</p>}
                {!loading && notifications.length === 0 && <p>Nenhuma notificação nova para a unidade de {currentLocation}.</p>}
                {!loading && notifications.map(notif => {
                    const config = notificationConfig[notif.tipo] || notificationConfig.default;
                    return (
                        <div key={notif.id} className="notification-card">
                            <div className="notification-icon" style={{ backgroundColor: config.color }}>
                                {config.icon}
                            </div>
                            <div className="notification-content">
                                <Link to={notif.link || '#'} className="notification-link">
                                    <strong>{notif.titulo}</strong>
                                    <p>{notif.mensagem}</p>
                                </Link>
                                <small>{formatTimestamp(notif.timestamp)}</small>
                            </div>
                            <button onClick={() => handleDelete(notif.id)} className="delete-button" title="Apagar notificação">
                                <FaTrash />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default NotificationsPage;
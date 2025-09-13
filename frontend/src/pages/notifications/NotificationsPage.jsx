import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase-config/config';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import './NotificationsPage.css';

// Função para escolher o ícone com base no tipo de notificação
const getNotificationIcon = (type) => {
    switch (type) {
        case 'aniversario_cliente':
            return <i className="fa-solid fa-cake-candles notification-icon birthday"></i>;
        case 'aniversario_cadastro':
            return <i className="fa-solid fa-calendar-star notification-icon register"></i>;
        case 'atendimento_hoje':
        case 'atendimento_amanha':
            return <i className="fa-solid fa-calendar-check notification-icon default"></i>;
        default:
            return <i className="fa-solid fa-bell notification-icon default"></i>;
    }
};

function NotificationsPage() {
    const [user] = useAuthState(auth);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAndMarkNotifications = async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const selectedLocation = localStorage.getItem('selectedLocation');
        if (!selectedLocation) {
            setError("Nenhuma unidade de atendimento foi selecionada.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const q = query(
                collection(db, 'notificacoes'),
                where('usuarioId', '==', user.uid),
                where('location', '==', selectedLocation),
                orderBy('dataCriacao', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);

            const unreadNotifs = querySnapshot.docs.filter(d => !d.data().lida);
            if (unreadNotifs.length > 0) {
                const batch = [];
                unreadNotifs.forEach(document => {
                    const notifRef = doc(db, 'notificacoes', document.id);
                    batch.push(updateDoc(notifRef, { lida: true }));
                });
                await Promise.all(batch);
            }
        } catch (err) {
            console.error("Erro ao buscar notificações:", err);
            setError("Ocorreu um erro ao carregar as notificações.");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchAndMarkNotifications();
    }, [user]);

    const handleDelete = async (e, id) => {
        e.preventDefault(); // Impede que o link de navegação seja ativado
        e.stopPropagation(); // Impede a propagação do evento de clique

        try {
            await deleteDoc(doc(db, "notificacoes", id));
            setNotifications(prev => prev.filter(notif => notif.id !== id));
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Notificação excluída',
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            console.error("Erro ao deletar notificação:", err);
            Swal.fire('Erro!', 'Não foi possível excluir a notificação.', 'error');
        }
    };


    if (isLoading) {
        return <div className="loading-container-notif">Carregando notificações...</div>;
    }

    return (
        <div className="notifications-page-container">
            <h1>Notificações</h1>
            {error && <p className="error-message">{error}</p>}

            {!error && notifications.length > 0 ? (
                <div className="notifications-list">
                    {notifications.map(notif => (
                        <Link key={notif.id} to={notif.link || '#'} className="notification-item-link">
                            <div className={`notification-item ${!notif.lida ? 'nao-lida' : ''}`}>
                                {getNotificationIcon(notif.tipo)}
                                <div className="notification-content">
                                    <h3 className="notification-title">{notif.titulo}</h3>
                                    <p className="notification-message">{notif.mensagem}</p>
                                    <span className="notification-time">
                                        {notif.dataCriacao?.toDate().toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <button className="delete-notification-btn" onClick={(e) => handleDelete(e, notif.id)}>
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                !isLoading && !error && (
                    <div className="no-notifications">
                        <i className="fa-regular fa-bell-slash"></i>
                        <p>Nenhuma notificação para a unidade de {localStorage.getItem('selectedLocation')}.</p>
                    </div>
                )
            )}
        </div>
    );
}

export default NotificationsPage;
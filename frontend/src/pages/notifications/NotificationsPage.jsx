import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { getFirestore, collection, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { FaBirthdayCake, FaUserCheck, FaBell, FaTrash } from 'react-icons/fa'; // Importa o ícone da lixeira
import Swal from 'sweetalert2'; // Importa o SweetAlert2
import './NotificationsPage.css';

const NotificationIcon = ({ tipo }) => {
    switch (tipo) {
        case 'aniversario_cliente':
            return <FaBirthdayCake className="notification-icon birthday" />;
        case 'aniversario_cadastro':
            return <FaUserCheck className="notification-icon register" />;
        default:
            return <FaBell className="notification-icon default" />;
    }
};

const NotificationsPage = () => {
    const db = getFirestore();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const notificacoesRef = collection(db, 'notificacoes');
    const q = currentUser
        ? query(
            notificacoesRef,
            where('usuarioId', '==', currentUser.uid),
            orderBy('dataCriacao', 'desc')
        )
        : null;

    const [notificacoesSnapshot, loading, error] = useCollection(q);

    const handleNotificationClick = async (id) => {
        const notificationRef = doc(db, 'notificacoes', id);
        await updateDoc(notificationRef, { lida: true });
    };
    
    // --- NOVA FUNÇÃO PARA APAGAR A NOTIFICAÇÃO ---
    const handleDelete = (e, id) => {
        e.preventDefault(); // Impede a navegação ao clicar no botão de apagar
        e.stopPropagation(); // Impede que outros eventos de clique sejam disparados

        Swal.fire({
            title: 'Você tem certeza?',
            text: "Esta ação não pode ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, apagar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const notificationRef = doc(db, 'notificacoes', id);
                    await deleteDoc(notificationRef);
                    Swal.fire(
                        'Apagada!',
                        'A notificação foi removida.',
                        'success'
                    );
                } catch (err) {
                    Swal.fire(
                        'Erro!',
                        'Não foi possível apagar a notificação.',
                        'error'
                    );
                    console.error("Erro ao apagar notificação:", err);
                }
            }
        });
    };

    if (loading) {
        return <p>Carregando notificações...</p>;
    }

    if (error) {
        return <p>Erro ao carregar notificações.</p>;
    }

    return (
        <div className="notifications-page-container">
            <h1>Notificações</h1>
            <div className="notifications-list">
                {notificacoesSnapshot && notificacoesSnapshot.docs.length > 0 ? (
                    notificacoesSnapshot.docs.map(docSnapshot => {
                        const notificacao = docSnapshot.data();
                        const id = docSnapshot.id;
                        return (
                            <Link to={notificacao.link || '#'} key={id} className="notification-item-link" onClick={() => handleNotificationClick(id)}>
                                <div className={`notification-item ${!notificacao.lida ? 'nao-lida' : ''}`}>
                                    <NotificationIcon tipo={notificacao.tipo} />
                                    <div className="notification-content">
                                        <p className="notification-title">{notificacao.titulo}</p>
                                        <p className="notification-message">{notificacao.mensagem}</p>
                                        <span className="notification-time">
                                            {notificacao.dataCriacao?.toDate().toLocaleString()}
                                        </span>
                                    </div>
                                    {!notificacao.lida && <div className="nova-marcador"></div>}
                                    {/* --- BOTÃO DE APAGAR ADICIONADO --- */}
                                    <button 
                                        className="delete-notification-btn" 
                                        onClick={(e) => handleDelete(e, id)}
                                        title="Apagar notificação"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="no-notifications">
                        <FaBell />
                        <p>Nenhuma notificação encontrada.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
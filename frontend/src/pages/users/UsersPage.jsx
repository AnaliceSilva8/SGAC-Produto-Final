// frontend/src/pages/users/UsersPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase-config/config';
import AddUserModal from './AddUserModal';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './UsersPage.css';

function UsersPage() {
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'usuarios'), where('status', '==', 'ativo'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const confirmAndInactiveUser = (user) => {
        Swal.fire({
            title: 'Inativar Usuário',
            text: `Tem certeza que deseja inativar ${user.nome}? Ele não poderá mais acessar o sistema.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, inativar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const functions = getFunctions();
                    const toggleUserStatus = httpsCallable(functions, 'toggleUserStatus');
                    await toggleUserStatus({ uid: user.id, newStatus: 'inativo' });

                    Swal.fire({
                        icon: 'success',
                        title: 'Usuário Inativado!',
                        text: `${user.nome} foi inativado com sucesso.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (error) {
                    console.error("Erro ao inativar usuário:", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro!',
                        text: error.message || 'Não foi possível inativar o usuário.'
                    });
                }
            }
        });
    };

    return (
        <div className="users-page">
            <div className="page-header">
                <h1>Gerenciamento de Usuários</h1>
                <button className="add-user-button" onClick={() => setAddModalOpen(true)}>
                    <FaPlus /> Adicionar Usuário
                </button>
            </div>

            <div className="users-list-container">
                {loading ? (<p>Carregando usuários...</p>) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Nome Completo</th>
                                <th>E-mail</th>
                                <th>CPF</th>
                                <th>Cargo</th>
                                <th>Perfil</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* A formatação aqui foi ajustada para evitar espaços em branco */}
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.nome}</td>
                                    <td>{user.email}</td>
                                    <td>{user.cpf}</td>
                                    <td>{user.cargo}</td>
                                    <td>{user.perfil === 'admin' ? 'Administrador' : 'Normal'}</td>
                                    <td>
                                        <button 
                                            className="action-button delete" 
                                            title="Inativar Usuário"
                                            onClick={() => confirmAndInactiveUser(user)}>
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
            />
        </div>
    );
}

export default UsersPage;
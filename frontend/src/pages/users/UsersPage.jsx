// frontend/src/pages/users/UsersPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
// --- CORREÇÕES ---
// Removidas as importações de 'getFunctions' e 'httpsCallable'
// Adicionada a importação de 'auth' para obter o token do usuário
import { db, auth } from '../../firebase-config/config';
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
        // A sua lógica original para buscar apenas usuários ativos foi mantida
        const q = query(collection(db, 'usuarios'), where('status', '==', 'ativo'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- FUNÇÃO DE INATIVAÇÃO ATUALIZADA PARA USAR O BACKEND EXPRESS ---
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
                    const currentUser = auth.currentUser;
                    if (!currentUser) {
                        throw new Error("Usuário não autenticado.");
                    }
                    
                    // Pega o token do admin para enviar ao backend
                    const idToken = await currentUser.getIdToken(true);

                    // Faz a chamada para a nova rota no backend Express
                    const response = await fetch('http://localhost:5000/api/toggle-user-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({ uid: user.id, newStatus: 'inativo' })
                    });

                    const responseData = await response.json();

                    if (!response.ok) {
                        // Lança um erro com a mensagem do backend
                        throw new Error(responseData.message || 'Falha ao inativar usuário.');
                    }

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

    // --- O RESTO DO SEU COMPONENTE (JSX) ESTÁ EXATAMENTE COMO VOCÊ ENVIOU ---
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
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase-config/config';
import Swal from 'sweetalert2'; // 1. Importar o SweetAlert2
import './ForgotPasswordModal.css';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            await sendPasswordResetEmail(auth, email);

            // 2. Chamar o SweetAlert2 para o alerta de sucesso
            Swal.fire({
                title: 'Sucesso!',
                text: 'E-mail de redefinição de senha enviado com sucesso!',
                icon: 'success',
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    content: 'swal2-content',
                    confirmButton: 'swal2-confirm-button'
                }
            }).then((result) => {
                // 3. Fechar o modal principal depois que o usuário clicar em "OK"
                if (result.isConfirmed) {
                    onClose();
                }
            });

        } catch (error) {
            console.error("Erro ao enviar e-mail de redefinição de senha:", error);
            // Alerta de erro com SweetAlert2 para manter o padrão
            Swal.fire({
                title: 'Erro!',
                text: 'Não foi possível enviar o e-mail. Verifique se o endereço está correto.',
                icon: 'error',
                confirmButtonText: 'OK',
                 customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    content: 'swal2-content',
                    confirmButton: 'swal2-confirm-button'
                }
            });
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-button" onClick={onClose}>X</button>
                <h2>Redefinir Senha</h2>
                <p>Digite seu e-mail para receber o link de redefinição de senha.</p>
                <form onSubmit={handleResetPassword}>
                    <input
                        type="email"
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button type="submit">Enviar</button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
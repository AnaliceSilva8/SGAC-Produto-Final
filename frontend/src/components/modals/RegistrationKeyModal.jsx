// frontend/src/components/modals/RegistrationKeyModal.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importe o useNavigate
import Swal from 'sweetalert2';
// import './RegistrationKeyModal.css'; // Se tiver um CSS

const RegistrationKeyModal = ({ onCancel }) => {
    const [adminKey, setAdminKey] = useState('');
    const navigate = useNavigate(); // Hook para navegação

    // !!! IMPORTANTE: Esta senha é apenas para o FRONTEND. A senha real ficará na Cloud Function. !!!
    const REGISTRATION_KEY = "123456"; 

    const handleVerifyKey = (e) => {
        e.preventDefault();
        if (adminKey === REGISTRATION_KEY) {
            // Se a chave estiver correta, navega para a página de cadastro
            // e passa a chave de forma segura para a próxima página.
            navigate('/signup', { state: { verifiedAdminKey: adminKey } });
        } else {
            Swal.fire({
                title: 'Chave Incorreta',
                text: 'A chave de administrador fornecida está incorreta.',
                icon: 'error',
                confirmButtonText: 'Tentar Novamente'
            });
            setAdminKey('');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-button" onClick={onCancel}>X</button>
                <h2>Acesso Restrito</h2>
                <p>Para cadastrar um novo usuário, por favor, insira a chave de administrador.</p>
                <form onSubmit={handleVerifyKey}>
                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Digite a chave"
                            value={adminKey}
                            onChange={(e) => setAdminKey(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="modal-buttons">
                         <button type="submit" className="btn-confirm">Verificar e Continuar</button>
                         <button type="button" className="btn-cancel" onClick={onCancel}>Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationKeyModal;
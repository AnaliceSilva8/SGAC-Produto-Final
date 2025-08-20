// frontend/src/components/modals/ForgotPasswordModal.jsx
import React, { useState } from 'react';
import { auth } from '../../firebase-config/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import './ForgotPasswordModal.css';

function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      alert("Por favor, digite seu e-mail.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Solicitação enviada. Se seu e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
      onClose();
    } catch (error) {
      console.error("Erro no sendPasswordResetEmail:", error);
      alert("Solicitação enviada. Se seu e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleResetPassword}>
          <h2>Redefinir Senha</h2>
          <p>Digite seu e-mail abaixo. Enviaremos um link para você criar uma nova senha.</p>
          <div className="input-group">
            <label htmlFor="reset-email">E-mail</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              required
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="btn-save">Enviar Link</button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
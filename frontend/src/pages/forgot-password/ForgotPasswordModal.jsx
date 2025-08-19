// frontend/src/pages/forgot-password/ForgotPasswordModal.jsx
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
    
    // Nós SEMPRE mostraremos uma mensagem de sucesso para o usuário.
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      // Mesmo que ocorra um erro (ex: e-mail mal formatado),
      // nós o registramos no console para nós (desenvolvedores),
      // mas não mudamos a mensagem para o usuário final.
      console.error("Erro no sendPasswordResetEmail (não mostrar ao usuário):", error);
    }

    // A mensagem é a mesma, existindo o e-mail ou não.
    alert("Solicitação enviada. Se seu e-mail estiver cadastrado em nosso sistema, você receberá um link para redefinir sua senha em breve.");
    onClose(); // Fecha o modal
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
          <button type="submit" className="btn-login">Enviar Link</button>
          <button type="button" className="btn-register" onClick={onClose}>Cancelar</button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
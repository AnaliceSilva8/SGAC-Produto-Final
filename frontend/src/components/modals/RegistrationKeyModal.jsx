// frontend/src/components/modals/RegistrationKeyModal.jsx
import React, { useState } from 'react';
// Importe o CSS que já criamos para outros modais

function RegistrationKeyModal({ onAccessGranted, onCancel }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleVerifyKey = () => {
    if (key === process.env.REACT_APP_REGISTRATION_KEY) {
      onAccessGranted();
    } else {
      setError("Senha de acesso inválida.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Acesso Restrito</h2>
        <p>Insira a senha de administrador para criar um novo usuário.</p>
        <div className="input-group">
          <label htmlFor="registration-key">Senha de Administrador</label>
          <input id="registration-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} />
          {error && <p className="error-text">{error}</p>}
        </div>
        <div className="modal-buttons">
          <button type="button" className="btn-save" onClick={handleVerifyKey}>Verificar</button>
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
export default RegistrationKeyModal;
// frontend/src/components/modals/DeleteConfirmationModal.jsx

import React from 'react';
import './DeleteConfirmationModal.css';

// Este componente é mais simples e aceita a propriedade 'isOpen'
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
  
  // ESTA É A LINHA QUE RESOLVE O PROBLEMA:
  // Se 'isOpen' for falso, o modal não aparece.
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay-confirm">
      <div className="modal-content-confirm">
        <h2 className="modal-title-confirm">{title || 'Confirmar Ação'}</h2>
        <p className="modal-message-confirm">{message || 'Você tem certeza?'}</p>
        <div className="modal-actions-confirm">
          <button onClick={onClose} className="btn-cancel-confirm">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-delete-confirm">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;
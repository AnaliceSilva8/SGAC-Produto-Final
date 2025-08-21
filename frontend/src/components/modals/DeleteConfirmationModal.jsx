import React, { useState } from 'react';
import './DeleteConfirmationModal.css';

function DeleteConfirmationModal({
  onConfirm,
  onCancel,
  title = "Confirmar Exclusão",
  warningText = "Esta ação não pode ser desfeita.",
  checkboxLabel = "Sim, eu entendo as consequências e quero excluir.",
  confirmButtonText = "Excluir Permanentemente",
  children // Usaremos 'children' para a pergunta principal
}) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-modal">
        <h2>{title}</h2>
        
        <p>{children}</p> 

        <p className="warning-text">{warningText}</p>
        
        <div className="confirm-checkbox">
          <input 
            type="checkbox" 
            id="confirmDelete"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          <label htmlFor="confirmDelete">{checkboxLabel}</label>
        </div>

        <div className="modal-buttons">
          <button 
            className="btn-confirm-delete" 
            onClick={onConfirm}
            disabled={!isChecked}
          >
            {confirmButtonText}
          </button>
          <button className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;
// frontend/src/components/modals/DeleteConfirmationModal.jsx
import React, { useState } from 'react';
import './DeleteConfirmationModal.css';

function DeleteConfirmationModal({ clientName, onConfirm, onCancel }) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-modal">
        <h2>Confirmar Exclusão</h2>
        <p>
          Você tem certeza que deseja excluir permanentemente o cliente <strong>{clientName}</strong>?
        </p>
        <p className="warning-text">
          Esta ação não pode ser desfeita. Todos os dados, documentos e processos associados a este cliente serão perdidos.
        </p>
        
        <div className="confirm-checkbox">
          <input 
            type="checkbox" 
            id="confirmDelete"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          <label htmlFor="confirmDelete">Sim, eu entendo as consequências e quero excluir este cliente.</label>
        </div>

        <div className="modal-buttons">
          <button 
            className="btn-confirm-delete" 
            onClick={onConfirm}
            disabled={!isChecked}
          >
            Excluir Permanentemente
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
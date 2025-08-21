// frontend/src/components/modals/success/SuccessModal.jsx
import React from 'react';
import './SuccessModal.css';

function SuccessModal({ message, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
          <i className="fa-solid fa-check"></i>
        </div>
        <h2>Sucesso!</h2>
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="btn-ok" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;
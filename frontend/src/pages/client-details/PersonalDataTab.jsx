// frontend/src/pages/client-details/PersonalDataTab.jsx
import React from 'react';

// Este componente recebe os dados do cliente e apenas os exibe.
// No futuro, adicionaremos a lógica de edição aqui.
function PersonalDataTab({ clientData }) {
  return (
    <div className="personal-data-container">
      <div className="profile-picture-section">
        {/* Espaço para a foto do cliente */}
        <div className="picture-placeholder"></div>
        <button className="upload-btn">Carregar Foto</button>
      </div>
      <div className="data-grid">
        <div className="data-field">
          <label>NOME COMPLETO</label>
          <p>{clientData.NOMECLIENTE}</p>
        </div>
        <div className="data-field">
          <label>CPF</label>
          <p>{clientData.CPF}</p>
        </div>
        <div className="data-field">
          <label>DATA DE NASCIMENTO</label>
          <p>{new Date(clientData.DATANASCIMENTO).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
        </div>
        <div className="data-field">
          <label>IDADE</label>
          <p>{clientData.IDADE}</p>
        </div>
        {/* Adicione outros campos conforme necessário */}
      </div>
    </div>
  );
}

export default PersonalDataTab;
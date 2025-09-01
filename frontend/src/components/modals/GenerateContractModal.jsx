import React, { useState, useEffect } from 'react';
import './GenerateContractModal.css';
import Swal from 'sweetalert2';

const TIBAGI_CONTRACTS = [
  { id: 'honorarios_primeiros_pagamentos', label: 'Contrato de Honorários (Primeiros Pagamentos)' },
  { id: 'honorarios_geral', label: 'Contrato de Prestação de Serviços e Honorários' },
  { id: 'procuracao', label: 'Procuração' },
  { id: 'hipossuficiencia', label: 'Declaração de Hipossuficiência' },
  { id: 'termo_renuncia', label: 'Termo de Renúncia' },
];

const REQUIRED_FIELDS = {
  NOMECLIENTE: 'Nome Completo',
  ESTADOCIVIL: 'Estado Civil',
  PROFISSAO: 'Profissão',
  RG: 'RG',
  CPF: 'CPF',
  RUA: 'Rua',
  NUMERO: 'Número',
  TELEFONE: 'Telefone',
};

function GenerateContractModal({ client, onClose, onContractsGenerated }) {
  const [selected, setSelected] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    const fieldsToCheck = Object.keys(REQUIRED_FIELDS);
    const missing = fieldsToCheck.filter(field => !client[field] || String(client[field]).trim() === '');
    setMissingFields(missing);
  }, [client]);

  const handleSelect = (contractId) => {
    setSelected(prev =>
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const handleGenerate = async () => {
    if (missingFields.length > 0) {
      Swal.fire('Atenção!', 'Não é possível gerar documentos. Há dados obrigatórios faltando.', 'warning');
      return;
    }
    if (selected.length === 0) {
      Swal.fire('Atenção!', 'Selecione ao menos um documento para gerar.', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/gerar-contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          contractTypes: selected,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Falha na geração dos documentos.');
      }
      
      Swal.fire('Sucesso!', 'Documentos gerados e salvos na ficha do cliente!', 'success');
      onContractsGenerated();
      onClose();

    } catch (error) {
      Swal.fire('Erro!', error.message, 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const canGenerate = missingFields.length === 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Gerar Documentos (Unidade: Tibagi)</h2>
        <p>Selecione os documentos para <strong>{client.NOMECLIENTE}</strong>.</p>
        
        {!canGenerate && (
          <div className="error-message">
            <strong>Atenção:</strong> Faltam dados na ficha do cliente:
            <ul>
              {missingFields.map(field => (
                <li key={field}>{REQUIRED_FIELDS[field]}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="contract-list">
          {TIBAGI_CONTRACTS.map(contract => (
            <div key={contract.id} className="checkbox-item">
              <input
                type="checkbox"
                id={contract.id}
                checked={selected.includes(contract.id)}
                onChange={() => handleSelect(contract.id)}
                disabled={!canGenerate}
              />
              <label htmlFor={contract.id} style={{ color: !canGenerate ? '#999' : 'inherit' }}>
                {contract.label}
              </label>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} disabled={isLoading}>Cancelar</button>
          <button onClick={handleGenerate} disabled={isLoading || !canGenerate}>
            {isLoading ? 'Gerando...' : 'Gerar Documentos'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerateContractModal;
// frontend/src/pages/add-client/AddClientModal.jsx

import React, { useState, useEffect } from 'react';
// Corrigido: Removida a importação duplicada de 'db' e corrigido o caminho
import { db, auth } from '../../firebase-config/config'; 
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { IMaskInput } from 'react-imask';
import SuccessModal from '../../components/modals/success/SuccessModal';
// Corrigido: Ajustado o caminho para a função de log
import { logHistoryEvent } from '../../utils/historyLogger'; 
import './AddClientModal.css';


function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  cpf = cpf.split('').map(el => +el);
  const rest = (count) => (cpf.slice(0, count-12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11 % 10;
  return rest(10) === cpf[9] && rest(11) === cpf[10];
}

function AddClientModal({ onClose, onClientAdded }) {
  const [formData, setFormData] = useState({
    NOMECLIENTE: '', CPF: '', DATANASCIMENTO: '', IDADE: '', SEXO: '', TELEFONE: '',
    EMAIL: '', CIDADE: '', ESTADO: '', CEP: '', RUA: '', NUMERO: '', BAIRRO: '',
    COMPLEMENTO: '', ESTADOCIVIL: '', RG: '', PROFISSAO: '', ESCOLARIDADE: '',
    CNH: '', CTPS: '', NIT: '', SENHA_GOV: ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [user] = useAuthState(auth);
  const [userInfo, setUserInfo] = useState(null);
  
  const selectedLocation = localStorage.getItem('selectedLocation');

  useEffect(() => {
    const fetchUserInfo = async () => {
        if (user) {
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserInfo(userDoc.data());
            }
        }
    };
    fetchUserInfo();
  }, [user]);

  useEffect(() => {
    if (formData.DATANASCIMENTO) {
      const birthDate = new Date(formData.DATANASCIMENTO);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        setFormData(prevState => ({ ...prevState, IDADE: age >= 0 ? age.toString() : '' }));
      }
    } else {
        setFormData(prevState => ({ ...prevState, IDADE: '' }));
    }
  }, [formData.DATANASCIMENTO]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (Object.keys(errors).length > 0) setErrors({});
    const numericFields = ['RG', 'NUMERO', 'CNH', 'CTPS', 'NIT'];
    if (numericFields.includes(id)) {
      if (/^\d*$/.test(value)) {
        setFormData(prevState => ({ ...prevState, [id]: value }));
      }
    } else {
      setFormData(prevState => ({ ...prevState, [id]: value }));
    }
  };

  const handleMaskedInputChange = (value, fieldId) => {
    if (Object.keys(errors).length > 0) setErrors({});
    setFormData(prevState => ({ ...prevState, [fieldId]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.DATANASCIMENTO) {
        newErrors.DATANASCIMENTO = "Data de nascimento é um campo obrigatório.";
    } else {
        const birthDate = new Date(formData.DATANASCIMENTO);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (birthDate > today) {
            newErrors.DATANASCIMENTO = "A data de nascimento não pode ser no futuro.";
        }
    }
    if (formData.CPF && !isValidCPF(formData.CPF)) {
        newErrors.CPF = "O CPF digitado é inválido.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!formData.NOMECLIENTE || !formData.CPF) {
        alert("Nome e CPF são obrigatórios.");
        return;
    }

    setIsSaving(true);
    try {
      const clientsRef = collection(db, 'clientes');
      const q = query(clientsRef, where("CPF", "==", formData.CPF));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("Erro: Este CPF já está cadastrado no sistema.");
        setIsSaving(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'clientes'), {
        ...formData,
        LOCATION: selectedLocation,
        DATA_CADASTRO: serverTimestamp()
      });
      
      // LOG DE HISTÓRICO
      if(userInfo) {
          await logHistoryEvent(docRef.id, 'Cliente Cadastrado', userInfo.nome || user.email);
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      alert("Falha ao adicionar cliente.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClientAdded();
    onClose();
  };
  
  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <h2>Adicionar Novo Cliente</h2>
            <div className="form-grid">
              {/* SEU FORMULÁRIO CONTINUA AQUI, SEM MUDANÇAS */}
              <div className="input-group full-width">
                <label htmlFor="NOMECLIENTE">Nome Completo</label>
                <input id="NOMECLIENTE" type="text" value={formData.NOMECLIENTE} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="CPF">CPF</label>
                <IMaskInput
                  className="input-style" mask="000.000.000-00" id="CPF"
                  value={formData.CPF} onAccept={(value) => handleMaskedInputChange(value, 'CPF')}
                  placeholder="000.000.000-00" required
                />
                {errors.CPF && <p className="error-text">{errors.CPF}</p>}
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="DATANASCIMENTO">Data de Nascimento</label>
                  <input id="DATANASCIMENTO" type="date" value={formData.DATANASCIMENTO} onChange={handleInputChange} required />
                  {errors.DATANASCIMENTO && <p className="error-text">{errors.DATANASCIMENTO}</p>}
                </div>
                <div className="input-group input-group-small">
                  <label htmlFor="IDADE">Idade</label>
                  <input id="IDADE" type="text" value={formData.IDADE} readOnly disabled />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="RG">RG</label>
                <input id="RG" type="text" value={formData.RG} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="PROFISSAO">Profissão</label>
                <input id="PROFISSAO" type="text" value={formData.PROFISSAO} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="ESTADOCIVIL">Estado Civil</label>
                <select id="ESTADOCIVIL" value={formData.ESTADOCIVIL} onChange={handleInputChange}>
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                </select>
              </div>
              <div className="input-group">
                  <label htmlFor="SEXO">Sexo</label>
                  <select id="SEXO" value={formData.SEXO} onChange={handleInputChange}>
                      <option value="">Selecione...</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                  </select>
              </div>
              <div className="input-group">
                <label htmlFor="ESCOLARIDADE">Escolaridade</label>
                <select id="ESCOLARIDADE" value={formData.ESCOLARIDADE} onChange={handleInputChange}>
                  <option value="">Selecione...</option>
                  <option value="Sem escolaridade">Sem escolaridade</option>
                  <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                  <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                  <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                  <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                  <option value="Superior Incompleto">Superior Incompleto</option>
                  <option value="Superior Completo">Superior Completo</option>
                  <option value="Pós-graduação">Pós-graduação</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="SENHA_GOV">Senha GOV</label>
                <input id="SENHA_GOV" type="text" value={formData.SENHA_GOV} onChange={handleInputChange} />
              </div>
              <div className="input-group full-width"><hr /></div>
              <div className="input-group">
                <label htmlFor="CNH">CNH</label>
                <input id="CNH" type="text" value={formData.CNH} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="CTPS">CTPS</label>
                <input id="CTPS" type="text" value={formData.CTPS} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="NIT">NIT</label>
                <input id="NIT" type="text" value={formData.NIT} onChange={handleInputChange} />
              </div>
              <div className="input-group full-width"><hr /></div>
              <div className="input-group">
                <label htmlFor="EMAIL">E-mail</label>
                <input id="EMAIL" type="email" value={formData.EMAIL} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="TELEFONE">Telefone</label>
                <IMaskInput
                  className="input-style" mask="(00) 00000-0000" id="TELEFONE"
                  value={formData.TELEFONE} onAccept={(value) => handleMaskedInputChange(value, 'TELEFONE')}
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>
              <div className="input-group">
                <label htmlFor="CEP">CEP</label>
                <IMaskInput
                  className="input-style" mask="00000-000" id="CEP"
                  value={formData.CEP} onAccept={(value) => handleMaskedInputChange(value, 'CEP')}
                  placeholder="XXXXX-XXX"
                />
              </div>
              <div className="input-group">
                <label htmlFor="ESTADO">Estado</label>
                <input id="ESTADO" type="text" value={formData.ESTADO} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="CIDADE">Cidade</label>
                <input id="CIDADE" type="text" value={formData.CIDADE} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="BAIRRO">Bairro</label>
                <input id="BAIRRO" type="text" value={formData.BAIRRO} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="RUA">Rua</label>
                <input id="RUA" type="text" value={formData.RUA} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label htmlFor="NUMERO">Número</label>
                <input id="NUMERO" type="text" value={formData.NUMERO} onChange={handleInputChange} />
                {errors.NUMERO && <p className="error-text">{errors.NUMERO}</p>}
              </div>
              <div className="input-group full-width">
                <label htmlFor="COMPLEMENTO">Complemento</label>
                <input id="COMPLEMENTO" type="text" value={formData.COMPLEMENTO} onChange={handleInputChange} />
              </div>
            </div>
            <div className="modal-buttons">
              <button type="submit" className="btn-save" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
      {showSuccessModal && (
        <SuccessModal 
          message="Cliente adicionado com sucesso!" 
          onClose={handleSuccessModalClose} 
        />
      )}
    </>
  );
}

export default AddClientModal;
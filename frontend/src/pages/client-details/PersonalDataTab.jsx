import React from 'react';
import { IMaskInput } from 'react-imask';
import { FaUserCircle } from 'react-icons/fa';

// Componente reutilizável para os campos de dados
const DataField = ({ label, value, isEditing, children }) => (
    <div className="data-field">
        <label>{label}</label>
        {isEditing ? children : <p>{value || 'N/A'}</p>}
    </div>
);

const PersonalDataTab = ({
    client,
    formData,
    handleInputChange,
    handleMaskedInputChange,
    isEditing,
    errors,
    onSave,
    onCancel,
    onEdit,
    onDelete,
    photoPreview,
    onPhotoSelect,
    formatDate
}) => {

    const renderField = (label, id, options = {}) => {
        const { type = 'text', mask, selectOptions } = options;
        const displayValue = id === 'DATANASCIMENTO' ? formatDate(client[id]) : client[id];

        return (
            <DataField label={label} value={displayValue} isEditing={isEditing}>
                <>
                    {selectOptions ? (
                        <select id={id} value={formData[id] || ''} onChange={handleInputChange}>
                            {selectOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : mask ? (
                        <IMaskInput
                            mask={mask} id={id} value={formData[id] || ''}
                            onAccept={(val) => handleMaskedInputChange(val, id)}
                            className="input-style"
                        />
                    ) : (
                        <input
                            id={id} type={type} value={formData[id] || ''}
                            onChange={handleInputChange} disabled={id === 'IDADE'}
                        />
                    )}
                    {errors[id] && <p className="error-text">{errors[id]}</p>}
                </>
            </DataField>
        );
    };

    return (
        <>
            <div className="personal-data-layout">
                {/* --- Coluna da Esquerda: Foto --- */}
                <div className="photo-section">
                    <div className="photo-container">
                        <img 
                            src={photoPreview || formData.photoURL || 'placeholder.png'}
                            alt="Foto do Cliente" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                        <div className="photo-placeholder" style={{ display: (photoPreview || formData.photoURL) ? 'none' : 'flex' }}>
                            <FaUserCircle className="photo-placeholder-icon" />
                        </div>
                        
                        {isEditing && (
                            <label htmlFor="photo-upload" className="photo-edit-overlay">
                                Editar Foto
                                <input id="photo-upload" type="file" accept="image/*" onChange={onPhotoSelect} style={{ display: 'none' }}/>
                            </label>
                        )}
                    </div>
                </div>

                {/* --- Coluna da Direita: Dados --- */}
                <div className="data-grid full-width-grid">
                    {renderField("Nome Completo", "NOMECLIENTE")}
                    {renderField("CPF", "CPF", { mask: "000.000.000-00" })}
                    {renderField("Data de Nascimento", "DATANASCIMENTO", { type: 'date' })}
                    {renderField("Idade", "IDADE")}
                    {renderField("RG", "RG")}
                    {renderField("Sexo", "SEXO", { selectOptions: [ {value: "", label: "Selecione..."}, {value: "Feminino", label: "Feminino"}, {value: "Masculino", label: "Masculino"} ] })}
                    {renderField("Profissão", "PROFISSAO")}
                    {renderField("Estado Civil", "ESTADOCIVIL", { selectOptions: [ {value: "", label: "Selecione..."}, {value: "Solteiro(a)", label: "Solteiro(a)"}, {value: "Casado(a)", label: "Casado(a)"}, {value: "Divorciado(a)", label: "Divorciado(a)"}, {value: "Viúvo(a)", label: "Viúvo(a)"} ] })}
                    {renderField("Escolaridade", "ESCOLARIDADE", { selectOptions: [ {value: "", label: "Selecione..."}, {value: "Sem escolaridade", label: "Sem escolaridade"}, {value: "Ensino Fundamental Incompleto", label: "Ensino Fundamental Incompleto"}, {value: "Ensino Fundamental Completo", label: "Ensino Fundamental Completo"}, {value: "Ensino Médio Incompleto", label: "Ensino Médio Incompleto"}, {value: "Ensino Médio Completo", label: "Ensino Médio Completo"}, {value: "Superior Incompleto", label: "Superior Incompleto"}, {value: "Superior Completo", label: "Superior Completo"}, {value: "Pós-graduação", label: "Pós-graduação"} ] })}
                    {renderField("Telefone", "TELEFONE", { mask: "(00) 00000-0000" })}
                    {renderField("E-mail", "EMAIL", { type: 'email' })}
                    {renderField("Senha GOV", "SENHA_GOV")}
                    {renderField("CEP", "CEP", { mask: "00000-000" })}
                    {renderField("Estado", "ESTADO")}
                    {renderField("Cidade", "CIDADE")}
                    {renderField("Bairro", "BAIRRO")}
                    {renderField("Rua", "RUA")}
                    {renderField("Número", "NUMERO")}
                    {renderField("Complemento", "COMPLEMENTO")}
                    {renderField("CNH", "CNH")}
                    {renderField("CTPS", "CTPS")}
                    {renderField("NIT", "NIT")}
                </div>
            </div>
            
            <div className="action-buttons">
                {isEditing ? (
                    <>
                        <button className="action-btn primary" onClick={onSave}>Salvar Alterações</button>
                        <button className="action-btn" onClick={onCancel}>Cancelar</button>
                    </>
                ) : (
                    <>
                        <button className="action-btn primary" onClick={onEdit}>Editar Dados</button>
                        <button className="action-btn delete" onClick={onDelete}>Excluir Cliente</button>
                        <button className="action-btn">Gerar Contratos</button>
                    </>
                )}
            </div>
        </>
    );
};

export default PersonalDataTab;
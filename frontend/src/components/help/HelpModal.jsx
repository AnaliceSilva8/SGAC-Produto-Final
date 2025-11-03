import React from 'react';
import { useHelp } from '../../contexto/HelpContext'; // Puxa do seu novo hook
import './HelpModal.css'; 
import { FaTimes } from 'react-icons/fa'; // Ícone para fechar

function HelpModal() {
    const { isHelpModalOpen, setIsHelpModalOpen, helpContent } = useHelp();

    if (!isHelpModalOpen) {
        return null; // Não mostra nada se estiver fechado
    }

    // Conteúdo padrão caso uma página não defina sua própria ajuda
    const defaultContent = `
        <h2>Ajuda</h2>
        <p>Não há tópicos de ajuda disponíveis para esta página.</p>
    `;

    // Renderiza o conteúdo da página atual, ou o padrão
    const contentToRender = helpContent || defaultContent;

    return (
        <div className="help-modal-overlay" onClick={() => setIsHelpModalOpen(false)}>
            <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="help-modal-close-btn" onClick={() => setIsHelpModalOpen(false)}>
                    <FaTimes />
                </button>
                <div 
                    className="help-modal-body"
                    // Usamos isso para poder renderizar o HTML (<h2>, <ul>) que vem do contexto
                    dangerouslySetInnerHTML={{ __html: contentToRender }}
                />
            </div>
        </div>
    );
}

export default HelpModal;
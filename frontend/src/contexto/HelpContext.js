import React, { createContext, useState, useContext } from 'react';

// 1. Cria o Contexto
export const HelpContext = createContext();

// 2. Cria o Provedor (Componente que gerencia o estado)
export const HelpProvider = ({ children }) => {
    const [helpContent, setHelpContent] = useState(null); // Armazena o HTML/texto da ajuda
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); // Controla se o modal está visível

    // O valor que será compartilhado
    const value = {
        helpContent,
        setHelpContent,
        isHelpModalOpen,
        setIsHelpModalOpen
    };

    return (
        <HelpContext.Provider value={value}>
            {children}
        </HelpContext.Provider>
    );
};

// 3. Hook customizado (um atalho para usar o contexto)
export const useHelp = () => {
    return useContext(HelpContext);
};
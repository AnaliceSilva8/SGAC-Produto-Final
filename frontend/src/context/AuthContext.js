import React, { createContext, useState } from 'react';

// 1. Cria o Contexto
export const AuthContext = createContext();

// 2. Cria o Provedor (o componente que vai gerenciar o estado)
export const AuthProvider = ({ children }) => {
    
    // 3. Este é o estado que vai guardar a unidade atual
    // Ele tenta ler do localStorage, ou usa 'tibagi' como padrão.
    const [currentLocation, setCurrentLocationInternal] = useState(() => {
        return localStorage.getItem('currentLocation') || 'tibagi'; 
    });

    // 4. Esta função permite que outros componentes mudem a unidade
    // e também salva a escolha no localStorage para persistir
    const setCurrentLocation = (location) => {
        localStorage.setItem('currentLocation', location);
        setCurrentLocationInternal(location);
    };

    // 5. O valor que será compartilhado com todos os componentes filhos
    const value = {
        currentLocation,
        setCurrentLocation
        // Você pode adicionar o 'currentUser' aqui também se quiser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// frontend/src/hooks/useUserRole.js

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config/config';

export function useUserRole() {
    const [user] = useAuthState(auth);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getRole = async () => {
            if (user) {
                try {
                    const idTokenResult = await user.getIdTokenResult();
                    setRole(idTokenResult.claims.perfil || 'normal');
                } catch (error) {
                    console.error("Erro ao obter o perfil do usuário:", error);
                    setRole('normal'); // Define um perfil padrão em caso de erro
                }
            }
            setLoading(false);
        };

        getRole();
    }, [user]);

    return { role, loading };
}
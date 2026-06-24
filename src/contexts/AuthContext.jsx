import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('vtme_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('vtme_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifySession = async () => {
            if (token) {
                try {
                    const currentUser = await authService.getMe();
                    setUser(currentUser);
                    localStorage.setItem('vtme_user', JSON.stringify(currentUser));
                } catch (e) {
                    console.error('Sessão expirada ou inválida ao restaurar:', e.message);
                    handleLogout();
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        verifySession();

        const handleUnauthorized = () => {
            handleLogout();
        };

        window.addEventListener('unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, [token]);

    const handleLogin = async (email, senha) => {
        setLoading(true);
        try {
            const data = await authService.login(email, senha);
            setToken(data.token);
            setUser(data.user);
            return data.user;
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setUser(null);
        setToken(null);
        await authService.logout();
    };

    const handleAlterarSenha = async (senhaAntiga, novaSenha) => {
        if (!user) throw new Error('Não há usuário autenticado');
        try {
            await authService.alterarSenha(user.id, senhaAntiga, novaSenha);
            
            // Atualiza o estado local do usuário após alterar a senha com sucesso (removendo trocar_senha se houver)
            const updatedUser = { ...user, trocar_senha: false };
            setUser(updatedUser);
            localStorage.setItem('vtme_user', JSON.stringify(updatedUser));
            
            // Re-gera token buscando informações atuais
            const freshUser = await authService.getMe();
            setUser(freshUser);
            localStorage.setItem('vtme_user', JSON.stringify(freshUser));
        } catch (error) {
            throw error;
        }
    };

    const value = {
        user,
        token,
        loading,
        login: handleLogin,
        logout: handleLogout,
        alterarSenha: handleAlterarSenha,
        isAuthenticated: !!user && !!token
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
    }
    return context;
}

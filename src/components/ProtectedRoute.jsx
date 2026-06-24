import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedProfiles = [], children }) {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#0F172A',
                color: 'var(--primary)'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderLeftColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Se exige a troca de senha no primeiro login, impede a navegação normal e força a troca
    if (user.trocar_senha && location.pathname !== '/login') {
        return <Navigate to="/login" replace />;
    }

    // Valida permissão baseada no perfil
    if (allowedProfiles.length > 0 && !allowedProfiles.includes(user.perfil)) {
        // Redireciona para a página padrão inicial do perfil
        return <Navigate to="/" replace />;
    }

    return children;
}

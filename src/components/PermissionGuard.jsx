import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function PermissionGuard({ allowedProfiles = [], fallback = null, children }) {
    const { user } = useAuth();
    
    if (!user || !allowedProfiles.includes(user.perfil)) {
        return fallback;
    }
    
    return <>{children}</>;
}

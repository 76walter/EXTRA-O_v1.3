export function permissionMiddleware(allowedProfiles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { perfil } = req.user;

        if (allowedProfiles.includes(perfil)) {
            return next();
        }

        console.warn(`⚠️ Acesso negado: Usuário "${req.user.email}" (${perfil}) tentou acessar recurso restrito a: ${allowedProfiles.join(', ')}`);
        return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso' });
    };
}

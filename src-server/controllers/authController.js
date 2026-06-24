import { authService } from '../services/authService.js';

export const authController = {
    async login(req, res) {
        try {
            const { email, senha } = req.body;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            
            const result = await authService.login(email, senha, ip);
            return res.json(result);
        } catch (error) {
            console.error('❌ Erro no login:', error.message);
            return res.status(401).json({ error: error.message });
        }
    },

    async logout(req, res) {
        try {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            
            if (req.user) {
                await authService.logout(req.user.id, req.user.nome, req.user.perfil, ip);
            }
            return res.json({ success: true, message: 'Logout realizado com sucesso' });
        } catch (error) {
            console.error('❌ Erro no logout:', error.message);
            return res.status(500).json({ error: error.message });
        }
    },

    async me(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        return res.json({ user: req.user });
    }
};

import jwt from 'jsonwebtoken';
import { ENV, INTERNAL_API_KEY } from '../config/env.js';
import { usuarioModel } from '../models/usuarioModel.js';

export async function authMiddleware(req, res, next) {
    const internalKey = req.headers['x-internal-key'];
    if (internalKey && internalKey === INTERNAL_API_KEY) {
        req.user = { id: 0, nome: 'Sistema', perfil: 'ADMIN', trocar_senha: false };
        return next();
    }

    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido' });
    }

    try {
        const secret = ENV.JWT_SECRET || 'extracao_inteligente_jwt_secret_key_2026_premium_key';
        const decoded = jwt.verify(token, secret);

        // Verifica no banco se o usuário ainda existe e está ativo
        const user = await usuarioModel.buscarPorId(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado no sistema' });
        }

        if (!user.ativo) {
            return res.status(403).json({ error: 'Sua conta foi desativada' });
        }

        // Adiciona informações do usuário à requisição
        req.user = {
            id: Number(user.id),
            nome: user.nome,
            email: user.email,
            perfil: user.perfil,
            trocar_senha: Boolean(user.trocar_senha)
        };

        next();
    } catch (error) {
        console.error('❌ Erro na validação do token JWT:', error.message);
        return res.status(401).json({ error: 'Sessão expirada ou token inválido. Por favor, faça login novamente.' });
    }
}

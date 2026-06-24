import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { usuarioModel } from '../models/usuarioModel.js';

export const authService = {
    async login(email, senha, ip) {
        if (!email || !senha) {
            throw new Error('E-mail e senha são obrigatórios');
        }

        const user = await usuarioModel.buscarPorEmail(email);

        if (!user) {
            throw new Error('E-mail ou senha incorretos');
        }

        if (!user.ativo) {
            throw new Error('Esta conta foi desativada. Entre em contato com o administrador.');
        }

        const isPasswordValid = await bcrypt.compare(senha, user.senha_hash);

        if (!isPasswordValid) {
            throw new Error('E-mail ou senha incorretos');
        }

        const jwtSecret = ENV.JWT_SECRET || 'extracao_inteligente_jwt_secret_key_2026_premium_key';
        const jwtExpires = ENV.JWT_EXPIRES_IN || '24h';

        const token = jwt.sign(
            {
                id: Number(user.id),
                nome: user.nome,
                email: user.email,
                perfil: user.perfil,
                trocar_senha: Boolean(user.trocar_senha)
            },
            jwtSecret,
            { expiresIn: jwtExpires }
        );

        // Registrar log de acesso
        await usuarioModel.registrarLogAcesso(
            Number(user.id),
            user.nome,
            user.perfil,
            'LOGIN',
            'Tela de Login',
            ip || '127.0.0.1'
        );

        return {
            token,
            user: {
                id: Number(user.id),
                nome: user.nome,
                email: user.email,
                perfil: user.perfil,
                trocar_senha: Boolean(user.trocar_senha)
            }
        };
    },

    async logout(userId, nomeUsuario, perfil, ip) {
        await usuarioModel.registrarLogAcesso(
            userId,
            nomeUsuario,
            perfil,
            'LOGOUT',
            'Menu Lateral',
            ip || '127.0.0.1'
        );
        return true;
    }
};

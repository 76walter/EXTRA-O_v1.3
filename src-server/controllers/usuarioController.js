import { usuarioService } from '../services/usuarioService.js';

export const usuarioController = {
    async listar(req, res) {
        try {
            const users = await usuarioService.listarTodos();
            return res.json(users);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    async criar(req, res) {
        try {
            const { nome, email, senha, perfil } = req.body;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            
            const novoUser = await usuarioService.criar(nome, email, senha, perfil, req.user, ip);
            return res.status(201).json(novoUser);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },

    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, email, perfil, ativo } = req.body;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            const user = await usuarioService.atualizar(Number(id), nome, email, perfil, ativo, req.user, ip);
            return res.json(user);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },

    async alterarSenha(req, res) {
        try {
            const { id } = req.params;
            const { senhaAntiga, novaSenha } = req.body;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            // Garante que um usuário só pode alterar a própria senha, a menos que seja ADMIN
            if (Number(id) !== Number(req.user.id) && req.user.perfil !== 'ADMIN') {
                return res.status(403).json({ error: 'Você não tem permissão para alterar a senha de outro usuário' });
            }

            await usuarioService.alterarSenha(Number(id), senhaAntiga, novaSenha, req.user, ip);
            return res.json({ success: true, message: 'Senha alterada com sucesso' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },

    async resetarSenhaForcado(req, res) {
        try {
            const { id } = req.params;
            const { novaSenha } = req.body;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            await usuarioService.resetarSenhaForcado(Number(id), novaSenha, req.user, ip);
            return res.json({ success: true, message: 'Senha resetada com sucesso pelo administrador' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },

    async alterarStatus(req, res) {
        try {
            const { id } = req.params;
            const { ativo } = req.body;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            await usuarioService.alterarStatus(Number(id), ativo, req.user, ip);
            return res.json({ success: true, message: `Status do usuário alterado para ${ativo ? 'ATIVO' : 'INATIVO'}` });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },

    async excluir(req, res) {
        try {
            const { id } = req.params;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

            await usuarioService.excluir(Number(id), req.user, ip);
            return res.json({ success: true, message: 'Usuário excluído com sucesso' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },

    async listarLogs(req, res) {
        try {
            const logs = await usuarioService.listarLogs(req.user);
            return res.json(logs);
        } catch (error) {
            return res.status(403).json({ error: error.message });
        }
    }
};

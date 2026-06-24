import { getDbConnection } from '../database/mariadb.js';

export const usuarioModel = {
    async buscarPorEmail(email) {
        let conn;
        try {
            conn = await getDbConnection();
            const rows = await conn.query('SELECT * FROM usuarios WHERE email = ?', [email]);
            return rows.length > 0 ? rows[0] : null;
        } finally {
            if (conn) conn.release();
        }
    },

    async buscarPorId(id) {
        let conn;
        try {
            conn = await getDbConnection();
            const rows = await conn.query('SELECT * FROM usuarios WHERE id = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        } finally {
            if (conn) conn.release();
        }
    },

    async criarUsuario(nome, email, senhaHash, perfil, trocarSenha = true) {
        let conn;
        try {
            conn = await getDbConnection();
            const result = await conn.query(
                'INSERT INTO usuarios (nome, email, senha_hash, perfil, trocar_senha, ativo) VALUES (?, ?, ?, ?, ?, TRUE)',
                [nome, email, senhaHash, perfil, trocarSenha]
            );
            return { id: Number(result.insertId), nome, email, perfil, trocar_senha: trocarSenha, ativo: true };
        } finally {
            if (conn) conn.release();
        }
    },

    async atualizarUsuario(id, nome, email, perfil, ativo) {
        let conn;
        try {
            conn = await getDbConnection();
            await conn.query(
                'UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ? WHERE id = ?',
                [nome, email, perfil, ativo ? 1 : 0, id]
            );
            return { id, nome, email, perfil, ativo };
        } finally {
            if (conn) conn.release();
        }
    },

    async atualizarSenha(id, senhaHash, trocarSenha = false) {
        let conn;
        try {
            conn = await getDbConnection();
            await conn.query(
                'UPDATE usuarios SET senha_hash = ?, trocar_senha = ? WHERE id = ?',
                [senhaHash, trocarSenha ? 1 : 0, id]
            );
            return true;
        } finally {
            if (conn) conn.release();
        }
    },

    async atualizarStatus(id, ativo) {
        let conn;
        try {
            conn = await getDbConnection();
            await conn.query('UPDATE usuarios SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
            return true;
        } finally {
            if (conn) conn.release();
        }
    },

    async excluirUsuario(id) {
        let conn;
        try {
            conn = await getDbConnection();
            await conn.query('DELETE FROM usuarios WHERE id = ?', [id]);
            return true;
        } finally {
            if (conn) conn.release();
        }
    },

    async listarTodos() {
        let conn;
        try {
            conn = await getDbConnection();
            const rows = await conn.query('SELECT id, nome, email, perfil, ativo, trocar_senha, criado_em, atualizado_em FROM usuarios ORDER BY nome ASC');
            // Converter BigInts ou objetos para tipos normais se houver
            return rows.map(r => ({
                id: Number(r.id),
                nome: r.nome,
                email: r.email,
                perfil: r.perfil,
                ativo: Boolean(r.ativo),
                trocar_senha: Boolean(r.trocar_senha),
                criado_em: r.criado_em,
                atualizado_em: r.atualizado_em
            }));
        } finally {
            if (conn) conn.release();
        }
    },

    async registrarLogAcesso(usuarioId, nomeUsuario, perfil, acao, tela, ip) {
        let conn;
        try {
            conn = await getDbConnection();
            const result = await conn.query(
                'INSERT INTO logs_acesso (usuario_id, nome_usuario, perfil, acao, tela, ip) VALUES (?, ?, ?, ?, ?, ?)',
                [usuarioId, nomeUsuario, perfil, acao, tela, ip]
            );
            return { id: Number(result.insertId) };
        } catch (e) {
            console.error('Falha ao registrar log de acesso no MariaDB:', e.message);
            return null;
        } finally {
            if (conn) conn.release();
        }
    },

    async listarLogs(limit = 100) {
        let conn;
        try {
            conn = await getDbConnection();
            const rows = await conn.query(
                'SELECT * FROM logs_acesso ORDER BY data_hora DESC LIMIT ?',
                [Number(limit)]
            );
            return rows.map(r => ({
                id: Number(r.id),
                usuario_id: r.usuario_id ? Number(r.usuario_id) : null,
                nome_usuario: r.nome_usuario,
                perfil: r.perfil,
                acao: r.acao,
                tela: r.tela,
                data_hora: r.data_hora,
                ip: r.ip
            }));
        } finally {
            if (conn) conn.release();
        }
    }
};

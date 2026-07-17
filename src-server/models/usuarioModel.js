import { getDb } from '../database/database.js';

export const usuarioModel = {
    buscarPorEmail(email) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
        return row || null;
    },

    buscarPorId(id) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
        return row || null;
    },

    criarUsuario(nome, email, senhaHash, perfil, trocarSenha = true) {
        const db = getDb();
        const info = db.prepare(
            'INSERT INTO usuarios (nome, email, senha_hash, perfil, trocar_senha, ativo) VALUES (?, ?, ?, ?, ?, 1)'
        ).run(nome, email, senhaHash, perfil, trocarSenha ? 1 : 0);
        return { id: info.lastInsertRowid, nome, email, perfil, trocar_senha: trocarSenha, ativo: true };
    },

    atualizarUsuario(id, nome, email, perfil, ativo) {
        const db = getDb();
        db.prepare(
            'UPDATE usuarios SET nome = ?, email = ?, perfil = ?, ativo = ? WHERE id = ?'
        ).run(nome, email, perfil, ativo ? 1 : 0, id);
        return { id, nome, email, perfil, ativo };
    },

    atualizarSenha(id, senhaHash, trocarSenha = false) {
        const db = getDb();
        db.prepare(
            'UPDATE usuarios SET senha_hash = ?, trocar_senha = ? WHERE id = ?'
        ).run(senhaHash, trocarSenha ? 1 : 0, id);
        return true;
    },

    atualizarStatus(id, ativo) {
        const db = getDb();
        db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo ? 1 : 0, id);
        return true;
    },

    excluirUsuario(id) {
        const db = getDb();
        db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
        return true;
    },

    listarTodos() {
        const db = getDb();
        const rows = db.prepare('SELECT id, nome, email, perfil, ativo, trocar_senha, criado_em, atualizado_em FROM usuarios ORDER BY nome ASC').all();
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
    },

    registrarLogAcesso(usuarioId, nomeUsuario, perfil, acao, tela, ip) {
        try {
            const db = getDb();
            const info = db.prepare(
                'INSERT INTO logs_acesso (usuario_id, nome_usuario, perfil, acao, tela, ip) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(usuarioId, nomeUsuario, perfil, acao, tela, ip);
            return { id: Number(info.lastInsertRowid) };
        } catch (e) {
            console.error('Falha ao registrar log de acesso no SQLite:', e.message);
            return null;
        }
    },

    listarLogs(limit = 100) {
        const db = getDb();
        const rows = db.prepare(
            'SELECT * FROM logs_acesso ORDER BY data_hora DESC LIMIT ?'
        ).all(Number(limit));
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
    }
};

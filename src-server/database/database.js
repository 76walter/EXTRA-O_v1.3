import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';
import path from 'path';

let db = null;

/**
 * Retorna a instância do banco SQLite (síncrona).
 * Todas as operações de leitura/escrita são feitas diretamente com db.prepare().
 */
export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Inicializa o banco de dados SQLite.
 * Cria o arquivo .db, as tabelas e o admin padrão se necessário.
 */
export async function initDatabase() {
    const dbPath = ENV.DB_PATH || path.join(process.cwd(), 'extracao_sistema.db');
    const resolvedPath = path.resolve(process.cwd(), dbPath);

    console.log(`🔌 Abrindo banco de dados SQLite em: ${resolvedPath}`);

    try {
        db = new Database(resolvedPath);

        // Configurações de performance para SQLite
        db.pragma('journal_mode = WAL');    // Write-Ahead Logging para melhor concorrência
        db.pragma('foreign_keys = ON');     // Habilita foreign keys (desabilitado por padrão no SQLite)
        db.pragma('busy_timeout = 5000');   // Aguarda 5s se o banco estiver bloqueado

        console.log('✅ Banco de dados SQLite aberto com sucesso!');
    } catch (error) {
        console.error('❌ Erro crítico ao abrir banco de dados SQLite:', error.message);
        throw error;
    }

    try {
        console.log('📑 Criando tabelas caso não existam...');

        // Tabela de usuários
        db.exec(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha_hash TEXT NOT NULL,
                perfil TEXT NOT NULL CHECK(perfil IN ('ADMIN', 'GERENTE', 'SUPERVISOR', 'CONSULTOR', 'CHURN')),
                ativo INTEGER DEFAULT 1,
                trocar_senha INTEGER DEFAULT 1,
                criado_em TEXT DEFAULT (datetime('now', 'localtime')),
                atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
            );
        `);

        // Trigger para atualizar atualizado_em automaticamente (SQLite não tem ON UPDATE CURRENT_TIMESTAMP)
        db.exec(`
            CREATE TRIGGER IF NOT EXISTS trg_usuarios_atualizado_em
            AFTER UPDATE ON usuarios
            FOR EACH ROW
            BEGIN
                UPDATE usuarios SET atualizado_em = datetime('now', 'localtime') WHERE id = NEW.id;
            END;
        `);

        // Tabela de logs de acesso
        db.exec(`
            CREATE TABLE IF NOT EXISTS logs_acesso (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NULL,
                nome_usuario TEXT NOT NULL,
                perfil TEXT NOT NULL,
                acao TEXT NOT NULL,
                tela TEXT NOT NULL,
                data_hora TEXT DEFAULT (datetime('now', 'localtime')),
                ip TEXT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            );
        `);

        // Cria usuário ADMIN padrão se não existir nenhum
        const adminRow = db.prepare('SELECT * FROM usuarios WHERE perfil = ?').get('ADMIN');

        if (!adminRow) {
            console.log('⚡ Nenhum usuário ADMIN encontrado. Criando admin padrão...');
            const defaultEmail = 'admin@sistema.com';
            const defaultPass = 'admin123';
            const hash = await bcrypt.hash(defaultPass, 10);

            db.prepare(
                'INSERT INTO usuarios (nome, email, senha_hash, perfil, trocar_senha) VALUES (?, ?, ?, ?, ?)'
            ).run('Administrador Padrão', defaultEmail, hash, 'ADMIN', 1);

            console.log(`✅ Usuário administrador criado: ${defaultEmail} / ${defaultPass}`);
        } else {
            console.log('✅ Usuários administradores já existem no banco.');
        }

    } catch (error) {
        console.error('❌ Erro ao criar tabelas ou usuário admin no SQLite:', error.message);
        throw error;
    }
}

/**
 * Fecha o banco de dados de forma limpa (para graceful shutdown).
 */
export function closeDatabase() {
    if (db) {
        try {
            db.close();
            console.log('🔒 Banco de dados SQLite fechado.');
        } catch (e) {
            console.error('Erro ao fechar SQLite:', e.message);
        }
        db = null;
    }
}

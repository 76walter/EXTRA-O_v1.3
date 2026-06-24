import mariadb from 'mariadb';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';

// Pool de conexões principal (será inicializado após garantir que o banco existe)
let pool = null;

export async function getDbConnection() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initDatabase() first.');
    }
    return await pool.getConnection();
}

export async function initDatabase() {
    const dbHost = ENV.DB_HOST || 'localhost';
    const dbPort = Number(ENV.DB_PORT) || 3306;
    const dbUser = ENV.DB_USER || 'root';
    const dbPassword = ENV.DB_PASSWORD === undefined ? '' : String(ENV.DB_PASSWORD);
    const dbName = ENV.DB_DATABASE || 'extracao_sistema';

    console.log(`🔌 Conectando ao MariaDB em ${dbHost}:${dbPort} como ${dbUser}...`);

    let conn;
    try {
        // 1. Conecta temporariamente sem especificar o banco de dados para garantir que ele exista
        conn = await mariadb.createConnection({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword
        });

        console.log(`✅ Conexão inicial estabelecida. Garantindo existência do banco "${dbName}"...`);
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await conn.end();
    } catch (error) {
        if (conn) await conn.end().catch(() => {});
        console.error('❌ Erro crítico ao conectar ao MariaDB para criar banco de dados:', error.message);
        throw error;
    }

    // 2. Inicializa o Pool de Conexões principal com o banco correto
    pool = mariadb.createPool({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        connectionLimit: 10,
        compress: true
    });

    // 3. Cria as tabelas necessárias
    let dbConn;
    try {
        dbConn = await pool.getConnection();

        console.log('📑 Criando tabelas caso não existam...');
        
        // Tabela de usuários
        await dbConn.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(150) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                senha_hash VARCHAR(255) NOT NULL,
                perfil ENUM('ADMIN', 'GERENTE', 'SUPERVISOR', 'CONSULTOR', 'CHURN') NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                trocar_senha BOOLEAN DEFAULT TRUE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Tabela de logs de acesso
        await dbConn.query(`
            CREATE TABLE IF NOT EXISTS logs_acesso (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NULL,
                nome_usuario VARCHAR(150) NOT NULL,
                perfil VARCHAR(50) NOT NULL,
                acao VARCHAR(255) NOT NULL,
                tela VARCHAR(150) NOT NULL,
                data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip VARCHAR(45) NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Cria usuário ADMIN padrão se não existir nenhum
        const adminRows = await dbConn.query('SELECT * FROM usuarios WHERE perfil = "ADMIN"');
        if (adminRows.length === 0) {
            console.log('⚡ Nenhum usuário ADMIN encontrado. Criando admin padrão...');
            const defaultEmail = 'admin@sistema.com';
            const defaultPass = 'admin123';
            const hash = await bcrypt.hash(defaultPass, 10);

            await dbConn.query(
                'INSERT INTO usuarios (nome, email, senha_hash, perfil, trocar_senha) VALUES (?, ?, ?, ?, ?)',
                ['Administrador Padrão', defaultEmail, hash, 'ADMIN', true]
            );
            console.log(`✅ Usuário administrador criado: ${defaultEmail} / ${defaultPass}`);
        } else {
            console.log('✅ Usuários administradores já existem no banco.');
        }

    } catch (error) {
        console.error('❌ Erro ao criar tabelas ou usuário admin no MariaDB:', error.message);
        throw error;
    } finally {
        if (dbConn) dbConn.release();
    }
}

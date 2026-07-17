import express from 'express';
import cors from 'cors';
import http from 'http';
import { ENV } from './config/env.js';
import { initSocketService } from './services/socket.js';
import { routes as legacyRoutes } from './routes/legacy_routes.js';
import { whatsappRoutes } from './routes/whatsapp_routes.js';
import { initHeadedBrowser, closeBrowsers } from './browser/manager.js';
import { initDatabase, closeDatabase } from './database/database.js';
import { authRoutes } from './routes/authRoutes.js';
import { usuarioRoutes } from './routes/usuarioRoutes.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Rotas de autenticação públicas e privadas
app.use('/api/auth', authRoutes);

// Rotas de usuários privadas
app.use('/api/usuarios', usuarioRoutes);

// Rota pública para abrir o Bloco de Notas (Notepad)
app.post('/api/open-notepad', (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Nenhum texto fornecido' });
    }
    try {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, `mascara_3c_${Date.now()}.txt`);
        fs.writeFileSync(filePath, text, 'utf-8');
        
        exec(`notepad.exe "${filePath}"`, (err) => {
            if (err) {
                console.error('[Server] Erro ao abrir Notepad:', err);
            }
        });
        
        res.json({ success: true, file: filePath });
    } catch (error) {
        console.error('[Server] Erro no /api/open-notepad:', error);
        res.status(500).json({ error: error.message });
    }
});

// Protege as rotas legadas e WhatsApp com JWT
app.use('/', authMiddleware, legacyRoutes);
app.use('/api/whatsapp', authMiddleware, whatsappRoutes);

// Inicia o serviço de WebSockets
initSocketService(httpServer);

const PORT = ENV.PORT || 3001;

// Inicializa o SQLite antes de iniciar o servidor Express
initDatabase().then(() => {
    httpServer.listen(PORT, async () => {
        console.log(`🚀 Ponte Modular rodando em http://localhost:${PORT}`);
        console.log(`✅ Fase 2 de Refatoração Concluída. Módulos Desacoplados!`);
        try {
            const ctx = await initHeadedBrowser();
            const currentPages = ctx.pages();
            let appPage = currentPages.find(p => p.url().includes('localhost:5173'));
            
            if (!appPage) {
                const blankPage = currentPages.find(p => p.url() === 'about:blank' || p.url() === '');
                if (blankPage) {
                    appPage = blankPage;
                } else {
                    appPage = await ctx.newPage();
                }
                console.log("🚀 Abrindo Interface do Sistema...");
                await appPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
                    console.log("⚠️ Frontend não está rodando no 5173 ou demorou a responder.");
                });
            }
        } catch (e) {
            console.error("❌ Erro crítico no arranque do navegador visível:", e.message);
        }
    });
}).catch(err => {
    console.error("❌ Erro fatal ao iniciar banco de dados SQLite. Servidor parado:", err.message);
    process.exit(1);
});

// ===== GRACEFUL SHUTDOWN =====
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Sinal ${signal} recebido. Desligamento gracioso...`);
    try {
        console.log('🔄 Fechando contexto(s) do navegador...');
        await closeBrowsers();
    } catch (e) {
        console.error('Erro ao fechar navegador:', e.message);
    }
    closeDatabase();
    console.log('👋 Até logo!');
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    console.error('❌ Exceção não tratada:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Promise rejeitada:', reason);
});

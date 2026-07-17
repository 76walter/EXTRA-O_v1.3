import { Server } from 'socket.io';
import { isExtractingTim, isExtracting, setExtractingTim, setExtracting } from '../browser/manager.js';
import { ENV, INTERNAL_API_KEY } from '../config/env.js';

let connectedClients = 0;
let vtmeLoopTimer = null;
let timLoopTimer = null;
let ioInstance = null;
let isVtmePaused = false;

export function initSocketService(httpServer) {
    ioInstance = new Server(httpServer, {
        cors: { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }
    });

    ioInstance.on('connection', (socket) => {
        console.log('🔗 Cliente conectado via WebSocket:', socket.id);
        connectedClients++;
        
        const perfil = socket.handshake.query.perfil || 'UNKNOWN';
        socket.perfil = perfil;
        console.log(`👤 Perfil do cliente conectado: ${perfil}`);
        
        socket.emit('vtme_pause_status', isVtmePaused);

        socket.on('set_vtme_pause', (paused) => {
            isVtmePaused = !!paused;
            console.log(`⏸️ [VTME Loop] Alterado estado de pausa para: ${isVtmePaused}`);
            ioInstance.emit('vtme_pause_status', isVtmePaused);
        });

        if (connectedClients === 1) {
            console.log('Iniciando loops internos de extração...');
            runVTME();
            runTIM();
        }

        socket.on('disconnect', () => {
            connectedClients--;
            console.log('🔗 Cliente desconectado. Total agora:', connectedClients);
            if (connectedClients <= 0) {
                connectedClients = 0;
                console.log('Pausando loops internos...');
                clearTimeout(vtmeLoopTimer);
                clearTimeout(timLoopTimer);
            }
        });
    });

    return ioInstance;
}

export function emitVtmeData(data) {
    if (ioInstance) {
        ioInstance.emit('vtme_data', data);
        if (data.message) {
            ioInstance.emit('status_update', { text: data.message, active: data.success });
        }
    }
}

export function emitTimData(data) {
    if (ioInstance) {
        ioInstance.emit('tim_data', data);
        if (data.message) {
            ioInstance.emit('status_update', { text: data.message, active: data.success });
        }
    }
}

async function runVTME() {
    // A pedido do usuário, a extração automática do VTME foi desativada.
    // Ela só iniciará quando o botão "Extrair do VTME" for clicado no frontend.
    console.log("ℹ️ [VTME Loop] Extração automática em background desativada. Aguardando gatilho manual.");
}

async function runTIM() {
    // A pedido do usuário, a extração automática do TIM foi desativada.
    // Ela só iniciará quando o botão "Extrair do App" for clicado no frontend.
    console.log("ℹ️ [TIM Loop] Extração automática em background desativada. Aguardando gatilho manual.");
}

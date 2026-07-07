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
    if (connectedClients === 0) return;
    if (isVtmePaused) {
        console.log("⏸️ [VTME Loop] Extração VTME automática suspensa (Pausada).");
        vtmeLoopTimer = setTimeout(runVTME, 15000);
        return;
    }
    try {
        const r = await fetch(`http://localhost:${ENV.PORT}/extract-vtme-auto`, {
            headers: { 'x-internal-key': INTERNAL_API_KEY }
        });
        if (r.ok) {
            const data = await r.json();
            emitVtmeData(data);
        }
    } catch (e) {
        console.error("VTME loop error", e.message);
    } finally {
        if (connectedClients > 0) {
            vtmeLoopTimer = setTimeout(runVTME, 15000);
        }
    }
}

async function runTIM() {
    if (connectedClients === 0) return;

    // Verifica se há algum cliente conectado que não seja CHURN
    const sockets = ioInstance ? Array.from(ioInstance.sockets.sockets.values()) : [];
    const hasNonChurnClient = sockets.some(s => s.perfil !== 'CHURN');

    if (!hasNonChurnClient) {
        console.log('⏸️ [TIM Loop] Varredura TIM suspensa pois o único usuário conectado é do perfil CHURN.');
        if (connectedClients > 0) {
            timLoopTimer = setTimeout(runTIM, 300000); // 5 minutos
        }
        return;
    }

    try {
        const r = await fetch(`http://localhost:${ENV.PORT}/extract-tim`, {
            headers: { 'x-internal-key': INTERNAL_API_KEY }
        });
        if (r.ok) {
            const data = await r.json();
            emitTimData(data);
        }
    } catch (e) {
        console.error("TIM loop error", e.message);
    } finally {
        if (connectedClients > 0) {
            timLoopTimer = setTimeout(runTIM, 300000); // 5 minutos
        }
    }
}

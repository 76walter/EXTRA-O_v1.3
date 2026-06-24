import { Server } from 'socket.io';
import { isExtractingTim, isExtracting, setExtractingTim, setExtracting } from '../browser/manager.js';
import { ENV, INTERNAL_API_KEY } from '../config/env.js';

let connectedClients = 0;
let vtmeLoopTimer = null;
let timLoopTimer = null;
let ioInstance = null;

export function initSocketService(httpServer) {
    ioInstance = new Server(httpServer, {
        cors: { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }
    });

    ioInstance.on('connection', (socket) => {
        console.log('🔗 Cliente conectado via WebSocket:', socket.id);
        connectedClients++;
        
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
            vtmeLoopTimer = setTimeout(runVTME, 45000);
        }
    }
}

async function runTIM() {
    if (connectedClients === 0) return;
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

import express from 'express';
import { whatsappEngine } from '../rpa/whatsapp.js';

export const whatsappRoutes = express.Router();

// SSE Route to stream status updates
whatsappRoutes.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onStatus = (status) => {
        res.write(`data: ${JSON.stringify(status)}\n\n`);
    };

    whatsappEngine.on('status', onStatus);
    
    // Envia o status inicial imediatamente
    onStatus(whatsappEngine.getStatus());

    req.on('close', () => {
        whatsappEngine.off('status', onStatus);
    });
});

whatsappRoutes.post('/start', async (req, res) => {
    const { contacts, message, minDelay, maxDelay } = req.body;
    if (!contacts || !Array.isArray(contacts) || !message) {
        return res.status(400).json({ error: 'Contatos e mensagem são obrigatórios' });
    }
    
    // Starts asynchronously
    whatsappEngine.startBatch(contacts, message, minDelay, maxDelay).catch(console.error);
    
    res.json({ success: true, message: 'Iniciando disparos em lote' });
});

whatsappRoutes.post('/pause', (req, res) => {
    whatsappEngine.pause();
    res.json({ success: true, status: whatsappEngine.status });
});

whatsappRoutes.post('/resume', (req, res) => {
    whatsappEngine.resume();
    res.json({ success: true, status: whatsappEngine.status });
});

whatsappRoutes.post('/cancel', (req, res) => {
    whatsappEngine.cancel();
    res.json({ success: true, status: whatsappEngine.status });
});

whatsappRoutes.get('/status', (req, res) => {
    res.json(whatsappEngine.getStatus());
});

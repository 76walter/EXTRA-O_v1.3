export const browserLogHandler = (msg, contextName) => {
    try { 
        const type = msg.type();
        const text = msg.text();
        if (type === 'error' || type === 'warning') return;
        if (text.includes('Elastic APM') || text.includes('Failed to load') || text.includes('Angular is running')) return;
        if (text.includes('Parametros recebidos') || text.includes('bmctx:')) return;
        console.log(`[${contextName}] ${text}`); 
    } catch(e) {}
};

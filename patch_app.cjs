const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

const sseEffect = `  // WhatsApp Engine SSE Listener
  useEffect(() => {
    const sse = new EventSource('http://localhost:3001/api/whatsapp/stream');
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setDispatchState({
        isActive: data.status === 'RUNNING' || data.status === 'PAUSED',
        isPaused: data.status === 'PAUSED',
        progress: data.progress
      });
      if (data.queue && data.queue.length > 0) {
        setSendList(data.queue);
      }
    };
    return () => sse.close();
  }, []);

`;

content = content.replace('  const pauseBatchDispatch = () => {', sseEffect + '  const pauseBatchDispatch = async () => {');

const pauseLogic = `    await fetch('http://localhost:3001/api/whatsapp/pause', { method: 'POST' });
    setStatus({ text: '⏸️ Disparo em lote PAUSADO pelo usuário.', active: true });`;
content = content.replace(/dispatchPausedRef\.current = true;\s*setDispatchState[\s\S]*?\}\s*;\s*const resumeBatchDispatch/, pauseLogic + '\n  };\n\n  const resumeBatchDispatch');


content = content.replace('const resumeBatchDispatch = () => {', 'const resumeBatchDispatch = async () => {');
const resumeLogic = `    await fetch('http://localhost:3001/api/whatsapp/resume', { method: 'POST' });
    setStatus({ text: '🚀 Retomando disparos...', active: true });`;
content = content.replace(/dispatchPausedRef\.current = false;\s*setDispatchState[\s\S]*?\}\s*;\s*const stopBatchDispatch/, resumeLogic + '\n  };\n\n  const stopBatchDispatch');


content = content.replace('const stopBatchDispatch = () => {', 'const stopBatchDispatch = async () => {');
const stopLogic = `    await fetch('http://localhost:3001/api/whatsapp/cancel', { method: 'POST' });
    setStatus({ text: '🛑 Disparo em lote PARADO pelo usuário.', active: true });`;
content = content.replace(/dispatchActiveRef\.current = false;[\s\S]*?setStatus[\s\S]*?\}\s*;\s*const startBatchDispatch/, stopLogic + '\n  };\n\n  const startBatchDispatch');


const startIdx = content.indexOf('const startBatchDispatch = async () => {');
const endIdx = content.indexOf('const loadNextDialBatch = () => {');

if (startIdx !== -1 && endIdx !== -1) {
    const startLogic = `const startBatchDispatch = async () => {
    if (dispatchState.isActive) {
      if (dispatchState.isPaused) {
        resumeBatchDispatch();
        return;
      }
      return;
    }

    const pendingItems = sendList.filter(item => !item.sent);
    if (pendingItems.length === 0) {
      showToast("Não há números pendentes de envio na lista!", "error");
      return;
    }

    if (!waMessage.trim()) {
      showToast("Selecione um modelo ou escreva uma mensagem primeiro!", "error");
      return;
    }

    setStatus({ text: \`🚀 Iniciando disparo para \${pendingItems.length} contatos...\`, active: true });

    await fetch('http://localhost:3001/api/whatsapp/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: sendList,
        message: waMessage,
        minDelay: Math.max(2000, (dispatchDelay * 1000) - 5000),
        maxDelay: (dispatchDelay * 1000) + 5000
      })
    });
  };

  `;
    content = content.substring(0, startIdx) + startLogic + content.substring(endIdx);
    fs.writeFileSync('src/App.jsx', content, 'utf8');
    console.log('App.jsx modificado com sucesso!');
} else {
    console.log('Não achou os indices.');
}

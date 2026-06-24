import { spawn, execSync } from 'child_process';

console.log('🚀 Iniciando a Extração Inteligente Premium (Vite + Ponte)...');

// Inicia src-server/server.js
const bridge = spawn('node', ['src-server/server.js'], { stdio: 'inherit', shell: true });

// Inicia Vite
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

let isShuttingDown = false;

const killAll = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n🛑 Encerrando todos os processos...');
  
  // Windows: usa taskkill para garantir que processos filhos morram
  const killProcess = (child, name) => {
    if (!child || child.exitCode !== null) return;
    try {
      if (process.platform === 'win32') {
        // taskkill /PID /T mata a árvore de processos inteira (shell: true cria subprocessos)
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
      console.log(`  ✅ ${name} encerrado.`);
    } catch (e) {
      // Processo já morreu
    }
  };

  killProcess(bridge, 'Bridge');
  killProcess(vite, 'Vite');
  
  setTimeout(() => process.exit(0), 500);
};

// Captura sinais de encerramento do processo principal (Ctrl+C, etc)
process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

// Windows: Ctrl+C no terminal dispara SIGINT, mas também há `exit` event
process.on('exit', killAll);

bridge.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`⚠️ Ponte finalizada com erro (código ${code}). Encerrando...`);
  }
  killAll();
});

vite.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`⚠️ Vite finalizado com erro (código ${code}). Encerrando...`);
  }
  killAll();
});

// Segurança: captura erros não tratados do próprio runner
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não tratado no runner:', err.message);
  killAll();
});

import { spawn } from 'child_process';
import path from 'path';

console.log("🚀 Iniciando EXTRAÇÃO INTELIGENTE PREMIUM...");

const run = (cl, args, name) => {
    const proc = spawn(cl, args, { 
        shell: true, 
        stdio: 'inherit',
        cwd: process.cwd()
    });

    proc.on('error', (err) => {
        console.error(`❌ Erro no processo ${name}:`, err);
    });

    return proc;
};

// 1. Inicia o Vite (npm run dev)
console.log("📦 Carregando Interface (Vite)...");
const vite = run('npm', ['run', 'dev'], 'Vite');

// 2. Aguarda um pouco e inicia a Ponte (bridge.js)
setTimeout(() => {
    console.log("🔗 Iniciando Ponte de Automação...");
    const bridge = run('node', ['bridge.js'], 'Bridge');

    process.on('SIGINT', () => {
        vite.kill();
        bridge.kill();
        process.exit();
    });
}, 3000);

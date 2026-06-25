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

// Inicia o Vite e o Servidor Backend Modular (npm run dev)
console.log("📦 Carregando Interface e Servidor Backend...");
const devProcess = run('npm', ['run', 'dev'], 'DevServer');

process.on('SIGINT', () => {
    devProcess.kill();
    process.exit();
});

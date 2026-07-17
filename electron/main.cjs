const { app, BrowserWindow, utilityProcess } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Extrator VTME',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Em produção, carrega o index.html da build do Vite
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // Em desenvolvimento, carrega o localhost do Vite
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const serverPath = path.join(__dirname, '../src-server/server.js');
  
  console.log('Iniciando o servidor backend em:', serverPath);
  
  if (app.isPackaged) {
    // Em produção, usa utilityProcess.fork para rodar o backend usando o Node embutido do Electron (sem precisar de node global no Windows)
    serverProcess = utilityProcess.fork(serverPath, [], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: 3001 },
      stdio: 'inherit'
    });

    serverProcess.on('exit', (code) => {
      console.log(`Servidor backend (utilityProcess) encerrado com código ${code}`);
    });
  } else {
    // Em desenvolvimento, usa o node global do sistema
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: 3001 },
      stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
      console.error('Erro ao iniciar o servidor:', err);
    });

    serverProcess.on('close', (code) => {
      console.log(`Servidor backend encerrado com código ${code}`);
    });
  }
}

app.on('ready', () => {
  startServer();
  
  // Dá um pequeno tempo para o servidor iniciar antes de abrir a janela
  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

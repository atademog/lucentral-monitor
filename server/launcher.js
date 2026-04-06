const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const SysTray = require('systray2').default;

// --- CONFIGURAÇÕES ---
const SERVER_SCRIPT = path.join(__dirname, 'src', 'server.js');
const LOG_URL = 'http://10.51.253.6:3000';
// Agora aponta EXPLICITAMENTE para o arquivo .ico
const ICON_PATH = path.join(__dirname, 'icons', 'icon.ico');

let serverProcess = null;
let tray = null;

// Função para ler o ícone do disco
function loadIcon() {
    try {
        // Tenta ler o arquivo icon.ico
        if (fs.existsSync(ICON_PATH)) {
            console.log("📂 Carregando ícone de:", ICON_PATH);
            const bitmap = fs.readFileSync(ICON_PATH);
            return bitmap.toString('base64');
        } else {
            console.error("⚠️ ERRO: Arquivo icons/icon.ico não encontrado!");
            // Retorna um fallback (quadrado vermelho) se não achar o arquivo
            return `iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmKsLjUuNHHic4AAAAA5SURBVFiF7coxDQAACAMw1L+DUzpI2QA2sVPytPfOxM7EzsTOxM7EzsTOxM7EzsTOxM7EzsTOxM7ExwVuRgDt85H4MQAAAABJRU5ErkJggg==`;
        }
    } catch (e) {
        console.error("❌ Erro fatal ao ler ícone:", e.message);
        return "";
    }
}

function startServer() {
    if (serverProcess) return;

    console.log('Iniciando servidor...');
    
    serverProcess = spawn('node', [SERVER_SCRIPT], {
        stdio: 'inherit',
        detached: false
    });

    serverProcess.on('close', (code) => {
        console.log(`⚠️ Servidor parou (código ${code})`);
        serverProcess = null;
        updateMenuStatus(false);
    });

    serverProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar processo node:', err);
    });

    updateMenuStatus(true);
}

function stopServer() {
    if (serverProcess) {
        console.log('🛑 Parando servidor...');
        serverProcess.kill();
        serverProcess = null;
    }
    updateMenuStatus(false);
}

function restartServer() {
    stopServer();
    setTimeout(startServer, 1000);
}

function updateMenuStatus(isOnline) {
    if (!tray) return;
    tray.sendAction({
        type: 'update-item',
        item: {
            ...menuItems[0],
            title: isOnline ? 'Status: ✅ Online' : 'Status: ❌ Parado',
        },
    });
}

const menuItems = [
    {
        title: 'Status: Iniciando...',
        tooltip: 'Status do Monitor',
        enabled: false
    },
    {
        title: 'Abrir Logs',
        tooltip: 'Ver histórico no navegador',
        click: () => exec(`start ${LOG_URL}`)
    },
    {
        title: 'Reiniciar',
        tooltip: 'Reinicia o servidor',
        click: restartServer
    },
    {
        title: 'Fechar',
        tooltip: 'Encerrar servidor',
        click: () => {
            stopServer();
            tray.kill(false);
            process.exit(0);
        }
    }
];

tray = new SysTray({
    menu: {
        icon: loadIcon(), // Lê do arquivo icon.ico
        title: "LiveU Monitor",
        tooltip: "Monitoramento LiveU",
        items: menuItems
    },
    debug: false,
    copyDir: true
});

tray.onClick(action => {
    if (action.item.click) {
        action.item.click();
    }
});

tray.ready().then(() => {
    console.log('✅ Ícone carregado na bandeja!');
    startServer();
}).catch(err => {
    console.error('❌ Erro na bandeja:', err);
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === 'simpleNotification') {
    const simpleId = 'lu-simple-id';
    chrome.notifications.clear(simpleId, () => {
      chrome.notifications.create(simpleId, {
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: request.title,
        message: request.message,
        priority: 1
      });
    });
    return true;
  }

  if (request.type === 'criticalNotification') {
    chrome.storage.local.get(['serverLogEnabled', 'logs24h', 'notificationsEnabled'], (config) => {
      let mensagemExibida = request.message;
      let tituloExibido = request.title;

      if (config.notificationsEnabled !== false) {
        if (config.serverLogEnabled === false) {
          mensagemExibida += "\n⚠️ Envio de log (rede) desativado";
          if (!tituloExibido.includes("(LOCAL)")) {
            tituloExibido += " (LOCAL)";
          }
        }

        const critId = 'lu-critico-id';
        chrome.notifications.clear(critId, () => {
          chrome.notifications.create(critId, {
            type: 'basic',
            iconUrl: '../icons/icon128.png',
            title: tituloExibido,
            message: mensagemExibida,
            priority: 1
          });
        });
      }

      if (config.serverLogEnabled !== false) {
        const SERVER_IP = 'http://10.51.253.6:3000/log';

        fetch(SERVER_IP, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            hora: request.hora,
            equipamento: request.equipamento,
            alerta: request.alerta
          })
        }).catch(err => console.log('Erro envio server:', err));
      }

      const agora = Date.now();
      const umDiaEmMs = 24 * 60 * 60 * 1000;
      const novoLog = {
        timestamp: agora,
        texto: `[${request.hora}] ${request.equipamento} - ${request.alerta}`
      };

      const logsAtuais = config.logs24h || [];
      const listaFiltrada = [...logsAtuais, novoLog].filter(log => (agora - log.timestamp) < umDiaEmMs);

      chrome.storage.local.set({ logs24h: listaFiltrada });
    });
  }
  return true;
});
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('minBitrate');
  const checkMonitor = document.getElementById('enabledCheck');
  const checkServer = document.getElementById('serverLogCheck');
  const checkNotify = document.getElementById('notificationCheck');
  const btnSave = document.getElementById('saveBtn');
  const btnDownload = document.getElementById('downloadLogBtn');
  const logViewer = document.getElementById('logViewer');

  function carregarLogsNaTela() {
    chrome.storage.local.get({ logs24h: [] }, (res) => {
      if (res.logs24h.length === 0) {
        logViewer.textContent = "Nenhum alerta registrado nas últimas 24h.";
        return;
      }
      const textoLogs = res.logs24h.slice().reverse().map(l => l.texto).join('\n');
      logViewer.textContent = textoLogs;
    });
  }

  btnDownload.addEventListener('click', () => {
    chrome.storage.local.get({ logs24h: [] }, (res) => {
      if (res.logs24h.length === 0) {
        alert("Nenhum alerta registrado nas últimas 24 horas.");
        return;
      }
      const agora = new Date();
      const dataStr = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const horaStr = agora.getHours() + "h" + agora.getMinutes();
      const nomeArquivo = `Log_24h_LUsmart_${dataStr}_${horaStr}.txt`;

      let conteudo = `LOG DE EVENTOS - ÚLTIMAS 24 HORAS\n`;
      conteudo += `Gerado em: ${agora.toLocaleString('pt-BR')}\n`;
      conteudo += `-------------------------------------------\n\n`;
      conteudo += res.logs24h.map(l => l.texto).join('\n');

      const blob = new Blob([conteudo], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  chrome.storage.local.get(['minBitrate', 'monitoringEnabled', 'serverLogEnabled', 'notificationsEnabled'], (res) => {
    if (res.minBitrate) input.value = res.minBitrate;
    checkMonitor.checked = res.monitoringEnabled !== false;
    checkServer.checked = res.serverLogEnabled !== false;
    checkNotify.checked = res.notificationsEnabled !== false;
    carregarLogsNaTela();
  });

  btnSave.addEventListener('click', () => {
    const val = parseFloat(input.value);
    const isMonEnabled = checkMonitor.checked;
    const isServerEnabled = checkServer.checked;
    const isNotifyEnabled = checkNotify.checked;

    chrome.storage.local.set({
      'minBitrate': val,
      'monitoringEnabled': isMonEnabled,
      'serverLogEnabled': isServerEnabled,
      'notificationsEnabled': isNotifyEnabled
    }, () => {
      const originalText = btnSave.innerText;
      btnSave.innerText = "SALVO! ✅";
      setTimeout(() => btnSave.innerText = originalText, 1500);
      carregarLogsNaTela();

      chrome.runtime.sendMessage({
        type: 'simpleNotification',
        title: 'Monitor LU',
        message: 'Configurações salvas com sucesso!'
      });
    });
  });
});
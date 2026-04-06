import http from 'http'
import { LogFile } from './lib/log-file.js'
import { port, getClient } from './config/configs.js'

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const client = getClient(req.socket.remoteAddress)
        const data = JSON.parse(body);
        const hoje = new Date().toLocaleDateString('pt-BR');
        const logLinha = `[${hoje} ${data.hora}] ${data.equipamento.toUpperCase()} - ${data.alerta}\n`;

        LogFile.write(client, logLinha)

        console.log(`✅ Log Recebido: Equipamento: ${data.equipamento} Alerta: ${data.alerta} Origem: ${client}`);

        res.writeHead(200);
        res.end();
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
  }
  else if (req.method === 'GET') {
    const client = getClient(req.socket.remoteAddress)

    if (req.url === '/api/logs') {
        LogFile.read(client, (logData) => {
            const conteudoSeguro = logData ? JSON.stringify(logData) : '""';
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(conteudoSeguro);
        });
        return;
    }

    LogFile.read(client, (logData) => {
      const conteudoSeguro = logData ? JSON.stringify(logData) : '""';

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

      res.end(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>LOG CENTRAL - Monitoramento</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { background-color: #121212; color: #e0e0e0; font-family: 'Segoe UI', monospace; margin: 0; padding: 20px; }
                        h2 { border-bottom: 2px solid #333; padding-bottom: 10px; color: #00ff00; }
                        
                        .filter-bar { 
                            background: #1e1e1e; padding: 15px; border-radius: 8px; margin-bottom: 20px; 
                            display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; border: 1px solid #333;
                        }
                        .filter-group { display: flex; flex-direction: column; }
                        .filter-group label { font-size: 12px; margin-bottom: 5px; color: #aaa; }
                        
                        input, select { 
                            padding: 8px; border-radius: 4px; border: 1px solid #444; 
                            background: #2c2c2c; color: white; font-family: monospace;
                        }
                        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }

                        button {
                            padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;
                        }
                        #btn-limpar { background: #d32f2f; color: white; }
                        #btn-exportar { background: #4caf50; color: white; margin-left: auto; }
                        #btn-atualizar { background: #0288d1; color: white; }

                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; table-layout: fixed; }
                        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                        th { background-color: #1f1f1f; color: #888; text-transform: uppercase; font-size: 12px; }
                        
                        .col-data { width: 150px; }
                        .col-equi { width: 200px; }
                        .col-tipo { width: 260px; }
                        .col-det { width: auto; }

                        @keyframes slideIn {
                            from { background-color: #00ff0033; transform: translateY(-10px); opacity: 0; }
                            to { background-color: transparent; transform: translateY(0); opacity: 1; }
                        }
                        .new-row { animation: slideIn 0.5s ease-out forwards; }

                        .tag { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; }
                        .tag-taxa { background: #ff9800; color: #000; }
                        .tag-video { background: #f44336; color: #fff; }
                        .tag-bat { background: #2196f3; color: #fff; }
                        .tag-con { background: #00bcd4; color: #000; }
                        .tag-des { background: #424242; color: #ff5252; } 
                        .tag-tx-start { background: #76ff03; color: #000; }
                        .tag-tx-stop { background: #8b0000; color: #fff; }
                        .tag-info { background: #607d8b; color: #fff; }
                        
                        .contador { margin-top: 10px; font-size: 12px; color: #666; }

                        .checkbox-wrapper { display: flex; align-items: center; height: 35px; }
                        .checkbox-wrapper input { margin-right: 5px; cursor: pointer; }
                        .checkbox-wrapper label { font-size: 13px; color: #fff; cursor: pointer; margin: 0; }

                        td:nth-child(1), td:nth-child(2) { cursor: pointer; }
                        td:nth-child(1):active, td:nth-child(2):active { transform: scale(0.99, 0.99); }
                        td:nth-child(3) > span { display: inline-block; cursor: pointer; }
                        td:nth-child(3) > span:active { transform: scale(0.97, 0.97); }
                    </style>
                </head>
                <body>
                    <h2>📊 Histórico de Alertas</h2>

                    <div class="filter-bar">
                        <div class="filter-group">
                            <label>📅 Data:</label>
                            <input type="date" id="filtro-data">
                        </div>
                        <div class="filter-group">
                            <label>📡 Equipamento:</label>
                            <input type="text" id="filtro-nome" placeholder="Ex: TVBAHIA...">
                        </div>
                        <div class="filter-group">
                            <label>⚠️ Tipo:</label>
                            <select id="filtro-tipo">
                                <option value="">Todos</option>
                                <option value="TAXA BAIXA">Taxa Baixa</option>
                                <option value="BATERIA">Bateria</option>
                                <option value="CONEXÃO">Conexão/Desconexão</option>
                                <option value="TRANSMISSÃO">Transmissão</option>
                                <option value="GERAÇÃO">Geração</option>
				<option value="VÍDEO">Vídeo</option>
                            </select>
                        </div>
                        <button id="btn-limpar" onclick="limparFiltros()">Limpar Filtros</button>
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="chk-auto" checked>
                            <label for="chk-auto">Atualização Automática</label>
                        </div>
                        <button id="btn-exportar" onclick="exportarLog()">📥 Exportar Log</button>
                        <button id="btn-atualizar" onclick="fetchLogs()">🔄 Atualizar</button>
                    </div>

                    <table id="tabela-logs">
                        <thead>
                            <tr>
                                <th class="col-data">Data/Hora</th>
                                <th class="col-equi">Equipamento</th>
                                <th class="col-tipo">Tipo</th>
                                <th class="col-det">Detalhe</th>
                            </tr>
                        </thead>
                        <tbody id="corpo-tabela"></tbody>
                    </table>
                    <div class="contador" id="contador-logs"></div>

                    <script>
                        let todosLogs = [];
                        let filteredLogs = [];

                        function parseLogs(texto) {
                            if(!texto) return [];
                            const linhas = texto.trim().split('\\n');
                            const logsParsed = [];
                            const regex = /^\\\[(\\d{2}\\/\\d{2}\\/\\d{4})\\s(\\d{2}:\\d{2}:\\d{2})\\]\\s(.*?)\\s-\\s(.*?)\\s-\\s(.*)$/;

                            linhas.forEach(function(linha) {
                                const match = linha.match(regex);
                                if (match) {
                                    logsParsed.push({
                                        dataRaw: match[1],
                                        hora: match[2],
                                        equipamento: match[3],
                                        tipo: match[4],
                                        detalhe: match[5],
                                        original: linha,
                                        id: match[1] + match[2] + match[3] + match[4]
                                    });
                                }
                            });
                            return logsParsed.reverse(); 
                        }

                        function fetchLogs() {
                            fetch('/api/logs')
                                .then(response => response.json())
                                .then(data => {
                                    const novosLogsParsed = parseLogs(data);
                                    atualizarDados(novosLogsParsed);
                                });
                        }

                        function atualizarDados(novosLogs) {
                            const idsExistentes = new Set(todosLogs.map(l => l.id));
                            let hasNew = false;
                            
                            for (let i = novosLogs.length - 1; i >= 0; i--) {
                                const log = novosLogs[i];
                                if (!idsExistentes.has(log.id)) {
                                    log.isNew = true;
                                    todosLogs.unshift(log);
                                    hasNew = true;
                                }
                            }
                            
                            if (hasNew) {
                                aplicarFiltros();
                                todosLogs.forEach(l => l.isNew = false);
                            }
                        }

                        function criarLinha(log) {
                            let classeTag = 'tag-info';
                            if(log.tipo.includes('TAXA')) classeTag = 'tag-taxa';
                            if(log.tipo.includes('VÍDEO') || log.tipo.includes('VIDEO')) classeTag = 'tag-video';
                            if(log.tipo.includes('BATERIA')) classeTag = 'tag-bat';
                            if(log.tipo.includes('CONEXÃO')) classeTag = 'tag-con';
                            if(log.tipo.includes('DESCONEXÃO')) classeTag = 'tag-des';
                            if(log.tipo.includes('TRANSMISSÃO')) {
                                classeTag = log.detalhe.toLowerCase().includes('parou') || log.detalhe.toLowerCase().includes('encerrad') ? 'tag-tx-stop' : 'tag-tx-start';
                            }
                            if(log.tipo.includes('GERAÇÃO')) {
                                classeTag = log.detalhe.toLowerCase().includes('concluída') || log.detalhe.toLowerCase().includes('finalizada') ? 'tag-tx-stop' : 'tag-tx-start';
                            }

                            const tr = document.createElement('tr');
                            if (log.isNew) tr.classList.add('new-row');
                            
                            tr.innerHTML = 
                                '<td class="col-data">' + log.dataRaw + ' <span style="color:#666">' + log.hora + '</span></td>' +
                                '<td class="col-equi" style="font-weight:bold; color:#fff">' + log.equipamento + '</td>' +
                                '<td class="col-tipo"><span class="tag ' + classeTag + '">' + log.tipo + '</span></td>' +
                                '<td class="col-det" style="color:#aaa" title="' + log.detalhe + '">' + log.detalhe + '</td>';
                            return tr;
                        }

                        function renderizarTabela(lista) {
                            const tbody = document.getElementById('corpo-tabela');
                            tbody.innerHTML = '';
                            if (lista.length === 0) {
                                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">Nenhum registro encontrado.</td></tr>';
                                document.getElementById('contador-logs').innerText = '';
                                return;
                            }
                            lista.forEach(log => tbody.appendChild(criarLinha(log)));
                            document.getElementById('contador-logs').innerText = 'Exibindo ' + lista.length + ' registros.';
                        }

                        function aplicarFiltros() {
                            const dataInput = document.getElementById('filtro-data').value;
                            const nomeInput = document.getElementById('filtro-nome').value.toUpperCase();
                            const tipoInput = document.getElementById('filtro-tipo').value;
                            
                            let dataFormatada = '';
                            if (dataInput) {
                                const partes = dataInput.split('-');
                                dataFormatada = partes[2] + '/' + partes[1] + '/' + partes[0];
                            }

                            filteredLogs = todosLogs.filter(function(log) {
                                if (dataFormatada && log.dataRaw !== dataFormatada) return false;
                                if (nomeInput && !log.equipamento.includes(nomeInput)) return false;
                                if (tipoInput && !log.tipo.includes(tipoInput)) return false;
                                return true;
                            });
                            renderizarTabela(filteredLogs);
                        }

                        function exportarLog() {
                            if (filteredLogs.length === 0) return alert('Nenhum log para exportar.');
                            const conteudo = filteredLogs.map(l => l.original).join('\\n');
                            const blob = new Blob([conteudo], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'export_log_' + new Date().getTime() + '.txt';
                            a.click();
                            URL.revokeObjectURL(url);
                        }

                        function limparFiltros() {
                            document.getElementById('filtro-data').value = '';
                            document.getElementById('filtro-nome').value = '';
                            document.getElementById('filtro-tipo').value = '';
                            aplicarFiltros();
                        }

                        function clicouTipo(texto) {
                            const combo = document.getElementById('filtro-tipo');
                            if (texto.includes("TRANSMISSÃO")) combo.value = "TRANSMISSÃO";
                            else if (texto.includes("GERAÇÃO")) combo.value = "GERAÇÃO";
                            else if (texto.includes("VÍDEO")) combo.value = "VÍDEO";
                            else if (texto.includes("DESCONEXÃO") || texto.includes("CONEXÃO")) combo.value = "CONEXÃO";
                            else combo.value = texto;
                            aplicarFiltros();
                        }

                        document.getElementById('filtro-data').addEventListener('change', aplicarFiltros);
                        document.getElementById('filtro-nome').addEventListener('keyup', aplicarFiltros);
                        document.getElementById('filtro-tipo').addEventListener('change', aplicarFiltros);

                        document.getElementById('corpo-tabela').addEventListener('click', (e) => {
                            const td = e.target.closest('td');
                            if (!td) return;
                            const cellIndex = td.cellIndex;
                            if (cellIndex === 0) {
                                document.getElementById('filtro-data').value = td.textContent.split(' ')[0].split('/').reverse().join('-');
                                aplicarFiltros();
                            } else if (cellIndex === 1) {
                                document.getElementById('filtro-nome').value = td.textContent;
                                aplicarFiltros();
                            } else if (cellIndex === 2) {
                                clicouTipo(td.textContent.trim());
                            }
                        });

                        setInterval(function() {
                            if(document.getElementById('chk-auto').checked) fetchLogs();
                        }, 5000);

                        const rawData = ${conteudoSeguro};
                        todosLogs = parseLogs(rawData);
                        aplicarFiltros();
                    </script>
                </body>
                </html>
            `);
    })
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('🚀 Servidor de Logs rodando na porta ' + port);
})
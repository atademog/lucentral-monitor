if (typeof window.alertados === 'undefined') { window.alertados = {} }
if (typeof window.ausentes === 'undefined') { window.ausentes = {} }
if (typeof window.estados === 'undefined') {
    try {
        window.estados = JSON.parse(localStorage.getItem('lu_estados_v2')) || {}
    } catch (e) {
        window.estados = {}
    }
}
if (typeof window.portasMemoria === 'undefined') {
    try {
        window.portasMemoria = JSON.parse(localStorage.getItem('lu_portas_v2')) || {}
    } catch (e) {
        window.portasMemoria = {}
    }
}

function obterHoraBrasilia() {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function enviarParaLog(equipamento, tipoAlerta, detalhe) {
  try {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({
        type: 'criticalNotification',
        title: `${tipoAlerta}: ${equipamento}`,
        message: detalhe,
        equipamento: equipamento,
        alerta: `${tipoAlerta} - ${detalhe}`,
        hora: obterHoraBrasilia()
      })
    }
  } catch (e) {}
}

function extrairBitrate(texto) {
  if (!texto) return []
  let matches = [...texto.matchAll(/([\d.,]+)\s*(?:Mbps|Mb\/s)/gi)]
  if (matches.length == 0) {
    matches = [...texto.matchAll(/([\d.,]+)\s*(?:Kbps|Kb\/s)/gi)]
    return matches.map(m => parseFloat(m[1].replace(',', '.')) / 1000)
  }
  return matches.map(m => parseFloat(m[1].replace(',', '.')))
}

function getUnitData(elNome) {
  try {
    const tilePai = elNome.closest('.tile')
    const linhaPai = elNome.closest('.ag-row')
    const isList = !!linhaPai

    let nome = elNome.innerText.trim().split('\n')[0]
    if (!nome) return null

    let textoConsolidado = ''
    let htmlConsolidado = ''
    let channelText = ''
    let elementoStatusEspecifico = null
    let badgeText = ''

    if (linhaPai) {
      const rowIndex = linhaPai.getAttribute('row-index')
      let partesDaLinha = [linhaPai]
      if (rowIndex) {
        partesDaLinha = document.querySelectorAll(`.ag-row[row-index="${rowIndex}"]`)
      }

      partesDaLinha.forEach(parte => {
        const celulaStatus = parte.querySelector('[col-id="status"]')
        const celulaState = parte.querySelector('[col-id="state"]')
        const celulaChannel = parte.querySelector('[col-id="channel"]')

        if (celulaStatus) {
          elementoStatusEspecifico = celulaStatus
          textoConsolidado += " " + celulaStatus.innerText
        }
        if (celulaState) htmlConsolidado += " " + celulaState.innerHTML
        if (celulaChannel) {
          const ct = celulaChannel.innerText.trim()
          if (ct) channelText = ct
        }
        textoConsolidado += " " + (parte.innerText || "")
      })
    } else if (tilePai) {
      textoConsolidado = tilePai.innerText + " " + tilePai.textContent
      htmlConsolidado = tilePai.innerHTML
      const elChannel = tilePai.querySelector('.channel-select span.main') || tilePai.querySelector('.channel-select')
      if (elChannel) channelText = elChannel.innerText.trim()
      const elBadge = tilePai.querySelector('.stream-badge')
      if (elBadge) badgeText = elBadge.innerText.trim()
    }

    return { nome, elementoStatusEspecifico, textoConsolidado, htmlConsolidado, channelText, badgeText, isList }
  } catch (e) { return null }
}

function iniciarMonitoramento() {
  try {
    if (!chrome.runtime?.id) return

    chrome.storage.local.get(['minBitrate', 'monitoringEnabled'], (config) => {
      if (config.monitoringEnabled === false) return

      const limiteBitrate = config.minBitrate !== undefined ? config.minBitrate : 1.0
      const elementosNome = document.querySelectorAll('.ag-cell[col-id="name"], .tile .details-line .main')
      const atuaisMap = new Set()

      elementosNome.forEach((elNome) => {
        try {
          const dataUnit = getUnitData(elNome)
          if (!dataUnit) return
          const { nome, elementoStatusEspecifico, textoConsolidado, htmlConsolidado, channelText, badgeText } = dataUnit

          atuaisMap.add(nome)
          window.ausentes[nome] = 0 

          let modoAtual = "UNKNOWN"
          const isBusy = htmlConsolidado.includes("icon-status-busy") || textoConsolidado.includes("STOP")
          const isOnline = htmlConsolidado.includes("icon-status-online")
          const isOffline = htmlConsolidado.includes("icon-status-offline")
          const isNoCamera = textoConsolidado.toUpperCase().includes("NO CAMERA") || htmlConsolidado.includes("warning-flag")

          if (isBusy) {
            const statusTexto = (elementoStatusEspecifico ? elementoStatusEspecifico.innerText : textoConsolidado).toUpperCase()
            if (!statusTexto.includes("SEC")) {
              modoAtual = "STORE_FORWARD"
            } else {
              modoAtual = "LIVE"
            }
            if (badgeText && (badgeText.includes("S&F") || badgeText.includes("STORE"))) {
              modoAtual = "STORE_FORWARD"
            }
          } else if (isOffline) {
            modoAtual = "OFFLINE"
          } else if (isOnline) {
            modoAtual = "READY"
          }

          if (modoAtual === "UNKNOWN") return

          if (channelText) {
            window.portasMemoria[nome] = channelText
            localStorage.setItem('lu_portas_v2', JSON.stringify(window.portasMemoria))
          }

          if (!window.estados[nome]) {
            window.estados[nome] = { modoAnterior: modoAtual, noCameraAnterior: isNoCamera }
            localStorage.setItem('lu_estados_v2', JSON.stringify(window.estados))
            return
          }

          if (window.estados[nome].noCameraAnterior === undefined) {
            window.estados[nome].noCameraAnterior = isNoCamera
          }

          const modoAnterior = window.estados[nome].modoAnterior
          const noCameraAnterior = window.estados[nome].noCameraAnterior
          const portaLembrada = window.portasMemoria[nome] || ""
          
          const afiliadas = ["TVBAHIA", "TVSC", "TVSUBAE", "TVSUDOESTE", "TVOESTE", "TVSF"]
          const isTVBahia = afiliadas.some(sigla => nome.toUpperCase().includes(sigla))
          const isPortaTVBA = portaLembrada.toUpperCase().includes("TVBA")
          const deveNotificar = isTVBahia || isPortaTVBA

          if (modoAtual !== modoAnterior) {
            let nomePorta = "Porta Externa"
            if (portaLembrada.toUpperCase() !== "EXTERNAL" && portaLembrada !== "") {
              nomePorta = `Porta ${portaLembrada}`
            }

            if (deveNotificar) {
              if (modoAtual !== "OFFLINE" && modoAnterior === "OFFLINE") {
                  enviarParaLog(nome, "CONEXÃO", "Equipamento ficou ONLINE")
              } 
              else if (modoAtual === "OFFLINE" && modoAnterior !== "OFFLINE") {
                  enviarParaLog(nome, "DESCONEXÃO", "Equipamento ficou OFFLINE")
              }

              if (modoAtual === "LIVE" && modoAnterior !== "LIVE") {
                enviarParaLog(nome, "🟢 INÍCIO DE TRANSMISSÃO", `Para a ${nomePorta}`)
              } 
              else if (modoAtual === "STORE_FORWARD" && modoAnterior !== "STORE_FORWARD") {
                enviarParaLog(nome, "🟡 GERANDO MATERIAL", `Enviando para a ${nomePorta}`)
              }
              else if (modoAnterior === "LIVE" && (modoAtual === "READY" || modoAtual === "OFFLINE")) {
                enviarParaLog(nome, "🔴 TRANSMISSÃO ENCERRADA", `Sinal encerrado`)
              }
              else if (modoAnterior === "STORE_FORWARD" && (modoAtual === "READY" || modoAtual === "OFFLINE")) {
                enviarParaLog(nome, "🔴 GERAÇÃO CONCLUÍDA", `Transferência finalizada`)
              }
            }

            window.estados[nome].modoAnterior = modoAtual
            localStorage.setItem('lu_estados_v2', JSON.stringify(window.estados))
          }

          if (modoAtual !== "OFFLINE" && isNoCamera !== noCameraAnterior) {
            if (deveNotificar) {
              if (isNoCamera) {
                enviarParaLog(nome, "SEM VÍDEO", "Câmera desconectada")
              } else {
                enviarParaLog(nome, "VÍDEO CONECTADO", "Sinal de vídeo detectado")
              }
            }
            window.estados[nome].noCameraAnterior = isNoCamera
            localStorage.setItem('lu_estados_v2', JSON.stringify(window.estados))
          }

          if (modoAtual === "LIVE") {
            const bitrate = Math.max(...extrairBitrate(textoConsolidado), 0)
            if (bitrate < limiteBitrate && bitrate > 0) {
              if (deveNotificar && !window.alertados[nome + "_taxa"]) {
                enviarParaLog(nome, "TAXA BAIXA", `${bitrate.toFixed(1)} Mbps`)
                window.alertados[nome + "_taxa"] = true
              }
            } else { delete window.alertados[nome + "_taxa"] }
          } else {
            delete window.alertados[nome + "_taxa"]
          }
        } catch (err) {}
      })

      // Lógica de Tolerância para equipamentos que sumiram da tela (Filtro Offline)
      const checkboxOffline = document.getElementById('unit-filter-Offline')
      const exibindoOffline = checkboxOffline && checkboxOffline.checked

      if (!exibindoOffline) {
        Object.keys(window.estados).forEach(nomeMemoria => {
          if (!atuaisMap.has(nomeMemoria)) {
            const estadoSalvo = window.estados[nomeMemoria]
            
            if (estadoSalvo && estadoSalvo.modoAnterior !== "OFFLINE") {
              window.ausentes[nomeMemoria] = (window.ausentes[nomeMemoria] || 0) + 1
              
              if (window.ausentes[nomeMemoria] >= 2) {
                const portaLembrada = window.portasMemoria[nomeMemoria] || ""
                const afiliadas = ["TVBAHIA", "TVSC", "TVSUBAE", "TVSUDOESTE", "TVOESTE", "TVSF"]
                const isTVBahia = afiliadas.some(sigla => nomeMemoria.toUpperCase().includes(sigla))
                const isPortaTVBA = portaLembrada.toUpperCase().includes("TVBA")
                const deveNotificar = isTVBahia || isPortaTVBA

                if (deveNotificar) {
                    enviarParaLog(nomeMemoria, "DESCONEXÃO", "Equipamento ficou OFFLINE")
                }
                
                window.estados[nomeMemoria].modoAnterior = "OFFLINE"
                localStorage.setItem('lu_estados_v2', JSON.stringify(window.estados))
              }
            }
          }
        })
      }

    })
  } catch (err) {}
}

if (window.intervaloMonitor) clearInterval(window.intervaloMonitor)
window.intervaloMonitor = setInterval(iniciarMonitoramento, 3000)
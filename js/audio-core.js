(function() {
    console.log("🎤 LiveU Audio Core: V7.0 (Persistência & Diagnóstico)");

    let audioCtx = null;
    const connections = new WeakMap(); // Armazena estado da conexão de cada vídeo

    // --- 1. Inicialização Segura do AudioContext ---
    function getContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        return audioCtx;
    }

    // Destrava o áudio ao clicar na página
    document.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    });

    // --- 2. Gerenciamento Visual (Etiqueta nunca some) ---
    function updateLabel(video, text, bgColor) {
        let labelId = video.dataset.monitorLabelId;
        let label;

        // Se não existe, cria (e nunca deleta)
        if (!labelId || !document.getElementById(labelId)) {
            labelId = 'audio-lbl-' + Math.random().toString(36).substr(2, 9);
            video.dataset.monitorLabelId = labelId;

            label = document.createElement('div');
            label.id = labelId;
            label.style.cssText = `
                position: absolute; top: 5px; right: 5px; padding: 2px 5px;
                font-family: sans-serif; font-weight: bold; font-size: 10px;
                color: white; border-radius: 3px; z-index: 999999; pointer-events: none;
                text-shadow: 1px 1px 1px black; border: 1px solid rgba(255,255,255,0.2);
            `;
            
            // Tenta inserir no pai
            if (video.parentElement) {
                video.parentElement.style.position = 'relative';
                video.parentElement.appendChild(label);
            }
        } else {
            label = document.getElementById(labelId);
        }

        if (label) {
            label.innerText = text;
            label.style.backgroundColor = bgColor;
        }
    }

    // --- 3. Lógica de Conexão e Análise ---
    function checkAudio(video) {
        const ctx = getContext();

        // Estado 1: Contexto Suspenso (Navegador bloqueou)
        if (ctx.state === 'suspended') {
            updateLabel(video, "CLICK AQUI", "#007bff"); // Azul
            return;
        }

        // Recupera ou cria conexão para este vídeo
        let conn = connections.get(video);

        // Se não tem conexão, tenta criar
        if (!conn) {
            try {
                // Tenta capturar o stream do elemento (funciona melhor em grids)
                let stream;
                if (video.captureStream) stream = video.captureStream();
                else if (video.mozCaptureStream) stream = video.mozCaptureStream();
                else if (video.srcObject) stream = video.srcObject;

                if (!stream) {
                    updateLabel(video, "SEM SINAL", "#555"); // Cinza
                    return;
                }

                // Verifica se tem áudio
                if (stream.getAudioTracks().length === 0) {
                    updateLabel(video, "S/ TRILHA", "#000"); // Preto (Video Mudo Nativo)
                    return;
                }

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 64;
                const source = ctx.createMediaStreamSource(stream);
                source.connect(analyser);

                conn = { analyser, dataArray: new Uint8Array(analyser.frequencyBinCount) };
                connections.set(video, conn);
                
            } catch (e) {
                updateLabel(video, "ERRO API", "#ff9800"); // Laranja
                return;
            }
        }

        // Estado 2: Analisando Volume
        if (conn) {
            try {
                const { analyser, dataArray } = conn;
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;

                if (avg > 1) {
                    updateLabel(video, "ÁUDIO ON", "#28a745"); // Verde
                } else {
                    updateLabel(video, "MUDO", "#dc3545"); // Vermelho
                }
            } catch (e) {
                // Se der erro na leitura (ex: vídeo mudou de src), limpa a conexão para recriar
                connections.delete(video);
                updateLabel(video, "RECONECT...", "#6f42c1"); // Roxo
            }
        }
    }

    // --- 4. Loop Infinito (Polling) ---
    setInterval(() => {
        // Pega todos os vídeos visíveis na tela
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            // Só monitora se o vídeo estiver "vivo"
            if (video.readyState >= 1 && !video.paused) {
                checkAudio(video);
            } else {
                // Se pausado/carregando
                updateLabel(video, "PARADO", "#555");
            }
        });
    }, 250); // 4x por segundo

})();
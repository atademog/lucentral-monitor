# LU Central Monitor 📡

Sistema robusto de monitorização em tempo real para a plataforma **LiveU Central**. Este projeto consiste numa extensão para Google Chrome e um servidor de logs dedicado, concebidos para otimizar a supervisão de transmissões e garantir a integridade do sinal das emissoras da Rede Bahia.

---

## 🚀 Funcionalidades Principais

### 1. Extensão (Content & Background Script)
* **Deteção Automática de Modo**: Diferencia automaticamente entre transmissões **Ao Vivo (LIVE)** e **Geração de Material (Store & Forward)** através da análise de delay (sec) e bitrate.
* **Monitorização de Qualidade**: 
    * Alerta de **Taxa Baixa** (bitrate personalizável no popup).
    * Deteção de **Câmara Desconectada/Conectada** (status "No Camera").
* **Filtros Inteligentes**: 
    * Monitorização exclusiva para equipamentos que contenham as siglas das afiliadas: **TVBAHIA, TVSC, TVSUBAE, TVSUDOESTE, TVOESTE, TVSF**.
    * Monitorização de qualquer equipamento conectado a canais que contenham **TVBA**.
* **Persistência e Estabilidade**:
    * Uso de `localStorage` para evitar notificações duplicadas ao atualizar a página (F5) ou reordenar colunas.
    * **Independência de Layout**: Capaz de ler os dados mesmo que o operador altere a ordem das colunas ou utilize o modo grelha/lista.
* **Notificações Inteligentes**: Otimizadas para **Windows 10 e 11**, utilizando IDs dinâmicos para garantir que novos alertas surjam no ecrã sem empilhar dezenas de balões antigos.

### 2. Servidor de Logs (Node.js)
* **Dashboard Real-time**: Visualização de alertas sem necessidade de atualizar a página (atualização suave via fetch).
* **Sistema de Filtros**: Filtragem instantânea por data, nome do equipamento ou tipo de alerta.
* **Interatividade**: Clique numa etiqueta de erro (ex: "SEM VÍDEO") para filtrar automaticamente todos os registos do mesmo tipo.
* **Exportação**: Botão para exportar os logs filtrados diretamente para um ficheiro `.txt`.

---

## 🛠️ Arquitetura Técnica

### Extensão
- **`content.js`**: O "cérebro" que injeta a lógica na página do LiveU. Realiza o parsing do DOM (AG-Grid), gere a máquina de estados dos equipamentos e aplica os filtros de negócio.
- **`background.js`**: Gere o ciclo de vida das notificações do sistema operativo e realiza o envio dos dados via POST para o servidor de logs.
- **`popup.js`**: Interface de configuração para o utilizador definir o bitrate mínimo e ativar/desativar as funções de monitorização.

### Servidor
- **`server.js`**: Servidor HTTP em Node.js que processa requisições POST para armazenamento e fornece uma interface Web (GET) para consulta dos dados.
- **`LogFile.js`**: Módulo responsável pela persistência dos dados em ficheiros físicos, organizados por cliente/IP.

---

## 📦 Instalação e Configuração

### Requisitos
- [Node.js](https://nodejs.org/) instalado.
- Google Chrome.

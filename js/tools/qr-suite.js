// QR Code Suite: Generator & Scanner

let qrSuiteState = {
    activeTab: 'generate', // generate, scan
    qrInstance: null,
    html5QrcodeScanner: null
};

function initQrSuite() {
    const viewport = document.getElementById('tool-viewport');

    viewport.innerHTML = `
        <div class="fade-in flex-grow flex flex-col justify-between h-full p-4 space-y-4">
            
            <!-- TABS -->
            <div class="border-b border-slate-900 flex shrink-0 justify-center">
                <div class="flex gap-2 p-1 rounded-xl bg-slate-950/40 border border-slate-900">
                    <button onclick="setQrTab('generate')" id="qr-tab-btn-gen" class="px-4 py-1.5 rounded-lg text-xs font-bold text-accent-400 bg-accent-500/10 transition">Gerar QR Code</button>
                    <button onclick="setQrTab('scan')" id="qr-tab-btn-scan" class="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition">Escanear QR Code</button>
                </div>
            </div>

            <!-- CONTAINER DINÂMICO -->
            <div class="flex-1 flex flex-col items-center justify-center">
                
                <!-- TAB GERAR -->
                <div id="qr-panel-generate" class="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    
                    <!-- INPUTS -->
                    <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                        <div class="space-y-3">
                            <span class="text-xs font-bold text-white block">Configurar Conteúdo</span>
                            
                            <div class="space-y-1">
                                <label class="text-[10px] text-slate-400 block font-semibold">Texto ou link da URL:</label>
                                <textarea id="qr-text-input" placeholder="Ex: https://google.com" oninput="generateQrCode()" class="w-full h-20 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-white focus:outline-none focus:border-accent-500 transition resize-none"></textarea>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[10px] text-slate-400 block font-semibold">Cor do Desenho:</label>
                                    <div class="flex items-center gap-2">
                                        <input type="color" id="qr-color-fg" value="#000000" onchange="generateQrCode()" class="h-8 w-12 rounded border border-slate-800 bg-transparent cursor-pointer">
                                        <span class="text-[10px] text-slate-500">Desenho</span>
                                    </div>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[10px] text-slate-400 block font-semibold">Cor do Fundo:</label>
                                    <div class="flex items-center gap-2">
                                        <input type="color" id="qr-color-bg" value="#ffffff" onchange="generateQrCode()" class="h-8 w-12 rounded border border-slate-800 bg-transparent cursor-pointer">
                                        <span class="text-[10px] text-slate-500">Fundo</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onclick="downloadQrCode()" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-bold text-xs shadow-lg shadow-accent-500/10 transition flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-download"></i>
                            <span>Baixar QR Code</span>
                        </button>
                    </div>

                    <!-- PREVIEW -->
                    <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col items-center justify-center">
                        <div class="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center max-w-[200px]">
                            <canvas id="qr-canvas" class="max-w-full max-h-full"></canvas>
                        </div>
                        <span class="text-[10px] text-slate-500 mt-4">Pré-visualização do QR Code</span>
                    </div>

                </div>

                <!-- TAB ESCANEAR -->
                <div id="qr-panel-scan" class="hidden w-full max-w-lg bg-slate-900/10 border border-slate-900 rounded-2xl p-5 space-y-4">
                    
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="setScanMode('camera')" id="scan-mode-camera" class="py-2 border border-accent-500 bg-accent-500/10 text-[10px] font-bold text-accent-400 rounded-xl transition flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-camera"></i>
                            <span>Câmera</span>
                        </button>
                        <button onclick="setScanMode('upload')" id="scan-mode-upload" class="py-2 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-xl transition flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-file"></i>
                            <span>Upload Arquivo</span>
                        </button>
                    </div>

                    <!-- Câmera Scanner viewport -->
                    <div id="scan-viewport-container" class="relative rounded-xl border border-slate-900 overflow-hidden bg-slate-950/60 aspect-video flex items-center justify-center">
                        <div id="qr-reader" class="w-full h-full"></div>
                        
                        <div id="scan-upload-zone" class="hidden absolute inset-0 flex flex-col items-center justify-center p-4 cursor-pointer"
                             onclick="document.getElementById('qr-file-input').click()">
                            <input type="file" id="qr-file-input" accept="image/*" class="hidden" onchange="scanQrFile(event)">
                            <i class="fa-solid fa-qrcode text-3xl text-accent-400 mb-2"></i>
                            <span class="text-xs font-semibold text-white">Carregue imagem com QR Code</span>
                            <p class="text-[9px] text-slate-500 mt-0.5">Clique para carregar</p>
                        </div>
                    </div>

                    <!-- Resultado escaneado -->
                    <div id="scan-result-panel" class="hidden bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3">
                        <div class="flex-1 overflow-hidden">
                            <span class="text-[9px] font-bold text-accent-400 uppercase tracking-widest block">Resultado</span>
                            <p id="scan-result-text" class="text-xs text-white font-semibold truncate"></p>
                        </div>
                        <button onclick="copyScanResult()" class="h-8 w-8 rounded-lg border border-slate-800 hover:bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white transition">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>

                </div>

            </div>

        </div>
    `;

    // Start with default setup
    generateQrCode();
}

function setQrTab(tab) {
    // Clean stream and scanner
    stopWebcamStream();
    if (qrSuiteState.html5QrcodeScanner) {
        qrSuiteState.html5QrcodeScanner.clear().catch(e => console.log(e));
        qrSuiteState.html5QrcodeScanner = null;
    }

    qrSuiteState.activeTab = tab;

    // Toggle Tab Buttons
    document.getElementById('qr-tab-btn-gen').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
    document.getElementById('qr-tab-btn-scan').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";

    document.getElementById('qr-panel-generate').classList.add('hidden');
    document.getElementById('qr-panel-scan').classList.add('hidden');

    if (tab === 'generate') {
        document.getElementById('qr-tab-btn-gen').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-accent-400 bg-accent-500/10 transition";
        document.getElementById('qr-panel-generate').classList.remove('hidden');
        generateQrCode();
    } else {
        document.getElementById('qr-tab-btn-scan').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-accent-400 bg-accent-500/10 transition";
        document.getElementById('qr-panel-scan').classList.remove('hidden');
        setScanMode('camera');
    }
}

// GENERATE QR CODE VIA QRious
function generateQrCode() {
    const text = document.getElementById('qr-text-input')?.value || "https://google.com";
    const fg = document.getElementById('qr-color-fg')?.value || "#000000";
    const bg = document.getElementById('qr-color-bg')?.value || "#ffffff";
    const canvas = document.getElementById('qr-canvas');

    if (canvas) {
        qrSuiteState.qrInstance = new QRious({
            element: canvas,
            value: text,
            size: 250,
            foreground: fg,
            background: bg
        });
    }
}

function downloadQrCode() {
    const canvas = document.getElementById('qr-canvas');
    if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `QR_Code_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("QR Code baixado!");
    }
}

// SCANNER Lógica
function setScanMode(mode) {
    document.getElementById('scan-mode-camera').className = "py-2 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-xl transition flex items-center justify-center gap-1.5";
    document.getElementById('scan-mode-upload').className = "py-2 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-xl transition flex items-center justify-center gap-1.5";

    document.getElementById('scan-upload-zone').classList.add('hidden');
    document.getElementById('qr-reader').innerHTML = '';
    
    // Stop camera
    stopWebcamStream();
    if (qrSuiteState.html5QrcodeScanner) {
        qrSuiteState.html5QrcodeScanner.clear().catch(e => console.log(e));
        qrSuiteState.html5QrcodeScanner = null;
    }

    if (mode === 'camera') {
        document.getElementById('scan-mode-camera').className = "py-2 border border-accent-500 bg-accent-500/10 text-[10px] font-bold text-accent-400 rounded-xl transition flex items-center justify-center gap-1.5";
        startWebcamScanner();
    } else {
        document.getElementById('scan-mode-upload').className = "py-2 border border-accent-500 bg-accent-500/10 text-[10px] font-bold text-accent-400 rounded-xl transition flex items-center justify-center gap-1.5";
        document.getElementById('scan-upload-zone').classList.remove('hidden');
    }
}

// WEBCAM LIVE SCANNER
function startWebcamScanner() {
    qrSuiteState.html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    const config = { fps: 10, qrbox: { width: 200, height: 200 } };
    
    qrSuiteState.html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            onQrCodeDecoded(decodedText);
        },
        (errorMessage) => {
            // Silently listen
        }
    ).then(stream => {
        activeWebcamStream = stream; // Guard globally
    }).catch(err => {
        console.error("Camera fail:", err);
        showNotification("Não foi possível acessar a câmera. Use o upload de arquivo.");
        setScanMode('upload');
    });
}

// DECODE FILE UPLOAD
function scanQrFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.scanFile(file, true)
        .then(decodedText => {
            onQrCodeDecoded(decodedText);
        })
        .catch(err => {
            console.error(err);
            showNotification("Nenhum QR Code detectado na imagem.");
        });
}

function onQrCodeDecoded(text) {
    document.getElementById('scan-result-text').innerText = text;
    document.getElementById('scan-result-panel').classList.remove('hidden');
    showNotification("Código detectado com sucesso!");
    
    // Play sound notification if possible
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Beep high pitch
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch(e) {}
}

function copyScanResult() {
    const text = document.getElementById('scan-result-text').innerText;
    if (text) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showNotification("Copiado para a área de transferência!");
    }
}

// OmniTool Studio Core Router & Application Manager

// Active states
let currentToolId = 'dashboard';
let activeWebcamStream = null; // Guard webcams globally for clean switches

// Define Available Tools configuration
const tools = {
    'dashboard': {
        title: 'Painel Geral',
        init: renderDashboard
    },
    'bg-remover': {
        title: 'Remover Fundo IA',
        init: () => {
            if (typeof initBgRemover === 'function') initBgRemover();
        }
    },
    'image-compressor': {
        title: 'Compressor Imagem',
        init: () => {
            if (typeof initImageCompressor === 'function') initImageCompressor();
        }
    },
    'qr-suite': {
        title: 'QR Code Suite',
        init: () => {
            if (typeof initQrSuite === 'function') initQrSuite();
        }
    },
    'color-palette': {
        title: 'Paleta de Cores',
        init: () => {
            if (typeof initColorPalette === 'function') initColorPalette();
        }
    }
};

// Document elements loaded
window.addEventListener('DOMContentLoaded', () => {
    // Load API key from local storage
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        document.getElementById('input-api-key').value = savedKey;
        updateApiStatus(true);
    }
    
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        themeBtn.innerHTML = document.documentElement.classList.contains('dark') 
            ? '<i class="fa-solid fa-moon text-lg"></i>' 
            : '<i class="fa-solid fa-sun text-lg"></i>';
    });

    // Start by showing the dashboard
    switchTool('dashboard');
});

// ROUTING MECHANISM
function switchTool(toolId) {
    if (!tools[toolId]) return;

    // Clean up active webcam feeds before leaving tools
    stopWebcamStream();

    currentToolId = toolId;

    // Update navigation active states
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = "nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-400 hover:text-slate-200 hover:bg-slate-900/50";
    });
    
    const activeBtn = document.getElementById(`nav-${toolId}`);
    if (activeBtn) {
        activeBtn.className = "nav-btn active flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-300 hover:bg-slate-900/50";
    }

    // Load tool template content and run initialization
    loadToolTemplate(toolId);
}

function navigateToDashboard() {
    switchTool('dashboard');
}

// RENDER DASHBOARD (HOME SCREEN)
function renderDashboard() {
    const viewport = document.getElementById('tool-viewport');
    viewport.innerHTML = `
        <div class="fade-in max-w-4xl mx-auto py-4 space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-3xl font-display font-bold text-white">Bem-vindo ao OmniTool Studio</h2>
                <p class="text-xs text-slate-400 max-w-lg mx-auto">Seu canivete suíço de utilidades inteligentes. Todas as operações de processamento ocorrem 100% no seu navegador sem enviar dados a servidores.</p>
            </div>

            <!-- GRID DE FERRAMENTAS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                
                <!-- CARD REMOVER FUNDO -->
                <div onclick="switchTool('bg-remover')" class="group cursor-pointer bg-slate-900/30 border border-slate-900 rounded-2xl p-5 hover:border-accent-500/30 hover:bg-slate-900/50 transition duration-300 flex items-start gap-4">
                    <div class="p-3 rounded-xl bg-accent-600/10 text-accent-400 group-hover:bg-accent-600 group-hover:text-white transition duration-300">
                        <i class="fa-solid fa-wand-magic-sparkles text-xl"></i>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-display font-bold text-sm text-white group-hover:text-accent-400 transition">Remover Fundo de Imagem</h3>
                        <p class="text-xs text-slate-400 leading-relaxed">Apague fundos instantaneamente usando inteligência artificial local ou restaure detalhes manualmente.</p>
                    </div>
                </div>

                <!-- CARD COMPRESSOR DE IMAGENS -->
                <div onclick="switchTool('image-compressor')" class="group cursor-pointer bg-slate-900/30 border border-slate-900 rounded-2xl p-5 hover:border-accent-500/30 hover:bg-slate-900/50 transition duration-300 flex items-start gap-4">
                    <div class="p-3 rounded-xl bg-accent-600/10 text-accent-400 group-hover:bg-accent-600 group-hover:text-white transition duration-300">
                        <i class="fa-solid fa-compress text-xl"></i>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-display font-bold text-sm text-white group-hover:text-accent-400 transition">Compressor e Conversor</h3>
                        <p class="text-xs text-slate-400 leading-relaxed">Comprima o peso físico de imagens (JPEG, PNG, WebP) direto no navegador ajustando qualidade.</p>
                    </div>
                </div>

                <!-- CARD QR CODE SUITE -->
                <div onclick="switchTool('qr-suite')" class="group cursor-pointer bg-slate-900/30 border border-slate-900 rounded-2xl p-5 hover:border-accent-500/30 hover:bg-slate-900/50 transition duration-300 flex items-start gap-4">
                    <div class="p-3 rounded-xl bg-accent-600/10 text-accent-400 group-hover:bg-accent-600 group-hover:text-white transition duration-300">
                        <i class="fa-solid fa-qrcode text-xl"></i>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-display font-bold text-sm text-white group-hover:text-accent-400 transition">QR Code Suite</h3>
                        <p class="text-xs text-slate-400 leading-relaxed">Gere QR codes personalizados de links/textos ou escaneie códigos via webcam localmente.</p>
                    </div>
                </div>

                <!-- CARD PALETA DE CORES -->
                <div onclick="switchTool('color-palette')" class="group cursor-pointer bg-slate-900/30 border border-slate-900 rounded-2xl p-5 hover:border-accent-500/30 hover:bg-slate-900/50 transition duration-300 flex items-start gap-4">
                    <div class="p-3 rounded-xl bg-accent-600/10 text-accent-400 group-hover:bg-accent-600 group-hover:text-white transition duration-300">
                        <i class="fa-solid fa-palette text-xl"></i>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-display font-bold text-sm text-white group-hover:text-accent-400 transition">Extrator de Paleta</h3>
                        <p class="text-xs text-slate-400 leading-relaxed">Selecione fotos para extrair automaticamente as paletas de cores e copie os códigos HEX/RGB.</p>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// INJECT TOOL HTML & EXECUTE LOADER
function loadToolTemplate(toolId) {
    const viewport = document.getElementById('tool-viewport');
    
    // Show Loader
    viewport.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-3xl">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
            <p class="text-xs text-slate-400">Carregando ${tools[toolId].title}...</p>
        </div>
    `;

    setTimeout(() => {
        // Load target file script dynamically if not loaded yet
        if (toolId !== 'dashboard') {
            const scriptId = `script-tool-${toolId}`;
            if (!document.getElementById(scriptId)) {
                const script = document.createElement('script');
                script.id = scriptId;
                script.src = `js/tools/${toolId}.js`;
                script.onload = () => {
                    tools[toolId].init();
                };
                script.onerror = () => {
                    viewport.innerHTML = `<div class="text-center py-12 text-red-400 text-xs">Erro ao carregar os recursos do módulo ${toolId}.</div>`;
                };
                document.body.appendChild(script);
            } else {
                tools[toolId].init();
            }
        } else {
            tools[toolId].init();
        }
    }, 200);
}

// GLOBAL UTILITIES & EVENT HANDLERS
function toggleApiModal() {
    document.getElementById('api-modal').classList.toggle('hidden');
}

function saveApiKey() {
    const key = document.getElementById('input-api-key').value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        updateApiStatus(true);
        showNotification("Chave Gemini API configurada com sucesso.");
        toggleApiModal();
        
        // Trigger a custom event to notify current active tools
        document.dispatchEvent(new CustomEvent('gemini-key-updated'));
    } else {
        localStorage.removeItem('gemini_api_key');
        updateApiStatus(false);
        showNotification("Chave API removida.");
        toggleApiModal();
    }
}

function updateApiStatus(hasKey) {
    const btnText = document.getElementById('api-status-text');
    if (hasKey) {
        btnText.innerHTML = `<span class="text-emerald-400"><i class="fa-solid fa-circle-check"></i> Ativa</span>`;
    } else {
        btnText.innerHTML = `Chave Gemini API`;
    }
}

function showNotification(text) {
    const alertBox = document.createElement('div');
    alertBox.className = "fixed bottom-6 right-6 z-50 py-3.5 px-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white shadow-2xl flex items-center gap-2.5 transform translate-y-10 opacity-0 transition-all duration-300";
    alertBox.innerHTML = `
        <i class="fa-solid fa-circle-info text-accent-400 text-base"></i>
        <span>${text}</span>
    `;
    document.body.appendChild(alertBox);

    setTimeout(() => {
        alertBox.classList.remove('translate-y-10', 'opacity-0');
    }, 50);

    setTimeout(() => {
        alertBox.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => {
            document.body.removeChild(alertBox);
        }, 300);
    }, 3500);
}

// WEBCAM CONTROLLER FOR QR SCANNING
function stopWebcamStream() {
    if (activeWebcamStream) {
        activeWebcamStream.getTracks().forEach(track => track.stop());
        activeWebcamStream = null;
    }
}

// RESILIENT FETCH BACKOFF
async function fetchWithBackoff(url, options, retries = 3, delay = 1000) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP Error Status: ${res.status}`);
        return res;
    } catch (err) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithBackoff(url, options, retries - 1, delay * 2);
        }
        throw err;
    }
}

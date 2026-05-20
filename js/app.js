let currentToolId = 'dashboard';
let activeWebcamStream = null;

const tools = {
    'dashboard': { title: 'Painel Geral', init: renderDashboard },
    'bg-remover': { title: 'Remover Fundo IA', init: () => { if (typeof initBgRemover === 'function') initBgRemover(); } },
    'bg-generator': { title: 'Gerador de Fundos IA', init: () => { if (typeof initBgGenerator === 'function') initBgGenerator(); } },
    'grab-text': { title: 'Extrair Texto OCR', init: () => { if (typeof initGrabText === 'function') initGrabText(); } },
    'magic-grab': { title: 'Mover Sujeito', init: () => { if (typeof initMagicGrab === 'function') initMagicGrab(); } },
    'magic-eraser': { title: 'Apagar Objetos', init: () => { if (typeof initMagicEraser === 'function') initMagicEraser(); } },
    'canva-editor': { title: 'Canva Editor', init: () => { if (typeof initCanvaEditor === 'function') initCanvaEditor(); } },
    'color-palette': { title: 'Paleta de Cores', init: () => { if (typeof initColorPalette === 'function') initColorPalette(); } }
};

const toolFileMap = {
    'bg-remover': 'background-remover',
    'bg-generator': 'background-generator',
    'grab-text': 'grab-text',
    'magic-grab': 'magic-grab',
    'magic-eraser': 'magic-eraser',
    'canva-editor': 'canva-editor',
    'color-palette': 'color-palette'
};

window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        document.getElementById('input-api-key').value = savedKey;
        updateApiStatus(true);
    }

    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        themeBtn.innerHTML = document.documentElement.classList.contains('dark')
            ? '<i class="fa-solid fa-moon text-lg"></i>'
            : '<i class="fa-solid fa-sun text-lg"></i>';
    });

    switchTool('dashboard');

    trackPageView();
});

function switchTool(toolId) {
    if (!tools[toolId]) return;
    stopWebcamStream();
    currentToolId = toolId;

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = "nav-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-400 hover:text-slate-200 hover:bg-slate-900/50";
    });

    const activeBtn = document.getElementById(`nav-${toolId}`);
    if (activeBtn) {
        activeBtn.className = "nav-btn active flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-300 hover:bg-slate-900/50";
    }

    loadToolTemplate(toolId);
    trackToolView(toolId);
}

function navigateToDashboard() { switchTool('dashboard'); }

function renderDashboard() {
    const viewport = document.getElementById('tool-viewport');
    const cards = [
        { id: 'bg-remover', icon: 'fa-wand-magic-sparkles', title: 'Remover Fundo de Imagem', desc: 'Apague fundos usando IA focada em pessoas e objetos ou faça o recorte por cor com a varinha mágica.' },
        { id: 'bg-generator', icon: 'fa-image', title: 'Gerador de Fundos IA', desc: 'Gere imagens de fundo criativas usando o Gemini Imagen e faça fusão automática do sujeito.' },
        { id: 'grab-text', icon: 'fa-file-lines', title: 'Extrair Texto OCR', desc: 'Escaneie e capture textos contidos em qualquer imagem localmente usando Tesseract.js.' },
        { id: 'magic-grab', icon: 'fa-arrows-up-down-left-right', title: 'Mover Sujeito (Magic Grab)', desc: 'Recorte o sujeito da imagem original e arraste, escale ou reposicione de forma interativa.' },
        { id: 'magic-eraser', icon: 'fa-eraser', title: 'Apagar Objetos (Magic Eraser)', desc: 'Desenhe com o pincel sobre marcas, textos ou elementos que deseja ocultar da imagem.' },
        { id: 'canva-editor', icon: 'fa-object-group', title: 'Canva Editor', desc: 'Crie designs profissionais com templates, camadas, textos, formas geométricas e exportação em alta resolução.', badge: 'Novo' },
        { id: 'color-palette', icon: 'fa-palette', title: 'Extrator de Paleta', desc: 'Selecione fotos para extrair automaticamente as paletas de cores e copie os códigos HEX/RGB.' }
    ];

    viewport.innerHTML = `
        <div class="fade-in max-w-4xl mx-auto py-4 space-y-6">
            <div class="text-center space-y-2">
                <h2 class="text-3xl font-display font-bold text-white">Bem-vindo ao OmniTool Studio</h2>
                <p class="text-xs text-slate-400 max-w-lg mx-auto">Seu canivete suíço de utilidades inteligentes. Todas as operações ocorrem 100% no seu navegador sem enviar dados a servidores.</p>
            </div>

            <!-- AD UNIT: In-feed Dashboard -->
            <div class="ad-slot ad-infeed w-full h-[100px] bg-slate-900/30 border border-slate-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden" role="complementary" aria-label="Publicidade">
                <span class="text-[9px] text-slate-600 uppercase tracking-widest absolute top-1 left-3">Anúncio</span>
                <div class="text-xs text-slate-500 font-medium"><i class="fa-solid fa-rectangle-ad mr-1.5"></i> In-feed Ad - AdSense</div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                ${cards.map(c => `
                <div onclick="switchTool('${c.id}')" class="group cursor-pointer bg-slate-900/30 border border-slate-900 rounded-2xl p-5 hover:border-accent-500/30 hover:bg-slate-900/50 transition duration-300 flex items-start gap-4" role="button" tabindex="0" aria-label="Abrir ${c.title}">
                    <div class="p-3 rounded-xl bg-accent-600/10 text-accent-400 group-hover:bg-accent-600 group-hover:text-white transition duration-300 shrink-0">
                        <i class="fa-solid ${c.icon} text-xl"></i>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-display font-bold text-sm text-white group-hover:text-accent-400 transition flex items-center gap-2">
                            ${c.title}
                            ${c.badge ? `<span class="text-[8px] bg-accent-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">${c.badge}</span>` : ''}
                        </h3>
                        <p class="text-xs text-slate-400 leading-relaxed">${c.desc}</p>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
    `;
}

function loadToolTemplate(toolId) {
    const viewport = document.getElementById('tool-viewport');
    viewport.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-3xl">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
            <p class="text-xs text-slate-400">Carregando ${tools[toolId].title}...</p>
        </div>
    `;

    setTimeout(() => {
        if (toolId !== 'dashboard') {
            const scriptId = `script-tool-${toolId}`;
            if (!document.getElementById(scriptId)) {
                const script = document.createElement('script');
                script.id = scriptId;
                script.src = `js/tools/${toolFileMap[toolId] || toolId}.js`;
                script.onload = () => tools[toolId].init();
                script.onerror = () => {
                    viewport.innerHTML = `<div class="text-center py-12 text-red-400 text-xs">Erro ao carregar o módulo ${tools[toolId].title}.</div>`;
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

function toggleApiModal() { document.getElementById('api-modal').classList.toggle('hidden'); }

function saveApiKey() {
    const key = document.getElementById('input-api-key').value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        updateApiStatus(true);
        showNotification("Chave Gemini API configurada com sucesso.");
        toggleApiModal();
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
    btnText.innerHTML = hasKey
        ? `<span class="text-emerald-400"><i class="fa-solid fa-circle-check"></i> Ativa</span>`
        : `Chave Gemini API`;
}

function showNotification(text) {
    const box = document.createElement('div');
    box.className = "fixed bottom-6 right-6 z-50 py-3.5 px-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white shadow-2xl flex items-center gap-2.5 transform translate-y-10 opacity-0 transition-all duration-300";
    box.innerHTML = `<i class="fa-solid fa-circle-info text-accent-400 text-base"></i><span>${text}</span>`;
    document.body.appendChild(box);
    requestAnimationFrame(() => { box.classList.remove('translate-y-10', 'opacity-0'); });
    setTimeout(() => {
        box.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => { if (box.parentNode) document.body.removeChild(box); }, 300);
    }, 3500);
}

async function callGeminiAPI(prompt, maxTokens = 200) {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        toggleApiModal();
        showNotification("Chave Gemini API necessária. Clique no botão da chave no topo para configurar.");
        return null;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
            })
        });
        const data = await res.json();
        if (!res.ok) {
            const errMsg = data?.error?.message || `Erro HTTP ${res.status}`;
            if (res.status === 403 || res.status === 401) {
                showNotification("Chave API inválida ou sem permissão. Clique no botão da chave no topo para corrigir.");
            } else {
                showNotification(`Erro Gemini: ${errMsg}`);
            }
            return null;
        }
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text.trim();
        }
        throw new Error('Resposta inválida da API Gemini');
    } catch (e) {
        console.error('Gemini API error:', e);
        if (!e.message.includes('Chave API') && !e.message.includes('inválida')) {
            showNotification(`Erro: ${e.message}`);
        }
        return null;
    }
}

async function callGeminiImagen(prompt, aspectRatio = '1:1') {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        toggleApiModal();
        showNotification("Chave Gemini API necessária. Clique no botão da chave no topo para configurar.");
        return null;
    }

    const models = [
        'gemini-2.0-flash-exp-image-generation',
        'gemini-2.0-flash-preview-image-generation',
        'gemini-1.5-flash'
    ];

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
                })
            });
            const data = await res.json();

            if (!res.ok) {
                const errMsg = data?.error?.message || `Erro HTTP ${res.status}`;
                console.warn(`Modelo ${model} falhou: ${errMsg}`);
                if (res.status === 403 || res.status === 401) {
                    showNotification("Chave API inválida ou sem permissão. Clique no botão da chave no topo para corrigir.");
                    return null;
                }
                if (res.status === 404) continue;
                throw new Error(errMsg);
            }

            if (data.candidates && data.candidates[0]?.content?.parts) {
                for (const part of data.candidates[0].content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }

            if (model === models[models.length - 1]) {
                throw new Error('Nenhuma imagem foi gerada. Tente reformular o prompt ou usar outra chave API.');
            }
        } catch (e) {
            if (e.message.includes('Chave API') || e.message.includes('inválida')) throw e;
            console.warn(`Modelo ${model} erro:`, e.message);
            if (model === models[models.length - 1]) {
                showNotification(`Erro: ${e.message}`);
                return null;
            }
        }
    }
    showNotification("Nenhum modelo de imagem disponível. Verifique sua chave API.");
    return null;
}

function stopWebcamStream() {
    if (activeWebcamStream) {
        activeWebcamStream.getTracks().forEach(track => track.stop());
        activeWebcamStream = null;
    }
}

async function fetchWithBackoff(url, options, retries = 3, delay = 1000) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delay));
            return fetchWithBackoff(url, options, retries - 1, delay * 2);
        }
        throw err;
    }
}

function trackPageView() {
    try { if (typeof gtag === 'function') gtag('event', 'page_view'); } catch(e) {}
}

function trackToolView(toolId) {
    try {
        if (typeof gtag === 'function') gtag('event', 'tool_view', { tool_name: toolId });
        if (typeof dataLayer !== 'undefined') dataLayer.push({ event: 'tool_view', tool_name: toolId });
    } catch(e) {}
}

function setupDragDrop(element, fileInput, onFile) {
    element.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { if (e.target.files[0]) onFile(e.target.files[0]); });
    element.addEventListener('dragover', (e) => { e.preventDefault(); element.classList.add('border-accent-500/50', 'bg-accent-500/5'); });
    element.addEventListener('dragleave', () => { element.classList.remove('border-accent-500/50', 'bg-accent-500/5'); });
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('border-accent-500/50', 'bg-accent-500/5');
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
}

function fitCanvasInContainer(canvas, container, padding = 32) {
    const cw = container.clientWidth - padding;
    const ch = container.clientHeight - padding;
    const iw = canvas.width;
    const ih = canvas.height;
    const scale = Math.min(cw / iw, ch / ih, 1.0);
    const ox = (container.clientWidth - iw * scale) / 2;
    const oy = (container.clientHeight - ih * scale) / 2;
    canvas.style.width = `${iw}px`;
    canvas.style.height = `${ih}px`;
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
    return scale;
}

function drawCheckerboard(ctx, w, h, size = 15) {
    const cols = Math.ceil(w / size);
    const rows = Math.ceil(h / size);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#0f172a';
            ctx.fillRect(c * size, r * size, size, size);
        }
    }
}

function canvasToImageCoords(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function downloadCanvasAsPNG(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename || `omnitool_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

async function copyTextToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    const toHex = c => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

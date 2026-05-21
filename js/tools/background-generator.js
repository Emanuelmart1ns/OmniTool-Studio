(function() {
    let state = {
        foregroundImage: null,
        foregroundFile: null,
        backgroundImage: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        prompt: "",
        subjectScale: 1.0,
        subjectPosition: { x: 500, y: 500 },
        isDraggingSubject: false,
        lastMousePos: { x: 0, y: 0 },
        canvasW: 1000,
        canvasH: 1000
    };

    window.initBgGenerator = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-image text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Gerador de Fundos IA</h3>
                            <p class="text-[10px] text-slate-400">Gere fundos com Gemini Imagen e componha</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-gen-download" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-download"></i> Salvar
                        </button>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <div class="lg:col-span-3 canvas-workspace" id="gen-workspace-container">
                        <div id="gen-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="gen-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-file-image text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione seu objeto (PNG transparente)</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Se a imagem tiver fundo, tentamos removê-lo automaticamente.</p>
                        </div>
                        <canvas id="canvas-bg-generator" class="hidden cursor-grab rounded-xl z-0"></canvas>
                        <div id="gen-loader" class="loader-overlay hidden">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="gen-loader-title">Processando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="gen-loader-desc"></p>
                        </div>
                    </div>

                    <div class="control-sidebar">
                        <div class="space-y-3">
                            <span class="tool-section-title">1. Objeto</span>
                            <div class="flex items-center gap-2">
                                <div class="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold uppercase overflow-hidden" id="obj-thumb">Vazio</div>
                                <button id="btn-re-upload" class="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-xs font-bold text-slate-300 transition">Substituir</button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-3">
                            <span class="tool-section-title">2. Cenário (Prompt)</span>
                            <div id="gen-api-warning" class="hidden p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-[10px] text-amber-300 flex items-center gap-2">
                                <i class="fa-solid fa-key text-amber-400"></i>
                                <span>Chave API necessária.</span>
                                <button onclick="if(typeof toggleApiModal==='function')toggleApiModal()" class="ml-auto px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] transition">Configurar</button>
                            </div>
                            <textarea id="ai-prompt" rows="3" placeholder="Ex: Mesa de mármore branco com iluminação suave..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-accent-500 transition leading-normal"></textarea>
                            <div class="flex gap-2">
                                <button id="btn-enhance-prompt" class="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-700 text-[10px] font-bold text-amber-400 transition flex items-center justify-center gap-1.5">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i> Aprimorar
                                </button>
                                <button id="btn-generate-bg" class="flex-[1.5] py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-accent-500/10" disabled>
                                    <i class="fa-solid fa-sparkles"></i> Criar Fundo IA
                                </button>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                <button onclick="document.getElementById('ai-prompt').value='Estúdio de produto profissional, fundo infinito bokeh elegante'" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]">Estúdio</button>
                                <button onclick="document.getElementById('ai-prompt').value='Cozinha moderna com luz solar suave, plantas verdes'" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]">Cozinha</button>
                                <button onclick="document.getElementById('ai-prompt').value='Praia ao pôr do sol, areia dourada, ondas suaves'" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]">Praia</button>
                                <button onclick="document.getElementById('ai-prompt').value='Escritório tech, luz azul neon, profundidade de campo'" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]">Neon</button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-3">
                            <span class="tool-section-title">3. Ajustes</span>
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-[10px] text-slate-300">
                                    <span>Tamanho:</span>
                                    <span id="subject-scale-val" class="font-bold text-accent-400">100%</span>
                                </div>
                                <input type="range" id="subject-scale" min="10" max="250" value="100" class="w-full" disabled>
                            </div>
                            <p class="text-[9px] text-slate-500">Arraste o objeto na tela para reposicionar.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setupListeners();
        checkApiKeyStatus();
    };

    function checkApiKeyStatus() {
        const hasKey = !!localStorage.getItem('gemini_api_key');
        const warning = document.getElementById('gen-api-warning');
        if (warning) warning.classList.toggle('hidden', hasKey);
    }

    document.addEventListener('gemini-key-updated', () => {
        const warning = document.getElementById('gen-api-warning');
        if (warning) warning.classList.toggle('hidden', !!localStorage.getItem('gemini_api_key'));
    });

    function setupListeners() {
        const uploader = document.getElementById('gen-file-uploader');
        const placeholder = document.getElementById('gen-placeholder');
        setupDragDrop(placeholder, uploader, (file) => handleFile(file));
        document.getElementById('btn-re-upload').addEventListener('click', () => uploader.click());

        document.getElementById('btn-enhance-prompt').addEventListener('click', enhancePrompt);
        document.getElementById('btn-generate-bg').addEventListener('click', generateBackground);
        document.getElementById('btn-gen-download').addEventListener('click', downloadComposition);

        document.getElementById('subject-scale').addEventListener('input', (e) => {
            state.subjectScale = parseFloat(e.target.value) / 100;
            document.getElementById('subject-scale-val').innerText = `${e.target.value}%`;
            renderComposition();
        });

        const canvas = document.getElementById('canvas-bg-generator');
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', endDrag);
    }

    function handleFile(file) {
        state.foregroundFile = file;
        showLoader('Carregando...', 'Processando objeto.');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                if (hasAlpha(img)) { loadForeground(img); }
                else { tryRemoveBg(file, img); }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function hasAlpha(img) {
        const c = document.createElement('canvas');
        const s = Math.min(img.naturalWidth, img.naturalHeight, 100);
        c.width = s; c.height = s;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        for (let i = 3; i < d.length; i += 4) { if (d[i] < 250) return true; }
        return false;
    }

    async function tryRemoveBg(file, img) {
        showLoader('Isolando...', 'Removendo fundo automaticamente.');
        if (window.imglyRemoveBackground) {
            try {
                const blob = await window.imglyRemoveBackground(file, {
                    model: 'isnet', device: 'cpu', proxyToWorker: true
                });
                const url = URL.createObjectURL(blob);
                const tImg = new Image();
                tImg.onload = () => { URL.revokeObjectURL(url); loadForeground(tImg); };
                tImg.src = url;
                return;
            } catch {}
        }
        loadForeground(img);
        hideLoader();
        showNotification("Carregado original. Envie PNG transparente para melhor resultado.");
    }

    function cropTransparent(img) {
        const c = document.createElement('canvas');
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, w, h).data;
        let minX = w, maxX = 0, minY = h, maxY = 0, found = false;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 5) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                found = true;
            }
        }
        if (!found) return c;
        minX = Math.max(0, minX - 2); minY = Math.max(0, minY - 2);
        maxX = Math.min(w - 1, maxX + 2); maxY = Math.min(h - 1, maxY + 2);
        const cw = maxX - minX + 1, ch = maxY - minY + 1;
        const crop = document.createElement('canvas');
        crop.width = cw; crop.height = ch;
        crop.getContext('2d').drawImage(img, minX, minY, cw, ch, 0, 0, cw, ch);
        return crop;
    }

    function loadForeground(img) {
        const cropped = cropTransparent(img);
        state.foregroundImage = cropped;

        const thumb = document.getElementById('obj-thumb');
        thumb.innerHTML = '';
        const tc = document.createElement('canvas'); tc.width = 48; tc.height = 48;
        const tCtx = tc.getContext('2d');
        const s = Math.min(48 / cropped.width, 48 / cropped.height);
        const tw = cropped.width * s, th = cropped.height * s;
        tCtx.drawImage(cropped, (48 - tw) / 2, (48 - th) / 2, tw, th);
        thumb.appendChild(tc);

        state.workspaceCanvas = document.getElementById('canvas-bg-generator');
        state.workspaceCtx = state.workspaceCanvas.getContext('2d');
        state.workspaceCanvas.width = state.canvasW;
        state.workspaceCanvas.height = state.canvasH;
        fitCanvasInContainer(state.workspaceCanvas, document.getElementById('gen-workspace-container'));
        state.workspaceCanvas.classList.remove('hidden');

        state.subjectScale = Math.min(600 / cropped.width, 600 / cropped.height, 1.0);
        state.subjectPosition = { x: 500, y: 500 };

        document.getElementById('gen-placeholder').classList.add('hidden');
        document.getElementById('btn-generate-bg').removeAttribute('disabled');
        document.getElementById('subject-scale').removeAttribute('disabled');
        document.getElementById('subject-scale').value = Math.round(state.subjectScale * 100);
        document.getElementById('subject-scale-val').innerText = `${Math.round(state.subjectScale * 100)}%`;

        hideLoader(); renderComposition();
    }

    function renderComposition() {
        if (!state.workspaceCanvas) return;
        const ctx = state.workspaceCtx;
        const w = state.canvasW, h = state.canvasH;
        ctx.clearRect(0, 0, w, h);

        if (state.backgroundImage) {
            ctx.drawImage(state.backgroundImage, 0, 0, w, h);
        } else {
            ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
            ctx.strokeRect(20, 20, w - 40, h - 40);
            ctx.fillStyle = '#64748b'; ctx.font = '24px Outfit, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Digite um prompt e clique em "Criar Fundo IA"', w / 2, h / 2);
        }

        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const sw = img.width * state.subjectScale;
            const sh = img.height * state.subjectScale;
            ctx.save();
            ctx.drawImage(img, state.subjectPosition.x - sw / 2, state.subjectPosition.y - sh / 2, sw, sh);
            ctx.strokeStyle = 'rgba(124, 58, 237, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(state.subjectPosition.x - sw / 2 - 2, state.subjectPosition.y - sh / 2 - 2, sw + 4, sh + 4);
            ctx.restore();
        }
    }

    async function enhancePrompt() {
        const promptInput = document.getElementById('ai-prompt');
        const userPrompt = promptInput.value.trim();
        if (!userPrompt) { showNotification("Digite uma ideia primeiro."); return; }

        if (!localStorage.getItem('gemini_api_key')) {
            if (typeof toggleApiModal === 'function') toggleApiModal();
            showNotification("Configure sua chave Gemini API primeiro. Clique no botão da chave no topo.");
            return;
        }

        showLoader('Aprimorando...', 'Gemini criando prompt otimizado.');
        const result = await callGeminiAPI(`Transforme esta ideia de fundo fotográfico em um prompt detalhado e profissional para marketing. Seja conciso em inglês. Ideia: "${userPrompt}". Responda APENAS com o prompt.`, 100);
        if (result) { promptInput.value = result; showNotification("Prompt aprimorado!"); }
        hideLoader();
    }

    async function generateBackground() {
        const prompt = document.getElementById('ai-prompt').value.trim();
        if (!prompt) { showNotification("Descreva o cenário do fundo."); return; }

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            if (typeof toggleApiModal === 'function') toggleApiModal();
            showNotification("Configure sua chave Gemini API primeiro. Clique no botão da chave no topo.");
            return;
        }

        showLoader('Criando Fundo...', 'Gerando imagem com Gemini IA... Isso pode levar 10-30s.');

        const imagenModels = ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001'];
        let imageUrl = null;

        for (const model of imagenModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{ prompt: prompt }],
                        parameters: { sampleCount: 1, aspectRatio: '1:1' }
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.predictions && data.predictions.length > 0 && data.predictions[0].bytesBase64Encoded) {
                        imageUrl = `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
                        break;
                    }
                } else if (res.status === 403 || res.status === 401) {
                    hideLoader();
                    showNotification("Chave API inválida ou sem permissão. Clique no botão da chave no topo.");
                    return;
                }
            } catch (e) {
                console.warn(`Imagen model ${model} failed:`, e);
            }
        }

        if (!imageUrl) {
            // tentativa final via Gemini Imagen
            try { imageUrl = await callGeminiImagen(prompt); }
            catch (e) { imageUrl = null; }
        }

        if (!imageUrl) {
            // fallback local: gera um background sintético simples para manter fluxo de trabalho
            imageUrl = generateLocalBackground(prompt);
            showNotification('Gerador IA indisponível — aplicando fallback local.');
        }

        if (imageUrl) {
            const img = new Image();
            img.onload = () => {
                state.backgroundImage = img;
                document.getElementById('btn-gen-download').removeAttribute('disabled');
                checkApiKeyStatus();
                hideLoader(); renderComposition();
                showNotification("Fundo gerado e integrado!");
            };
            img.onerror = () => {
                hideLoader();
                showNotification("Erro ao carregar a imagem gerada. Tente novamente.");
            };
            img.src = imageUrl;
        } else {
            hideLoader();
        }
    }

    function startDrag(e) {
        if (!state.foregroundImage) return;
        const coords = canvasToImageCoords(state.workspaceCanvas, e.clientX, e.clientY);
        const sw = state.foregroundImage.width * state.subjectScale;
        const sh = state.foregroundImage.height * state.subjectScale;
        const l = state.subjectPosition.x - sw / 2;
        const t = state.subjectPosition.y - sh / 2;
        if (coords.x >= l && coords.x <= l + sw && coords.y >= t && coords.y <= t + sh) {
            state.isDraggingSubject = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.style.cursor = 'grabbing';
        }
    }

    function doDrag(e) {
        if (!state.isDraggingSubject) return;
        const rect = state.workspaceCanvas.getBoundingClientRect();
        const sx = state.canvasW / rect.width;
        const sy = state.canvasH / rect.height;
        state.subjectPosition.x += (e.clientX - state.lastMousePos.x) * sx;
        state.subjectPosition.y += (e.clientY - state.lastMousePos.y) * sy;
        state.lastMousePos = { x: e.clientX, y: e.clientY };
        renderComposition();
    }

    function endDrag() {
        if (state.isDraggingSubject) {
            state.isDraggingSubject = false;
            state.workspaceCanvas.style.cursor = 'grab';
        }
    }

    function downloadComposition() {
        if (!state.workspaceCanvas) return;
        const c = document.createElement('canvas');
        c.width = state.canvasW; c.height = state.canvasH;
        const ctx = c.getContext('2d');
        if (state.backgroundImage) ctx.drawImage(state.backgroundImage, 0, 0, state.canvasW, state.canvasH);
        else { ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, state.canvasW, state.canvasH); }
        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const sw = img.width * state.subjectScale, sh = img.height * state.subjectScale;
            ctx.drawImage(img, state.subjectPosition.x - sw / 2, state.subjectPosition.y - sh / 2, sw, sh);
        }
        downloadCanvasAsPNG(c, `composicao_ia_${Date.now()}.png`);
    }

    function generateLocalBackground(prompt) {
        const w = state.canvasW || 1000;
        const h = state.canvasH || 1000;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const p = (prompt || '').toLowerCase();
        let a = '#0f172a', b = '#0f172a';
        if (p.includes('praia') || p.includes('beach') || p.includes('sunset')) { a = '#ffb347'; b = '#ffd194'; }
        else if (p.includes('neon') || p.includes('neon lights')) { a = '#0f172a'; b = '#6d28d9'; }
        else if (p.includes('studio') || p.includes('estúdio')) { a = '#0f172a'; b = '#111827'; }
        else if (p.includes('kitchen') || p.includes('cozinha')) { a = '#f6f2e8'; b = '#fff1e6'; }
        else { a = '#0f172a'; b = '#0b1220'; }
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, a);
        grad.addColorStop(1, b);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        // subtle noise
        ctx.globalAlpha = 0.06;
        for (let i = 0; i < Math.floor((w * h) / 8000); i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 6 + 1, Math.random() * 6 + 1);
        }
        ctx.globalAlpha = 1;
        return c.toDataURL('image/png');
    }

    function showLoader(title, desc) {
        document.getElementById('gen-loader-title').innerText = title;
        document.getElementById('gen-loader-desc').innerText = desc;
        document.getElementById('gen-loader').classList.remove('hidden');
    }
    function hideLoader() { document.getElementById('gen-loader').classList.add('hidden'); }
})();

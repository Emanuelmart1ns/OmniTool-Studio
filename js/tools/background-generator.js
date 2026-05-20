// OmniTool Studio: Background Generator Tool Module
(function() {
    let state = {
        foregroundImage: null, // Cropped foreground canvas
        backgroundImage: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        prompt: "",
        subjectScale: 1.0,
        subjectPosition: { x: 0, y: 0 },
        isDraggingSubject: false,
        lastMousePos: { x: 0, y: 0 }
    };

    window.initBgGenerator = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <!-- TOP BAR CONTROL -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-image text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Gerador de Fundos IA</h3>
                            <p class="text-[10px] text-slate-400">Gere fundos fotográficos realistas com o Imagen</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button id="btn-gen-download" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-download"></i> Salvar Imagem
                        </button>
                    </div>
                </div>

                <!-- WORKSPACE GRID -->
                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <!-- CANVAS AREA (LEFT 3 COLS) -->
                    <div class="lg:col-span-3 bg-slate-950/50 border border-slate-900 rounded-3xl relative flex items-center justify-center p-4 min-h-[300px] overflow-hidden" id="gen-workspace-container">
                        
                        <!-- UPLOAD PLACEHOLDER -->
                        <div id="gen-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="gen-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-file-image text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione seu objeto recortado (PNG transparente)</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Carregue um produto ou pessoa sem fundo. Se a imagem tiver fundo, podemos tentar removê-lo.</p>
                        </div>

                        <!-- WORK CANVAS -->
                        <canvas id="canvas-bg-generator" class="hidden cursor-grab rounded-xl z-0"></canvas>

                        <!-- COMPOSITION LOADER -->
                        <div id="gen-loader" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex-col items-center justify-center z-20 rounded-3xl">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="gen-loader-title">Processando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="gen-loader-desc">Gerando imagem por IA.</p>
                        </div>
                    </div>

                    <!-- CONTROL SIDEBAR (RIGHT 1 COL) -->
                    <div class="bg-slate-900/20 border border-slate-900 rounded-3xl p-4 flex flex-col gap-4">
                        
                        <!-- FOREGROUND OBJECT -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Objeto em Destaque</span>
                            <div class="flex items-center gap-2" id="fore-thumb-container">
                                <div class="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold uppercase overflow-hidden" id="obj-thumb">
                                    Vazio
                                </div>
                                <button id="btn-re-upload" class="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-xs font-bold text-slate-300 transition">
                                    Substituir Foto
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <!-- PROMPT GENERATOR -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Cenário do Fundo (Prompt)</span>
                            <textarea id="ai-prompt" rows="3" placeholder="Ex: Uma mesa de mármore branco com iluminação suave de estúdio, fundo desfocado com folhas de palmeira..." class="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:border-accent-500 transition leading-normal"></textarea>
                            
                            <div class="flex gap-2">
                                <button id="btn-enhance-prompt" class="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-700 text-[10px] font-bold text-amber-400 transition flex items-center justify-center gap-1.5">
                                    <i class="fa-solid fa-wand-magic-sparkles"></i> Aprimorar Prompt
                                </button>
                                <button id="btn-generate-bg" class="flex-[1.5] py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-accent-500/10" disabled>
                                    <i class="fa-solid fa-sparkles"></i> Criar Fundo IA
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <!-- SUBJECT LAYOUT CONTROLS -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. Ajustes do Objeto</span>
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-[10px] text-slate-300">
                                    <span>Tamanho do Objeto:</span>
                                    <span id="subject-scale-val" class="font-bold text-accent-400">100%</span>
                                </div>
                                <input type="range" id="subject-scale" min="10" max="250" value="100" class="w-full accent-accent-500 bg-slate-900 h-1 rounded-lg cursor-pointer" disabled>
                            </div>
                            <p class="text-[9px] text-slate-500 leading-normal">Dica: Você também pode clicar e arrastar o objeto na tela para reposicioná-lo.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupListeners();
    };

    function setupListeners() {
        const uploader = document.getElementById('gen-file-uploader');
        const placeholder = document.getElementById('gen-placeholder');
        const reUploaderBtn = document.getElementById('btn-re-upload');

        placeholder.addEventListener('click', () => uploader.click());
        reUploaderBtn.addEventListener('click', () => uploader.click());
        uploader.addEventListener('change', handleFileSelect);

        document.getElementById('btn-enhance-prompt').addEventListener('click', enhancePrompt);
        document.getElementById('btn-generate-bg').addEventListener('click', generateBackground);
        document.getElementById('btn-gen-download').addEventListener('click', downloadComposition);

        // Subject scaling slider
        const scaleInput = document.getElementById('subject-scale');
        scaleInput.addEventListener('input', (e) => {
            state.subjectScale = parseFloat(e.target.value) / 100;
            document.getElementById('subject-scale-val').innerText = `${e.target.value}%`;
            renderComposition();
        });

        // Mouse canvas drag & drop
        const canvas = document.getElementById('canvas-bg-generator');
        canvas.addEventListener('mousedown', startDragSubject);
        canvas.addEventListener('mousemove', dragSubject);
        window.addEventListener('mouseup', endDragSubject);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        showLoader('Carregando...', 'Processando objeto selecionado.');

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                if (hasAlphaChannel(img)) {
                    loadForeground(img);
                } else {
                    showLoader('Isolando Objeto...', 'Detectando contorno e removendo fundo automaticamente.');
                    tryFastLocalRemoval(file, img);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function hasAlphaChannel(img) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.naturalWidth, 100);
        canvas.height = Math.min(img.naturalHeight, 100);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 250) return true;
        }
        return false;
    }

    function tryFastLocalRemoval(file, img) {
        if (window.imglyRemoveBackground) {
            window.imglyRemoveBackground(file, {
                model: 'isnet_quint8',
                device: 'cpu',
                proxyToWorker: false
            }).then(blob => {
                const url = URL.createObjectURL(blob);
                const transparentImg = new Image();
                transparentImg.onload = function() {
                    loadForeground(transparentImg);
                };
                transparentImg.src = url;
            }).catch(() => {
                loadForeground(img);
                if (typeof showNotification === 'function') showNotification("Não removeu fundo automaticamente. Carregado original.");
            });
        } else {
            loadForeground(img);
            if (typeof showNotification === 'function') showNotification("Carregado original. Recomendamos enviar fotos com transparência.");
        }
    }

    // HELPER: CROP TRANSPARENT PNG TO BOUNDING BOX
    function cropTransparentImage(img) {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, maxX = 0, minY = h, maxY = 0;
        let found = false;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (data[idx+3] > 5) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }
        
        if (!found) return img;
        
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        cropCanvas.getContext('2d').drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        
        return cropCanvas;
    }

    function loadForeground(img) {
        // Crop transparent padding out
        const croppedCanvas = cropTransparentImage(img);
        state.foregroundImage = croppedCanvas;

        // Show thumb preview
        const thumb = document.getElementById('obj-thumb');
        thumb.innerHTML = '';
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 48;
        thumbCanvas.height = 48;
        const thumbCtx = thumbCanvas.getContext('2d');
        const scale = Math.min(48 / croppedCanvas.width, 48 / croppedCanvas.height);
        const w = croppedCanvas.width * scale;
        const h = croppedCanvas.height * scale;
        thumbCtx.drawImage(croppedCanvas, (48 - w) / 2, (48 - h) / 2, w, h);
        thumb.appendChild(thumbCanvas);

        // Canvas setups
        state.workspaceCanvas = document.getElementById('canvas-bg-generator');
        state.workspaceCtx = state.workspaceCanvas.getContext('2d');

        // Set dimensions (Default high resolution composition 1000x1000)
        state.workspaceCanvas.width = 1000;
        state.workspaceCanvas.height = 1000;
        
        // CSS Overrides to keep scale logic perfect
        state.workspaceCanvas.style.width = '1000px';
        state.workspaceCanvas.style.height = '1000px';
        state.workspaceCanvas.style.maxWidth = 'none';
        state.workspaceCanvas.style.maxHeight = 'none';
        state.workspaceCanvas.style.transformOrigin = '0 0';

        // Fit workspace canvas in viewport
        const container = document.getElementById('gen-workspace-container');
        const viewScale = Math.min((container.clientWidth - 32) / 1000, (container.clientHeight - 32) / 1000, 1.0);
        const ox = (container.clientWidth - 1000 * viewScale) / 2;
        const oy = (container.clientHeight - 1000 * viewScale) / 2;
        state.workspaceCanvas.style.transform = `translate(${ox}px, ${oy}px) scale(${viewScale})`;
        state.workspaceCanvas.classList.remove('hidden');

        // Center subject with a reasonable scale relative to 1000x1000 composition canvas
        state.subjectScale = Math.min(600 / croppedCanvas.width, 600 / croppedCanvas.height, 1.0);
        state.subjectPosition = { x: 500, y: 500 };

        document.getElementById('gen-placeholder').classList.add('hidden');
        document.getElementById('btn-generate-bg').removeAttribute('disabled');
        document.getElementById('subject-scale').removeAttribute('disabled');
        
        const sliderPct = Math.round(state.subjectScale * 100);
        document.getElementById('subject-scale').value = sliderPct;
        document.getElementById('subject-scale-val').innerText = `${sliderPct}%`;

        hideLoader();
        renderComposition();
    }

    function renderComposition() {
        if (!state.workspaceCanvas) return;

        const canvas = state.workspaceCanvas;
        const ctx = state.workspaceCtx;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw Background
        if (state.backgroundImage) {
            ctx.drawImage(state.backgroundImage, 0, 0, w, h);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.strokeRect(20, 20, w - 40, h - 40);

            ctx.fillStyle = '#64748b';
            ctx.font = '24px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Nenhum Fundo Gerado. Digite um prompt e clique em "Criar Fundo IA".', w/2, h/2);
        }

        // 2. Draw Foreground Subject (movable)
        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const subW = img.width * state.subjectScale;
            const subH = img.height * state.subjectScale;

            ctx.save();
            ctx.drawImage(img, state.subjectPosition.x - subW / 2, state.subjectPosition.y - subH / 2, subW, subH);
            
            // Subtle boundary box on subject
            ctx.strokeStyle = 'rgba(124, 58, 237, 0.5)';
            ctx.lineWidth = Math.max(2, 2 / (parseFloat(state.workspaceCanvas.style.transform.match(/scale\((.*?)\)/)?.[1] || 1)));
            ctx.strokeRect(state.subjectPosition.x - subW / 2 - 2, state.subjectPosition.y - subH / 2 - 2, subW + 4, subH + 4);
            ctx.restore();
        }
    }

    // GEMINI PROMPT ENHANCER
    async function enhancePrompt() {
        const apiKey = localStorage.getItem('gemini_api_key') || "";
        const promptInput = document.getElementById('ai-prompt');
        const userPrompt = promptInput.value.trim();

        if (!userPrompt) {
            if (typeof showNotification === 'function') showNotification("Digite uma ideia básica antes de aprimorar.");
            return;
        }

        if (!apiKey) {
            if (typeof toggleApiModal === 'function') toggleApiModal();
            if (typeof showNotification === 'function') showNotification("Chave Gemini API necessária.");
            return;
        }

        showLoader('Aprimorador IA', 'O Gemini está criando um prompt fotográfico otimizado...');

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const requestPayload = {
            contents: [
                {
                    parts: [
                        {
                            text: `Transforme esta ideia simples de fundo fotográfico em um prompt detalhado e profissional de imagem de estúdio para marketing de produtos. Seja conciso e descritivo em inglês. Ideia do usuário: "${userPrompt}". Responda APENAS com o novo prompt aprimorado.`
                        }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });

            const result = await response.json();
            if (result.candidates && result.candidates[0].content.parts[0].text) {
                const enhancedText = result.candidates[0].content.parts[0].text.trim();
                promptInput.value = enhancedText;
                hideLoader();
                if (typeof showNotification === 'function') showNotification("Prompt aprimorado com sucesso!");
            } else {
                throw new Error("Erro na geração do prompt.");
            }
        } catch (e) {
            console.error(e);
            hideLoader();
            if (typeof showNotification === 'function') showNotification("Falha ao aprimorar prompt.");
        }
    }

    // IMAGEN API CALL
    async function generateBackground() {
        const apiKey = localStorage.getItem('gemini_api_key') || "";
        const prompt = document.getElementById('ai-prompt').value.trim();

        if (!prompt) {
            if (typeof showNotification === 'function') showNotification("Descreva o cenário do fundo.");
            return;
        }

        if (!apiKey) {
            if (typeof toggleApiModal === 'function') toggleApiModal();
            if (typeof showNotification === 'function') showNotification("Insira uma chave API do Gemini nas configurações.");
            return;
        }

        showLoader('Criando Fundo...', 'O Gemini Imagen está gerando seu fundo sob medida...');

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1"
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.predictions && result.predictions[0].bytesBase64Encoded) {
                const base64 = result.predictions[0].bytesBase64Encoded;
                const imageUrl = `data:image/png;base64,${base64}`;

                const img = new Image();
                img.onload = function() {
                    state.backgroundImage = img;
                    document.getElementById('btn-gen-download').removeAttribute('disabled');
                    hideLoader();
                    renderComposition();
                    if (typeof showNotification === 'function') showNotification("Fundo de IA integrado!");
                };
                img.src = imageUrl;
            } else {
                throw new Error("Formato de resposta inválido.");
            }
        } catch (e) {
            console.error(e);
            hideLoader();
            if (typeof showNotification === 'function') showNotification("Erro ao chamar Imagen API. Verifique sua chave API.");
        }
    }

    // CANVAS DRAG EVENTS
    function startDragSubject(e) {
        if (!state.foregroundImage) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const scaleX = 1000 / rect.width;
        const scaleY = 1000 / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        const subW = state.foregroundImage.width * state.subjectScale;
        const subH = state.foregroundImage.height * state.subjectScale;
        const left = state.subjectPosition.x - subW / 2;
        const right = state.subjectPosition.x + subW / 2;
        const top = state.subjectPosition.y - subH / 2;
        const bottom = state.subjectPosition.y + subH / 2;

        if (clickX >= left && clickX <= right && clickY >= top && clickY <= bottom) {
            state.isDraggingSubject = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.style.cursor = 'grabbing';
        }
    }

    function dragSubject(e) {
        if (!state.isDraggingSubject) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const scaleX = 1000 / rect.width;
        const scaleY = 1000 / rect.height;

        const dx = (e.clientX - state.lastMousePos.x) * scaleX;
        const dy = (e.clientY - state.lastMousePos.y) * scaleY;

        state.subjectPosition.x += dx;
        state.subjectPosition.y += dy;
        state.lastMousePos = { x: e.clientX, y: e.clientY };

        renderComposition();
    }

    function endDragSubject() {
        if (state.isDraggingSubject) {
            state.isDraggingSubject = false;
            state.workspaceCanvas.style.cursor = 'grab';
        }
    }

    // EXPORT
    function downloadComposition() {
        if (!state.workspaceCanvas) return;
        
        // Export high resolution 1000x1000 composite without the 紫色 border
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        if (state.backgroundImage) {
            ctx.drawImage(state.backgroundImage, 0, 0, 1000, 1000);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 1000, 1000);
        }

        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const subW = img.width * state.subjectScale;
            const subH = img.height * state.subjectScale;
            ctx.drawImage(img, state.subjectPosition.x - subW / 2, state.subjectPosition.y - subH / 2, subW, subH);
        }

        const link = document.createElement('a');
        link.download = `composicao_ia_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // UTILS
    function showLoader(title, desc) {
        document.getElementById('gen-loader-title').innerText = title;
        document.getElementById('gen-loader-desc').innerText = desc;
        document.getElementById('gen-loader').className = "absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

    function hideLoader() {
        document.getElementById('gen-loader').className = "hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

})();

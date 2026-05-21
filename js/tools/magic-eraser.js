(function() {
    let state = {
        originalImage: null,
        originalDataURL: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        maskCanvas: null,
        maskCtx: null,
        brushSize: 35,
        zoomScale: 1.0,
        zoomOffset: { x: 0, y: 0 },
        isDrawing: false,
        isPanning: false,
        lastMousePos: { x: 0, y: 0 },
        lastImgPos: null,
        activeAction: 'brush',
        useAi: false,
        aiPrompt: ''
    };

    window.initMagicEraser = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-eraser text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Apagar Objetos (Magic Eraser)</h3>
                            <p class="text-[10px] text-slate-400">Pincele sobre elementos para removê-los</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-erase-clear" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition" disabled>Limpar</button>
                        <button id="btn-run-eraser" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-sparkles"></i> Apagar
                        </button>
                        <button id="btn-eraser-download" class="px-4 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-xs font-bold text-slate-200 transition flex items-center gap-1.5" disabled>
                            <i class="fa-solid fa-download"></i> Baixar
                        </button>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <div class="lg:col-span-3 canvas-workspace" id="eraser-workspace-container">
                        <div id="eraser-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="eraser-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-brush text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione uma imagem</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Pincele sobre o que deseja remover e clique Apagar.</p>
                        </div>
                        <canvas id="canvas-magic-eraser" class="hidden cursor-crosshair rounded-xl z-0"></canvas>
                        <div id="eraser-loader" class="loader-overlay hidden">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="eraser-loader-title">Apagando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="eraser-loader-desc"></p>
                        </div>
                    </div>

                    <div class="control-sidebar">
                        <div class="space-y-3">
                            <span class="tool-section-title">1. Modo</span>
                            <div class="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-900">
                                <button id="btn-eraser-tool-brush" class="engine-btn active py-2 rounded-lg text-xs font-bold text-center transition-all" disabled>
                                    <i class="fa-solid fa-paintbrush mr-1"></i> Pincel
                                </button>
                                <button id="btn-eraser-tool-pan" class="engine-btn py-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200" disabled>
                                    <i class="fa-solid fa-hand mr-1"></i> Mover
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-3">
                            <span class="tool-section-title">2. Pincel</span>
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-[10px] text-slate-300">
                                    <span>Espessura:</span>
                                    <span id="eraser-brush-size-val" class="font-bold text-accent-400">35px</span>
                                </div>
                                <input type="range" id="eraser-brush-size" min="5" max="150" value="35" class="w-full" disabled>
                            </div>
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-[10px] text-slate-300">
                                    <span>Suavidade:</span>
                                    <span id="eraser-brush-hardness-val" class="font-bold text-accent-400">80%</span>
                                </div>
                                <input type="range" id="eraser-brush-hardness" min="10" max="100" value="80" class="w-full" disabled>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-2">
                            <span class="tool-section-title">3. Guia de Fundo (Opcional)</span>
                            <input id="eraser-ai-prompt" type="text" class="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200" placeholder="Ex: grama, parede branca, mar...">
                            <p class="text-[10px] text-slate-500">Descreva o que deve preencher a área removida. Se vazio, a IA completará automaticamente.</p>
                        </div>

                        <hr class="border-slate-900">

                        <div class="text-[9px] text-slate-500 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-1">
                            <span class="font-bold text-slate-400 block"><i class="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Como usar:</span>
                            <p>1. Carregue uma imagem.</p>
                            <p>2. Pincele em vermelho a área a remover.</p>
                            <p>3. Clique "Apagar" para processar com IA.</p>
                            <p>4. Baixe o resultado!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setupListeners();
    };

    function setupListeners() {
        const uploader = document.getElementById('eraser-file-uploader');
        const placeholder = document.getElementById('eraser-placeholder');
        setupDragDrop(placeholder, uploader, (file) => handleFile(file));

        document.getElementById('btn-eraser-tool-brush').addEventListener('click', () => setToolMode('brush'));
        document.getElementById('btn-eraser-tool-pan').addEventListener('click', () => setToolMode('pan'));

        document.getElementById('eraser-brush-size').addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            document.getElementById('eraser-brush-size-val').innerText = `${state.brushSize}px`;
        });
        document.getElementById('eraser-brush-hardness').addEventListener('input', (e) => {
            document.getElementById('eraser-brush-hardness-val').innerText = `${e.target.value}%`;
        });

        state.useAi = true;
        const aiPromptInput = document.getElementById('eraser-ai-prompt');
        aiPromptInput.addEventListener('input', (e) => {
            state.aiPrompt = e.target.value;
        });

        document.getElementById('btn-erase-clear').addEventListener('click', clearMask);
        document.getElementById('btn-run-eraser').addEventListener('click', runInpainting);
        document.getElementById('btn-eraser-download').addEventListener('click', downloadResult);

        const canvas = document.getElementById('canvas-magic-eraser');
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
    }

    function handleFile(file) {
        showLoader('Carregando...', 'Configurando workspace.');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.originalDataURL = ev.target.result;

                state.workspaceCanvas = document.getElementById('canvas-magic-eraser');
                state.workspaceCtx = state.workspaceCanvas.getContext('2d', { willReadFrequently: true });
                state.maskCanvas = document.createElement('canvas');
                state.maskCanvas.width = img.naturalWidth;
                state.maskCanvas.height = img.naturalHeight;
                state.maskCtx = state.maskCanvas.getContext('2d', { willReadFrequently: true });

                state.workspaceCanvas.width = img.naturalWidth;
                state.workspaceCanvas.height = img.naturalHeight;
                state.workspaceCanvas.classList.remove('hidden');
                document.getElementById('eraser-placeholder').classList.add('hidden');

                fitCanvasInContainer(state.workspaceCanvas, document.getElementById('eraser-workspace-container'));
                state.zoomScale = 1.0; state.zoomOffset = { x: 0, y: 0 };

                ['btn-eraser-tool-brush', 'btn-eraser-tool-pan', 'eraser-brush-size', 'eraser-brush-hardness', 'btn-erase-clear', 'btn-run-eraser', 'btn-eraser-download'].forEach(id => {
                    document.getElementById(id).removeAttribute('disabled');
                });
                hideLoader(); renderWorkspace();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function setToolMode(mode) {
        state.activeAction = mode;
        const btnB = document.getElementById('btn-eraser-tool-brush');
        const btnP = document.getElementById('btn-eraser-tool-pan');
        if (mode === 'brush') {
            btnB.className = "engine-btn active py-2 rounded-lg text-xs font-bold text-center transition-all";
            btnP.className = "engine-btn py-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200";
            state.workspaceCanvas.style.cursor = 'crosshair';
        } else {
            btnP.className = "engine-btn active py-2 rounded-lg text-xs font-bold text-center transition-all";
            btnB.className = "engine-btn py-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200";
            state.workspaceCanvas.style.cursor = 'grab';
        }
    }

    function renderWorkspace() {
        if (!state.originalImage) return;
        const ctx = state.workspaceCtx;
        const w = state.workspaceCanvas.width;
        const h = state.workspaceCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(state.originalImage, 0, 0);
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(state.maskCanvas, 0, 0);
        ctx.restore();
    }

    function onDown(e) {
        if (!state.originalImage) return;
        const coords = canvasToImageCoords(state.workspaceCanvas, e.clientX, e.clientY);
        if (state.activeAction === 'pan') {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.style.cursor = 'grabbing';
        } else {
            state.isDrawing = true;
            paintStroke(coords.x, coords.y, true);
        }
    }

    function onMove(e) {
        if (!state.originalImage) return;
        const coords = canvasToImageCoords(state.workspaceCanvas, e.clientX, e.clientY);
        if (state.isPanning) {
            const rect = state.workspaceCanvas.getBoundingClientRect();
            const s = rect.width / state.workspaceCanvas.width;
            state.zoomOffset.x += (e.clientX - state.lastMousePos.x) / s;
            state.zoomOffset.y += (e.clientY - state.lastMousePos.y) / s;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            updateTransform();
        } else if (state.isDrawing) {
            paintStroke(coords.x, coords.y, false);
        }
    }

    function onUp() {
        state.isPanning = false; state.isDrawing = false; state.lastImgPos = null;
        if (state.activeAction === 'pan') state.workspaceCanvas.style.cursor = 'grab';
    }

    function onWheel(e) {
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        state.zoomScale = Math.max(0.1, Math.min(10.0, state.zoomScale * f));
        updateTransform();
    }

    function updateTransform() {
        const c = state.workspaceCanvas; if (!c) return;
        const container = document.getElementById('eraser-workspace-container');
        const bs = Math.min((container.clientWidth - 32) / c.width, (container.clientHeight - 32) / c.height, 1.0);
        const ox = (container.clientWidth - c.width * bs * state.zoomScale) / 2 + state.zoomOffset.x;
        const oy = (container.clientHeight - c.height * bs * state.zoomScale) / 2 + state.zoomOffset.y;
        c.style.transform = `translate(${ox}px, ${oy}px) scale(${bs * state.zoomScale})`;
    }

    function paintStroke(x, y, isStart) {
        const ctx = state.maskCtx;
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
        ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        ctx.lineWidth = state.brushSize;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (isStart) { ctx.beginPath(); ctx.arc(x, y, state.brushSize / 2, 0, Math.PI * 2); ctx.fill(); }
        else if (state.lastImgPos) { ctx.beginPath(); ctx.moveTo(state.lastImgPos.x, state.lastImgPos.y); ctx.lineTo(x, y); ctx.stroke(); }
        ctx.restore();
        state.lastImgPos = { x, y };
        renderWorkspace();
    }

    function clearMask() {
        if (!state.maskCanvas) return;
        state.maskCtx.clearRect(0, 0, state.maskCanvas.width, state.maskCanvas.height);
        renderWorkspace();
    }

    async function runInpainting() {
        if (!state.originalImage) return;

        const apiKey = (localStorage.getItem('gemini_api_key') || '').trim();
        if (!apiKey) {
            toggleApiModal();
            showNotification("Chave Gemini API necessária. Configure-a no topo.");
            return;
        }

        const w = state.maskCanvas.width;
        const h = state.maskCanvas.height;
        const maskData = state.maskCtx.getImageData(0, 0, w, h).data;
        let hasMask = false;
        for (let i = 3; i < maskData.length; i += 4) {
            if (maskData[i] > 10) {
                hasMask = true;
                break;
            }
        }

        if (!hasMask) {
            showNotification("Pincele sobre os objetos que deseja apagar primeiro.");
            return;
        }

        showLoader("Apagando...", "Enviando imagem e máscara para a IA do Imagen...");
        await runAiInpainting();
    }

    function buildAiInpaintingPrompt() {
        const basePrompt = state.aiPrompt.trim();
        if (basePrompt) {
            return `In the image [1], remove the object marked by the mask [2] and fill it with: ${basePrompt}. Keep it seamless, matching the surrounding textures, colors, and lighting.`;
        }
        return 'In the image [1], remove the object marked by the mask [2] and reconstruct the background naturally to match the rest of the scene.';
    }

    async function runAiInpainting() {
        const w = state.workspaceCanvas.width;
        const h = state.workspaceCanvas.height;
        const prompt = buildAiInpaintingPrompt();

        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = w;
        originalCanvas.height = h;
        originalCanvas.getContext('2d', { willReadFrequently: true }).drawImage(state.originalImage, 0, 0, w, h);
        const originalBase64 = originalCanvas.toDataURL('image/png').split(',')[1];

        const maskBinaryCanvas = document.createElement('canvas');
        maskBinaryCanvas.width = w;
        maskBinaryCanvas.height = h;
        const mbCtx = maskBinaryCanvas.getContext('2d', { willReadFrequently: true });
        
        mbCtx.fillStyle = 'black';
        mbCtx.fillRect(0, 0, w, h);
        
        const maskImgData = state.maskCtx.getImageData(0, 0, w, h);
        const pixels = maskImgData.data;
        const binaryData = mbCtx.createImageData(w, h);
        const binaryPixels = binaryData.data;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3];
            if (alpha > 10) {
                binaryPixels[i] = 255;
                binaryPixels[i + 1] = 255;
                binaryPixels[i + 2] = 255;
                binaryPixels[i + 3] = 255;
            } else {
                binaryPixels[i] = 0;
                binaryPixels[i + 1] = 0;
                binaryPixels[i + 2] = 0;
                binaryPixels[i + 3] = 255;
            }
        }
        mbCtx.putImageData(binaryData, 0, 0);
        const maskBase64 = maskBinaryCanvas.toDataURL('image/png').split(',')[1];

        const imageUrl = await callGeminiInpainting(prompt, originalBase64, maskBase64, 3);
        if (!imageUrl) {
            hideLoader();
            return;
        }

        const generated = new Image();
        generated.crossOrigin = 'anonymous';
        generated.onload = () => {
            state.originalImage = generated;
            clearMask();
            hideLoader();
            renderWorkspace();
            state.originalDataURL = generated.src;
            showNotification('Elemento removido com IA!');
        };
        generated.onerror = () => {
            hideLoader();
            showNotification('Falha ao carregar imagem gerada pela IA. Tente novamente.');
        };
        generated.src = imageUrl;
    }

    function downloadResult() {
        if (!state.originalImage) return;
        const w = state.workspaceCanvas.width;
        const h = state.workspaceCanvas.height;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(state.originalImage, 0, 0);
        downloadCanvasAsPNG(c, `magicerase_${Date.now()}.png`);
    }

    function showLoader(t, d) {
        document.getElementById('eraser-loader-title').innerText = t;
        document.getElementById('eraser-loader-desc').innerText = d;
        document.getElementById('eraser-loader').classList.remove('hidden');
    }
    function hideLoader() { document.getElementById('eraser-loader').classList.add('hidden'); }
})();

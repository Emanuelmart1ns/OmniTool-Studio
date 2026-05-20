(function() {
    let state = {
        originalImage: null,
        currentFile: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        maskCanvas: null,
        maskCtx: null,
        aiMaskCache: null,
        activeAction: 'pan',
        brushMode: 'erase',
        brushSize: 40,
        brushHardness: 0.8,
        magicWandTolerance: 30,
        bgColorType: 'transparent',
        bgColorValue: '#ffffff',
        zoomScale: 1.0,
        zoomOffset: { x: 0, y: 0 },
        isDrawing: false,
        isPanning: false,
        lastMousePos: { x: 0, y: 0 },
        lastImgPos: null,
        splitOffset: 0.5,
        showSplit: false
    };

    window.initBgRemover = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Removedor de Fundo IA</h3>
                            <p class="text-[10px] text-slate-400">Recorte local inteligente e retoque manual</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-show-split" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5" disabled>
                            <i class="fa-solid fa-columns"></i> Comparar
                        </button>
                        <button id="btn-reset-mask" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-red-400 hover:bg-slate-800 transition flex items-center gap-1.5" disabled>
                            <i class="fa-solid fa-rotate-left"></i> Reiniciar
                        </button>
                        <button id="btn-download-result" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-download"></i> Baixar PNG
                        </button>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <div class="lg:col-span-3 canvas-workspace" id="workspace-container">
                        <div id="upload-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-cloud-arrow-up text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Arraste ou selecione uma imagem</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Formatos aceitos: JPEG, PNG, WebP. Processamento local.</p>
                        </div>
                        <canvas id="canvas-bg-remover" class="hidden cursor-crosshair rounded-xl z-0"></canvas>
                        <div id="internal-loader" class="loader-overlay hidden">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="loader-title">Processando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="loader-desc"></p>
                            <div class="progress-bar-track"><div class="progress-bar-fill" id="loader-progress" style="width:0%"></div></div>
                        </div>
                    </div>

                    <div class="control-sidebar">
                        <div class="space-y-3">
                            <span class="tool-section-title">1. Motores de IA</span>
                            <div class="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-900">
                                <label class="engine-btn active cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all" id="lbl-engine-people">
                                    <input type="radio" name="ai-engine" value="mediapipe" checked class="hidden">
                                    <i class="fa-solid fa-user"></i> Pessoas
                                </label>
                                <label class="engine-btn cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200" id="lbl-engine-objects">
                                    <input type="radio" name="ai-engine" value="imgly" class="hidden">
                                    <i class="fa-solid fa-box"></i> Objetos
                                </label>
                            </div>
                            <button id="btn-run-ai" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-2" disabled>
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Remover Fundo IA
                            </button>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-3">
                            <span class="tool-section-title">2. Retoques</span>
                            <div class="grid grid-cols-3 gap-2">
                                <button id="btn-tool-pan" class="tool-btn active p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 font-medium transition flex flex-col items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-hand text-sm"></i> Mover
                                </button>
                                <button id="btn-tool-wand" class="tool-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 text-xs text-slate-400 font-medium transition flex flex-col items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-wand-magic text-sm"></i> Varinha
                                </button>
                                <button id="btn-tool-brush" class="tool-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 text-xs text-slate-400 font-medium transition flex flex-col items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-paintbrush text-sm"></i> Pincel
                                </button>
                            </div>

                            <div id="tool-settings-wand" class="hidden bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-2">
                                <div class="flex items-center justify-between text-[11px] text-slate-300">
                                    <span>Tolerância:</span>
                                    <span id="wand-tolerance-val" class="font-bold text-accent-400">30</span>
                                </div>
                                <input type="range" id="wand-tolerance" min="1" max="100" value="30" class="w-full">
                                <p class="text-[9px] text-slate-500">Clique no fundo para apagar por cor.</p>
                            </div>

                            <div id="tool-settings-brush" class="hidden bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-3">
                                <div class="grid grid-cols-2 gap-2 bg-slate-900/50 p-1 rounded-lg">
                                    <button id="btn-brush-erase" class="py-1 rounded-md text-[10px] font-bold text-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Apagar</button>
                                    <button id="btn-brush-restore" class="py-1 rounded-md text-[10px] font-bold text-center text-slate-400">Restaurar</button>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-[10px] text-slate-300">
                                        <span>Tamanho:</span>
                                        <span id="brush-size-val" class="font-bold text-accent-400">40px</span>
                                    </div>
                                    <input type="range" id="brush-size" min="5" max="150" value="40" class="w-full">
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-[10px] text-slate-300">
                                        <span>Dureza:</span>
                                        <span id="brush-hardness-val" class="font-bold text-accent-400">80%</span>
                                    </div>
                                    <input type="range" id="brush-hardness" min="0" max="100" value="80" class="w-full">
                                </div>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-3">
                            <span class="tool-section-title">3. Fundo</span>
                            <div class="grid grid-cols-2 gap-2">
                                <button id="btn-bg-transparent" class="tool-btn active py-2 px-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center justify-center gap-1.5" disabled>
                                    <i class="fa-solid fa-border-none text-[10px]"></i> Transparente
                                </button>
                                <button id="btn-bg-color" class="tool-btn py-2 px-2 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 transition flex items-center justify-center gap-1.5" disabled>
                                    <input type="color" id="bg-color-picker" value="#ffffff" class="w-3.5 h-3.5 border-0 rounded cursor-pointer p-0 bg-transparent"> Cor
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setupEventListeners();
    };

    function setupEventListeners() {
        const uploader = document.getElementById('file-uploader');
        const placeholder = document.getElementById('upload-placeholder');
        const workspace = document.getElementById('workspace-container');

        setupDragDrop(placeholder, uploader, (file) => {
            handleFile(file);
        });
        workspace.addEventListener('dragover', (e) => { e.preventDefault(); workspace.classList.add('border-accent-500/50'); });
        workspace.addEventListener('dragleave', () => { workspace.classList.remove('border-accent-500/50'); });
        workspace.addEventListener('drop', (e) => {
            e.preventDefault(); workspace.classList.remove('border-accent-500/50');
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });

        const lblPeople = document.getElementById('lbl-engine-people');
        const lblObjects = document.getElementById('lbl-engine-objects');
        document.querySelectorAll('input[name="ai-engine"]').forEach(r => {
            r.addEventListener('change', (e) => {
                const isPeople = e.target.value === 'mediapipe';
                lblPeople.className = `engine-btn ${isPeople ? 'active' : ''} cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all ${isPeople ? '' : 'text-slate-400 hover:text-slate-200'}`;
                lblObjects.className = `engine-btn ${!isPeople ? 'active' : ''} cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all ${!isPeople ? '' : 'text-slate-400 hover:text-slate-200'}`;
            });
        });

        document.getElementById('btn-run-ai').addEventListener('click', runAi);
        document.getElementById('btn-reset-mask').addEventListener('click', resetMask);
        document.getElementById('btn-download-result').addEventListener('click', downloadPNG);
        document.getElementById('btn-show-split').addEventListener('click', toggleSplit);

        document.getElementById('btn-tool-pan').addEventListener('click', () => setToolMode('pan'));
        document.getElementById('btn-tool-wand').addEventListener('click', () => setToolMode('wand'));
        document.getElementById('btn-tool-brush').addEventListener('click', () => setToolMode('brush'));

        document.getElementById('wand-tolerance').addEventListener('input', (e) => {
            state.magicWandTolerance = parseInt(e.target.value);
            document.getElementById('wand-tolerance-val').innerText = state.magicWandTolerance;
        });
        document.getElementById('brush-size').addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            document.getElementById('brush-size-val').innerText = `${state.brushSize}px`;
        });
        document.getElementById('brush-hardness').addEventListener('input', (e) => {
            state.brushHardness = parseFloat(e.target.value) / 100;
            document.getElementById('brush-hardness-val').innerText = `${e.target.value}%`;
        });
        document.getElementById('btn-brush-erase').addEventListener('click', () => setBrushMode('erase'));
        document.getElementById('btn-brush-restore').addEventListener('click', () => setBrushMode('restore'));

        const btnTrans = document.getElementById('btn-bg-transparent');
        const btnColor = document.getElementById('btn-bg-color');
        btnTrans.addEventListener('click', () => { state.bgColorType = 'transparent'; updateBgBtns(); renderWorkspace(); });
        btnColor.addEventListener('click', () => { state.bgColorType = 'color'; updateBgBtns(); renderWorkspace(); });
        document.getElementById('bg-color-picker').addEventListener('input', (e) => {
            state.bgColorValue = e.target.value;
            if (state.bgColorType === 'color') renderWorkspace();
        });

        const canvas = document.getElementById('canvas-bg-remover');
        canvas.addEventListener('mousedown', onCanvasDown);
        canvas.addEventListener('mousemove', onCanvasMove);
        window.addEventListener('mouseup', onCanvasUp);
        canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    }

    function updateBgBtns() {
        const btnTrans = document.getElementById('btn-bg-transparent');
        const btnColor = document.getElementById('btn-bg-color');
        if (state.bgColorType === 'transparent') {
            btnTrans.className = "tool-btn active py-2 px-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center justify-center gap-1.5";
            btnColor.className = "tool-btn py-2 px-2 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 transition flex items-center justify-center gap-1.5";
        } else {
            btnColor.className = "tool-btn active py-2 px-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center justify-center gap-1.5";
            btnTrans.className = "tool-btn py-2 px-2 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 transition flex items-center justify-center gap-1.5";
        }
    }

    function handleFile(file) {
        state.currentFile = file;
        showLoader('Carregando...', 'Renderizando imagem.');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.workspaceCanvas = document.getElementById('canvas-bg-remover');
                state.workspaceCtx = state.workspaceCanvas.getContext('2d');

                state.maskCanvas = document.createElement('canvas');
                state.maskCanvas.width = img.naturalWidth;
                state.maskCanvas.height = img.naturalHeight;
                state.maskCtx = state.maskCanvas.getContext('2d');
                state.maskCtx.fillStyle = '#ffffff';
                state.maskCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

                state.workspaceCanvas.width = img.naturalWidth;
                state.workspaceCanvas.height = img.naturalHeight;
                state.workspaceCanvas.classList.remove('hidden');

                document.getElementById('upload-placeholder').classList.add('hidden');
                fitCanvasInContainer(state.workspaceCanvas, document.getElementById('workspace-container'));
                state.zoomScale = 1.0;
                state.zoomOffset = { x: 0, y: 0 };

                enableButtons();
                hideLoader();
                renderWorkspace();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function enableButtons() {
        ['btn-run-ai', 'btn-reset-mask', 'btn-download-result', 'btn-show-split', 'btn-tool-pan', 'btn-tool-wand', 'btn-tool-brush', 'btn-bg-transparent', 'btn-bg-color'].forEach(id => {
            document.getElementById(id).removeAttribute('disabled');
        });
    }

    function setToolMode(mode) {
        state.activeAction = mode;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if (btn.id && btn.id.startsWith('btn-tool-')) {
                btn.className = "tool-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 text-xs text-slate-400 font-medium transition flex flex-col items-center gap-1.5";
            }
        });
        document.getElementById(`btn-tool-${mode}`).className = "tool-btn active p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 font-medium transition flex flex-col items-center gap-1.5";
        document.getElementById('tool-settings-wand').classList.add('hidden');
        document.getElementById('tool-settings-brush').classList.add('hidden');
        if (mode === 'wand') { document.getElementById('tool-settings-wand').classList.remove('hidden'); state.workspaceCanvas.style.cursor = 'crosshair'; }
        else if (mode === 'brush') { document.getElementById('tool-settings-brush').classList.remove('hidden'); state.workspaceCanvas.style.cursor = 'crosshair'; }
        else { state.workspaceCanvas.style.cursor = 'grab'; }
    }

    function setBrushMode(mode) {
        state.brushMode = mode;
        const btnE = document.getElementById('btn-brush-erase');
        const btnR = document.getElementById('btn-brush-restore');
        if (mode === 'erase') {
            btnE.className = "py-1 rounded-md text-[10px] font-bold text-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
            btnR.className = "py-1 rounded-md text-[10px] font-bold text-center text-slate-400";
        } else {
            btnR.className = "py-1 rounded-md text-[10px] font-bold text-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
            btnE.className = "py-1 rounded-md text-[10px] font-bold text-center text-slate-400";
        }
    }

    function renderWorkspace() {
        if (!state.originalImage || !state.workspaceCanvas) return;
        const canvas = state.workspaceCanvas;
        const ctx = state.workspaceCtx;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const temp = document.createElement('canvas');
        temp.width = w; temp.height = h;
        const tCtx = temp.getContext('2d');
        tCtx.drawImage(state.originalImage, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(state.maskCanvas, 0, 0);
        tCtx.globalCompositeOperation = 'source-over';

        if (state.bgColorType === 'transparent') { drawCheckerboard(ctx, w, h); }
        else { ctx.fillStyle = state.bgColorValue; ctx.fillRect(0, 0, w, h); }

        if (state.showSplit) {
            const splitX = Math.round(w * state.splitOffset);
            ctx.drawImage(state.originalImage, 0, 0, splitX, h, 0, 0, splitX, h);
            ctx.drawImage(temp, splitX, 0, w - splitX, h, splitX, 0, w - splitX, h);
            ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h); ctx.stroke();
            ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.arc(splitX, h / 2, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(splitX, h / 2, 4, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.drawImage(temp, 0, 0);
        }
    }

    function toggleSplit() {
        state.showSplit = !state.showSplit;
        const btn = document.getElementById('btn-show-split');
        btn.className = state.showSplit
            ? "px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center gap-1.5"
            : "px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5";
        renderWorkspace();
    }

    // AI
    function runAi() {
        if (!state.originalImage) return;
        const engine = document.querySelector('input[name="ai-engine"]:checked').value;
        if (engine === 'mediapipe') runMediaPipe();
        else runImgly();
    }

    async function runMediaPipe() {
        showLoader('MediaPipe AI', 'Isolando silhueta...', 30);
        try {
            if (typeof window.ensureMediaPipe === 'function') await window.ensureMediaPipe();
            const seg = new SelfieSegmentation({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}` });
            seg.setOptions({ modelSelection: 1 });
            seg.onResults((results) => {
                try {
                    const w = state.originalImage.naturalWidth;
                    const h = state.originalImage.naturalHeight;
                    state.maskCtx.clearRect(0, 0, w, h);
                    state.maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
                    const imgData = state.maskCtx.getImageData(0, 0, w, h);
                    const d = imgData.data;
                    for (let i = 0; i < d.length; i += 4) {
                        const v = d[i] > 128 ? 255 : 0;
                        d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = v;
                    }
                    state.maskCtx.putImageData(imgData, 0, 0);
                    cacheAiMask();
                    hideLoader(); renderWorkspace();
                    showNotification("Fundo de pessoa removido!");
                } catch (e) { hideLoader(); showNotification("Erro ao processar máscara."); }
            });
            setTimeout(() => {
                seg.send({ image: state.originalImage }).catch(() => {
                    hideLoader(); showNotification("MediaPipe falhou. Use o motor Objetos.");
                });
            }, 300);
        } catch (e) { hideLoader(); showNotification("Não foi possível iniciar o MediaPipe."); }
    }

    async function runImgly() {
        showLoader('IMG.LY AI', 'Iniciando IMG.LY...', 10);
        try {
            await window.loadImglyEngine();
        } catch (e) {
            hideLoader(); showNotification("IMG.LY indisponível. Tente novamente mais tarde.");
            return;
        }

        try {
            const blob = await window.imglyRemoveBackground(state.currentFile, {
                model: 'isnet_quint8', device: 'cpu', proxyToWorker: false,
                progress: (key, current, total) => {
                    updateLoaderProgress(Math.round((current / total) * 90), `Download modelo: ${Math.round((current/total)*100)}%`);
                }
            });
            updateLoaderProgress(95, "Finalizando...");
            const url = URL.createObjectURL(blob);
            const resImg = new Image();
            resImg.onload = () => {
                const w = state.originalImage.naturalWidth;
                const h = state.originalImage.naturalHeight;
                const tmp = document.createElement('canvas');
                tmp.width = w; tmp.height = h;
                tmp.getContext('2d').drawImage(resImg, 0, 0, w, h);
                const imgData = tmp.getContext('2d').getImageData(0, 0, w, h);
                const d = imgData.data;
                state.maskCtx.clearRect(0, 0, w, h);
                for (let i = 0; i < d.length; i += 4) {
                    const v = d[i+3] > 10 ? 255 : 0;
                    d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = v;
                }
                state.maskCtx.putImageData(imgData, 0, 0);
                cacheAiMask(); hideLoader(); renderWorkspace();
                showNotification("Fundo de objeto removido!");
            };
            resImg.src = url;
        } catch (e) { hideLoader(); showNotification("Falha no motor de Objetos."); }
    }

    function cacheAiMask() {
        state.aiMaskCache = document.createElement('canvas');
        state.aiMaskCache.width = state.maskCanvas.width;
        state.aiMaskCache.height = state.maskCanvas.height;
        state.aiMaskCache.getContext('2d').drawImage(state.maskCanvas, 0, 0);
    }

    function resetMask() {
        if (!state.originalImage) return;
        state.maskCtx.fillStyle = '#ffffff';
        state.maskCtx.fillRect(0, 0, state.originalImage.naturalWidth, state.originalImage.naturalHeight);
        renderWorkspace(); showNotification("Máscara restaurada.");
    }

    // Canvas mouse
    function onCanvasDown(e) {
        if (!state.originalImage) return;
        const coords = canvasToImageCoords(state.workspaceCanvas, e.clientX, e.clientY);
        if (state.activeAction === 'pan') {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.style.cursor = 'grabbing';
        } else if (state.activeAction === 'wand') {
            applyMagicWand(coords.x, coords.y);
        } else if (state.activeAction === 'brush') {
            state.isDrawing = true;
            paintBrush(coords.x, coords.y, true);
        }
    }

    function onCanvasMove(e) {
        if (!state.originalImage) return;
        const coords = canvasToImageCoords(state.workspaceCanvas, e.clientX, e.clientY);
        if (state.isPanning) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            const rect = state.workspaceCanvas.getBoundingClientRect();
            const scale = rect.width / state.workspaceCanvas.width;
            state.zoomOffset.x += dx / scale;
            state.zoomOffset.y += dy / scale;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            updateTransform();
        } else if (state.isDrawing && state.activeAction === 'brush') {
            paintBrush(coords.x, coords.y, false);
        }
    }

    function onCanvasUp() {
        state.isPanning = false; state.isDrawing = false; state.lastImgPos = null;
        if (state.activeAction === 'pan' && state.workspaceCanvas) state.workspaceCanvas.style.cursor = 'grab';
    }

    function onCanvasWheel(e) {
        e.preventDefault();
        if (!state.originalImage) return;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        state.zoomScale = Math.max(0.1, Math.min(10.0, state.zoomScale * factor));
        updateTransform();
    }

    function updateTransform() {
        const c = state.workspaceCanvas;
        if (!c) return;
        const container = document.getElementById('workspace-container');
        const baseScale = Math.min((container.clientWidth - 32) / c.width, (container.clientHeight - 32) / c.height, 1.0);
        const ox = (container.clientWidth - c.width * baseScale * state.zoomScale) / 2 + state.zoomOffset.x;
        const oy = (container.clientHeight - c.height * baseScale * state.zoomScale) / 2 + state.zoomOffset.y;
        c.style.transform = `translate(${ox}px, ${oy}px) scale(${baseScale * state.zoomScale})`;
    }

    function paintBrush(x, y, isStart) {
        const ctx = state.maskCtx;
        ctx.save();
        ctx.lineWidth = state.brushSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (state.brushMode === 'erase') {
            ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,1)'; ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.globalCompositeOperation = 'source-over';
        }
        if (isStart) { ctx.beginPath(); ctx.arc(x, y, state.brushSize / 2, 0, Math.PI * 2); ctx.fill(); }
        else if (state.lastImgPos) { ctx.beginPath(); ctx.moveTo(state.lastImgPos.x, state.lastImgPos.y); ctx.lineTo(x, y); ctx.stroke(); }
        ctx.restore();
        state.lastImgPos = { x, y };
        renderWorkspace();
    }

    function applyMagicWand(rawX, rawY) {
        const w = state.originalImage.naturalWidth;
        const h = state.originalImage.naturalHeight;
        const cx = Math.round(rawX); const cy = Math.round(rawY);
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) return;

        showLoader('Varinha Mágica', 'Calculando tolerância...', 20);
        setTimeout(() => {
            const tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            tmp.getContext('2d').drawImage(state.originalImage, 0, 0);
            const pixels = tmp.getContext('2d').getImageData(0, 0, w, h).data;
            const idx = (cy * w + cx) * 4;
            const tR = pixels[idx], tG = pixels[idx+1], tB = pixels[idx+2];
            const visited = new Uint8Array(w * h);
            const queue = [cx, cy]; let head = 0;
            const maskData = state.maskCtx.getImageData(0, 0, w, h);
            const mPx = maskData.data;
            const tolSq = state.magicWandTolerance * state.magicWandTolerance;
            const dirs = [0,-1,0,1,-1,0,1,0];

            while (head < queue.length) {
                const px = queue[head++], py = queue[head++];
                const off = py * w + px;
                if (visited[off]) continue;
                visited[off] = 1;
                const mIdx = off * 4;
                mPx[mIdx] = 0; mPx[mIdx+1] = 0; mPx[mIdx+2] = 0; mPx[mIdx+3] = 0;
                for (let d = 0; d < 8; d += 2) {
                    const nx = px + dirs[d], ny = py + dirs[d+1];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const nOff = ny * w + nx;
                        if (!visited[nOff]) {
                            const nIdx = nOff * 4;
                            const dr = pixels[nIdx] - tR, dg = pixels[nIdx+1] - tG, db = pixels[nIdx+2] - tB;
                            if (dr*dr + dg*dg + db*db <= tolSq) queue.push(nx, ny);
                        }
                    }
                }
            }
            state.maskCtx.putImageData(maskData, 0, 0);
            hideLoader(); renderWorkspace();
        }, 100);
    }

    function downloadPNG() {
        if (!state.originalImage) return;
        const w = state.originalImage.naturalWidth;
        const h = state.originalImage.naturalHeight;
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const ctx = out.getContext('2d');
        if (state.bgColorType === 'color') { ctx.fillStyle = state.bgColorValue; ctx.fillRect(0, 0, w, h); }
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tCtx = tmp.getContext('2d');
        tCtx.drawImage(state.originalImage, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(state.maskCanvas, 0, 0);
        ctx.drawImage(tmp, 0, 0);
        downloadCanvasAsPNG(out, `fundozero_${Date.now()}.png`);
    }

    function showLoader(title, desc, pct = 0) {
        document.getElementById('loader-title').innerText = title;
        document.getElementById('loader-desc').innerText = desc;
        updateLoaderProgress(pct);
        document.getElementById('internal-loader').classList.remove('hidden');
    }

    function updateLoaderProgress(pct, desc) {
        document.getElementById('loader-progress').style.width = `${pct}%`;
        if (desc) document.getElementById('loader-desc').innerText = desc;
    }

    function hideLoader() { document.getElementById('internal-loader').classList.add('hidden'); }
})();

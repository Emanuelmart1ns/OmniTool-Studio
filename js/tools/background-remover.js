// OmniTool Studio: Background Remover Tool Module
(function() {
    let state = {
        originalImage: null,
        currentFile: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        maskCanvas: null,
        maskCtx: null,
        aiMaskCache: null,
        activeAction: 'pan', // pan, wand, brush
        brushMode: 'erase', // erase, restore
        brushSize: 40,
        brushHardness: 0.8,
        magicWandTolerance: 30,
        bgColorType: 'transparent', // transparent, color
        bgColorValue: '#ffffff',
        zoomScale: 1.0,
        zoomOffset: { x: 0, y: 0 },
        isDrawing: false,
        isPanning: false,
        lastMousePos: { x: 0, y: 0 },
        splitOffset: 0.5, // 0 to 1 for split slider
        showSplit: false,
        imglyReady: false
    };

    window.initBgRemover = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <!-- TOP BAR CONTROL -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
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
                            <i class="fa-solid fa-columns"></i> Comparação Split
                        </button>
                        <button id="btn-reset-mask" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-red-400 hover:bg-slate-800 transition flex items-center gap-1.5" disabled>
                            <i class="fa-solid fa-rotate-left"></i> Reiniciar
                        </button>
                        <button id="btn-download-result" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-download"></i> Baixar PNG
                        </button>
                    </div>
                </div>

                <!-- WORKSPACE GRID -->
                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <!-- CANVAS AREA (LEFT 3 COLS) -->
                    <div class="lg:col-span-3 bg-slate-950/50 border border-slate-900 rounded-3xl relative flex items-center justify-center p-4 min-h-[300px] overflow-hidden" id="workspace-container">
                        
                        <!-- UPLOAD PLACEHOLDER -->
                        <div id="upload-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                                <i class="fa-solid fa-cloud-arrow-up text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Arraste ou selecione uma imagem</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Formatos aceitos: JPEG, PNG, WebP. O processamento é local no seu dispositivo.</p>
                        </div>

                        <!-- WORK CANVAS -->
                        <canvas id="canvas-bg-remover" class="hidden max-w-full max-h-full cursor-crosshair rounded-xl z-0"></canvas>

                        <!-- LOADER DE PROCESSAMENTO INTERNO -->
                        <div id="internal-loader" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex-col items-center justify-center z-20 rounded-3xl">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="loader-title">Processando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="loader-desc">Aguarde o processamento local.</p>
                            <!-- PROGRESS BAR -->
                            <div class="w-48 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                                <div class="bg-accent-500 h-1.5 rounded-full w-0 transition-all duration-300" id="loader-progress"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CONTROL SIDEBAR (RIGHT 1 COL) -->
                    <div class="bg-slate-900/20 border border-slate-900 rounded-3xl p-4 flex flex-col gap-4">
                        
                        <!-- ENGINE TABS -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Motores de IA</span>
                            <div class="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-900">
                                <label class="cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all bg-accent-600 text-white" id="lbl-engine-people">
                                    <input type="radio" name="ai-engine" value="mediapipe" checked class="hidden">
                                    <i class="fa-solid fa-user"></i> Pessoas
                                </label>
                                <label class="cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200" id="lbl-engine-objects">
                                    <input type="radio" name="ai-engine" value="imgly" class="hidden">
                                    <i class="fa-solid fa-box"></i> Objetos
                                </label>
                            </div>
                            <button id="btn-run-ai" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-2" disabled>
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Remover Fundo IA
                            </button>
                        </div>

                        <hr class="border-slate-900">

                        <!-- INTERACTIVE TOOLS -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Retoques Adicionais</span>
                            
                            <div class="grid grid-cols-3 gap-2">
                                <button id="btn-tool-pan" class="tool-btn active p-2.5 rounded-xl border border-indigo-500 bg-indigo-950/20 text-xs text-indigo-300 font-medium transition flex flex-col items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-hand text-sm"></i> Panning
                                </button>
                                <button id="btn-tool-wand" class="tool-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 text-xs text-slate-400 font-medium transition flex flex-col items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-wand-magic text-sm"></i> Varinha
                                </button>
                                <button id="btn-tool-brush" class="tool-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 text-xs text-slate-400 font-medium transition flex flex-col items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-paintbrush text-sm"></i> Pincel
                                </button>
                            </div>

                            <!-- DYNAMIC PANEL (WAND OR BRUSH CONTROLS) -->
                            <div id="tool-settings-wand" class="hidden bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-2">
                                <div class="flex items-center justify-between text-[11px] text-slate-300">
                                    <span>Tolerância da Cor:</span>
                                    <span id="wand-tolerance-val" class="font-bold text-accent-400">30</span>
                                </div>
                                <input type="range" id="wand-tolerance" min="1" max="100" value="30" class="w-full accent-accent-500 bg-slate-900 h-1 rounded-lg cursor-pointer">
                                <p class="text-[9px] text-slate-500 leading-normal">Dica: Clique sobre o fundo ou cor da imagem para apagá-la.</p>
                            </div>

                            <div id="tool-settings-brush" class="hidden bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-3">
                                <div class="grid grid-cols-2 gap-2 bg-slate-900/50 p-1 rounded-lg">
                                    <button id="btn-brush-erase" class="py-1 rounded-md text-[10px] font-bold text-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Apagar</button>
                                    <button id="btn-brush-restore" class="py-1 rounded-md text-[10px] font-bold text-center text-slate-400">Restaurar</button>
                                </div>
                                
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-[10px] text-slate-300">
                                        <span>Tamanho do Pincel:</span>
                                        <span id="brush-size-val" class="font-bold text-accent-400">40px</span>
                                    </div>
                                    <input type="range" id="brush-size" min="5" max="150" value="40" class="w-full accent-accent-500 bg-slate-900 h-1 rounded-lg cursor-pointer">
                                </div>

                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-[10px] text-slate-300">
                                        <span>Dureza do Pincel:</span>
                                        <span id="brush-hardness-val" class="font-bold text-accent-400">80%</span>
                                    </div>
                                    <input type="range" id="brush-hardness" min="0" max="100" value="80" class="w-full accent-accent-500 bg-slate-900 h-1 rounded-lg cursor-pointer">
                                </div>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <!-- BACKGROUND COLOR -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. Visualização do Fundo</span>
                            <div class="grid grid-cols-2 gap-2">
                                <button id="btn-bg-transparent" class="active py-2 px-2 rounded-xl border border-indigo-500 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center justify-center gap-1.5" disabled>
                                    <i class="fa-solid fa-border-none text-[10px]"></i> Transparente
                                </button>
                                <button id="btn-bg-color" class="py-2 px-2 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 transition flex items-center justify-center gap-1.5" disabled>
                                    <input type="color" id="bg-color-picker" value="#ffffff" class="w-3.5 h-3.5 border-0 rounded cursor-pointer p-0 bg-transparent"> Cor de Fundo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load listeners
        setupEventListeners();
    };

    function setupEventListeners() {
        const uploader = document.getElementById('file-uploader');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const workspace = document.getElementById('workspace-container');

        // Drag & Drop
        uploadPlaceholder.addEventListener('click', () => uploader.click());
        uploader.addEventListener('change', handleFileSelect);

        workspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            workspace.classList.add('border-accent-500/50', 'bg-accent-500/5');
        });
        workspace.addEventListener('dragleave', () => {
            workspace.classList.remove('border-accent-500/50', 'bg-accent-500/5');
        });
        workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            workspace.classList.remove('border-accent-500/50', 'bg-accent-500/5');
            if (e.dataTransfer.files.length > 0) {
                uploader.files = e.dataTransfer.files;
                handleFileSelect({ target: uploader });
            }
        });

        // Engine Select Labels
        const lblPeople = document.getElementById('lbl-engine-people');
        const lblObjects = document.getElementById('lbl-engine-objects');
        document.querySelectorAll('input[name="ai-engine"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'mediapipe') {
                    lblPeople.className = "cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all bg-accent-600 text-white";
                    lblObjects.className = "cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200";
                } else {
                    lblObjects.className = "cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all bg-accent-600 text-white";
                    lblPeople.className = "cursor-pointer flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200";
                }
            });
        });

        // Action Buttons
        document.getElementById('btn-run-ai').addEventListener('click', runAiBackgroundRemoval);
        document.getElementById('btn-reset-mask').addEventListener('click', resetMask);
        document.getElementById('btn-download-result').addEventListener('click', downloadPNG);
        document.getElementById('btn-show-split').addEventListener('click', toggleSplitScreen);

        // Tool Modes Selection
        document.getElementById('btn-tool-pan').addEventListener('click', () => setToolMode('pan'));
        document.getElementById('btn-tool-wand').addEventListener('click', () => setToolMode('wand'));
        document.getElementById('btn-tool-brush').addEventListener('click', () => setToolMode('brush'));

        // Wand settings
        const wandToleranceInput = document.getElementById('wand-tolerance');
        wandToleranceInput.addEventListener('input', (e) => {
            state.magicWandTolerance = parseInt(e.target.value);
            document.getElementById('wand-tolerance-val').innerText = state.magicWandTolerance;
        });

        // Brush settings
        const brushSizeInput = document.getElementById('brush-size');
        brushSizeInput.addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            document.getElementById('brush-size-val').innerText = `${state.brushSize}px`;
        });
        const brushHardnessInput = document.getElementById('brush-hardness');
        brushHardnessInput.addEventListener('input', (e) => {
            state.brushHardness = parseFloat(e.target.value) / 100;
            document.getElementById('brush-hardness-val').innerText = `${e.target.value}%`;
        });
        document.getElementById('btn-brush-erase').addEventListener('click', () => setBrushMode('erase'));
        document.getElementById('btn-brush-restore').addEventListener('click', () => setBrushMode('restore'));

        // BG Visual Toggle
        const btnTrans = document.getElementById('btn-bg-transparent');
        const btnColor = document.getElementById('btn-bg-color');
        const colorPicker = document.getElementById('bg-color-picker');

        btnTrans.addEventListener('click', () => {
            state.bgColorType = 'transparent';
            btnTrans.className = "active py-2 px-2 rounded-xl border border-indigo-500 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center justify-center gap-1.5";
            btnColor.className = "py-2 px-2 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 transition flex items-center justify-center gap-1.5";
            renderWorkspace();
        });

        btnColor.addEventListener('click', () => {
            state.bgColorType = 'color';
            btnColor.className = "active py-2 px-2 rounded-xl border border-indigo-500 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center justify-center gap-1.5";
            btnTrans.className = "py-2 px-2 rounded-xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 transition flex items-center justify-center gap-1.5";
            renderWorkspace();
        });

        colorPicker.addEventListener('input', (e) => {
            state.bgColorValue = e.target.value;
            if (state.bgColorType === 'color') renderWorkspace();
        });

        // Canvas interactions
        const canvas = document.getElementById('canvas-bg-remover');
        canvas.addEventListener('mousedown', canvasMouseDown);
        canvas.addEventListener('mousemove', canvasMouseMove);
        window.addEventListener('mouseup', canvasMouseUp);
        canvas.addEventListener('wheel', canvasWheel);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        state.currentFile = file;

        showInternalLoader('Carregando...', 'Renderizando imagem selecionada no espaço de trabalho.');

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                state.originalImage = img;
                
                // Initialize Canvases
                state.workspaceCanvas = document.getElementById('canvas-bg-remover');
                state.workspaceCtx = state.workspaceCanvas.getContext('2d');

                // Mask Canvas (contains user alpha mask)
                state.maskCanvas = document.createElement('canvas');
                state.maskCanvas.width = img.naturalWidth;
                state.maskCanvas.height = img.naturalHeight;
                state.maskCtx = state.maskCanvas.getContext('2d');

                // Initialize all to opaque white
                state.maskCtx.fillStyle = '#ffffff';
                state.maskCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

                // Setup layout dims
                state.workspaceCanvas.width = img.naturalWidth;
                state.workspaceCanvas.height = img.naturalHeight;
                state.workspaceCanvas.classList.remove('hidden');

                document.getElementById('upload-placeholder').classList.add('hidden');
                
                // Reset zoom and offset
                resetZoomOffset();

                // Enable buttons
                document.getElementById('btn-run-ai').removeAttribute('disabled');
                document.getElementById('btn-reset-mask').removeAttribute('disabled');
                document.getElementById('btn-download-result').removeAttribute('disabled');
                document.getElementById('btn-show-split').removeAttribute('disabled');
                document.getElementById('btn-tool-pan').removeAttribute('disabled');
                document.getElementById('btn-tool-wand').removeAttribute('disabled');
                document.getElementById('btn-tool-brush').removeAttribute('disabled');
                document.getElementById('btn-bg-transparent').removeAttribute('disabled');
                document.getElementById('btn-bg-color').removeAttribute('disabled');

                hideInternalLoader();
                renderWorkspace();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetZoomOffset() {
        if (!state.originalImage) return;
        const container = document.getElementById('workspace-container');
        const contW = container.clientWidth - 32;
        const contH = container.clientHeight - 32;
        const imgW = state.originalImage.naturalWidth;
        const imgH = state.originalImage.naturalHeight;

        state.zoomScale = Math.min(contW / imgW, contH / imgH, 1.0);
        state.zoomOffset = { x: 0, y: 0 };
    }

    function setToolMode(mode) {
        state.activeAction = mode;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.className = "tool-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 text-xs text-slate-400 font-medium transition flex flex-col items-center gap-1.5";
        });
        document.getElementById(`btn-tool-${mode}`).className = "tool-btn active p-2.5 rounded-xl border border-indigo-500 bg-indigo-950/20 text-xs text-indigo-300 font-medium transition flex flex-col items-center gap-1.5";

        document.getElementById('tool-settings-wand').classList.add('hidden');
        document.getElementById('tool-settings-brush').classList.add('hidden');

        if (mode === 'wand') {
            document.getElementById('tool-settings-wand').classList.remove('hidden');
        } else if (mode === 'brush') {
            document.getElementById('tool-settings-brush').classList.remove('hidden');
        }
    }

    function setBrushMode(mode) {
        state.brushMode = mode;
        const btnErase = document.getElementById('btn-brush-erase');
        const btnRestore = document.getElementById('btn-brush-restore');

        if (mode === 'erase') {
            btnErase.className = "py-1 rounded-md text-[10px] font-bold text-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
            btnRestore.className = "py-1 rounded-md text-[10px] font-bold text-center text-slate-400";
        } else {
            btnRestore.className = "py-1 rounded-md text-[10px] font-bold text-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
            btnErase.className = "py-1 rounded-md text-[10px] font-bold text-center text-slate-400";
        }
    }

    function renderWorkspace() {
        if (!state.originalImage || !state.workspaceCanvas) return;

        const canvas = state.workspaceCanvas;
        const ctx = state.workspaceCtx;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Temp canvas to construct current state
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw original
        tempCtx.drawImage(state.originalImage, 0, 0);

        // Apply alpha mask
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(state.maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = 'source-over';

        // Draw Checkerboard or Background Color on output
        if (state.bgColorType === 'transparent') {
            // Draw transparent checkers
            drawCheckerboard(ctx, w, h);
        } else {
            ctx.fillStyle = state.bgColorValue;
            ctx.fillRect(0, 0, w, h);
        }

        // Draw current result
        if (state.showSplit) {
            // Split screen logic
            const splitX = w * state.splitOffset;

            // Draw original on left side
            ctx.drawImage(state.originalImage, 0, 0, splitX, h, 0, 0, splitX, h);

            // Draw masked result on right side
            ctx.drawImage(tempCanvas, splitX, 0, w - splitX, h, splitX, 0, w - splitX, h);

            // Split line
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 4 / state.zoomScale;
            ctx.beginPath();
            ctx.moveTo(splitX, 0);
            ctx.lineTo(splitX, h);
            ctx.stroke();

            // Handle handle circle
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath();
            ctx.arc(splitX, h / 2, 16 / state.zoomScale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(splitX, h / 2, 6 / state.zoomScale, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Full masked image
            ctx.drawImage(tempCanvas, 0, 0);
        }
    }

    function drawCheckerboard(ctx, w, h) {
        const size = 15;
        const cols = Math.ceil(w / size);
        const rows = Math.ceil(h / size);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#0f172a';
                ctx.fillRect(c * size, r * size, size, size);
            }
        }
    }

    function toggleSplitScreen() {
        state.showSplit = !state.showSplit;
        const btn = document.getElementById('btn-show-split');
        if (state.showSplit) {
            btn.className = "px-3 py-1.5 rounded-lg border border-indigo-500 bg-indigo-950/20 text-xs text-indigo-300 transition flex items-center gap-1.5";
        } else {
            btn.className = "px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5";
        }
        renderWorkspace();
    }

    // AI ENGINES RUNNERS
    function runAiBackgroundRemoval() {
        if (!state.originalImage) return;

        const engine = document.querySelector('input[name="ai-engine"]:checked').value;
        if (engine === 'mediapipe') {
            runMediaPipe();
        } else {
            runImgly();
        }
    }

    function runMediaPipe() {
        showInternalLoader('MediaPipe AI', 'Isolando silhueta humana no WebGL...', 30);
        try {
            const selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            });

            selfieSegmentation.setOptions({
                modelSelection: 1 // General / Landscape
            });

            selfieSegmentation.onResults((results) => {
                try {
                    const w = state.originalImage.naturalWidth;
                    const h = state.originalImage.naturalHeight;

                    state.maskCtx.clearRect(0, 0, w, h);
                    state.maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);

                    const imgData = state.maskCtx.getImageData(0, 0, w, h);
                    const data = imgData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const prob = data[i];
                        const val = prob > 128 ? 255 : 0;
                        data[i] = 255;
                        data[i+1] = 255;
                        data[i+2] = 255;
                        data[i+3] = val; // Apply alpha
                    }
                    state.maskCtx.putImageData(imgData, 0, 0);

                    cacheAiMask();
                    hideInternalLoader();
                    renderWorkspace();
                    if (typeof showNotification === 'function') showNotification("Fundo de pessoa removido com sucesso!");
                } catch (e) {
                    console.error(e);
                    hideInternalLoader();
                    if (typeof showNotification === 'function') showNotification("Erro ao processar máscara da IA.");
                }
            });

            setTimeout(() => {
                selfieSegmentation.send({ image: state.originalImage })
                    .catch(err => {
                        console.error(err);
                        hideInternalLoader();
                        if (typeof showNotification === 'function') showNotification("MediaPipe falhou. Experimente o motor de Objetos.");
                    });
            }, 300);

        } catch (e) {
            console.error(e);
            hideInternalLoader();
            if (typeof showNotification === 'function') showNotification("Não foi possível iniciar o MediaPipe.");
        }
    }

    async function runImgly() {
        if (!window.imglyRemoveBackground) {
            showInternalLoader('Iniciando Motor', 'Carregando arquivos da IA de objetos (IMG.LY)...', 10);
            
            let check = setInterval(() => {
                if (window.imglyRemoveBackground) {
                    clearInterval(check);
                    hideInternalLoader();
                    runImglyRemovalLogic();
                }
            }, 1000);

            setTimeout(() => {
                clearInterval(check);
                if (!window.imglyRemoveBackground) {
                    hideInternalLoader();
                    if (typeof showNotification === 'function') showNotification("A biblioteca IMG.LY demorou demais para responder.");
                }
            }, 20000);
            return;
        }

        runImglyRemovalLogic();
    }

    async function runImglyRemovalLogic() {
        showInternalLoader('IMG.LY AI', 'Isolando objetos gerais... (Isso pode levar de 5 a 15 segundos)', 10);
        try {
            const blob = await window.imglyRemoveBackground(state.currentFile, {
                model: 'isnet_quint8', // Faster model
                device: 'cpu', // Safer fallback inside sandbox
                proxyToWorker: false, // Avoid worker sandbox errors
                progress: (key, current, total) => {
                    const pct = Math.round((current / total) * 100);
                    updateLoaderProgress(pct, `Fazendo download do modelo: ${pct}%`);
                }
            });

            updateLoaderProgress(95, "Finalizando processamento...");
            const url = URL.createObjectURL(blob);
            const resImg = new Image();
            resImg.onload = function() {
                const w = state.originalImage.naturalWidth;
                const h = state.originalImage.naturalHeight;

                const temp = document.createElement('canvas');
                temp.width = w;
                temp.height = h;
                const tempCtx = temp.getContext('2d');
                tempCtx.drawImage(resImg, 0, 0, w, h);

                const imgData = tempCtx.getImageData(0, 0, w, h);
                const data = imgData.data;

                state.maskCtx.clearRect(0, 0, w, h);
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i+3];
                    const val = alpha > 10 ? 255 : 0;
                    data[i] = 255;
                    data[i+1] = 255;
                    data[i+2] = 255;
                    data[i+3] = val;
                }
                state.maskCtx.putImageData(imgData, 0, 0);

                cacheAiMask();
                hideInternalLoader();
                renderWorkspace();
                if (typeof showNotification === 'function') showNotification("Fundo de objeto removido com sucesso!");
            };
            resImg.src = url;

        } catch (err) {
            console.error(err);
            hideInternalLoader();
            if (typeof showNotification === 'function') showNotification("Falha no motor de Objetos.");
        }
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
        renderWorkspace();
        if (typeof showNotification === 'function') showNotification("Máscara restaurada para o original.");
    }

    // INTERACTIVE MOUSE HANDLERS
    function canvasMouseDown(e) {
        if (!state.originalImage) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (state.activeAction === 'pan') {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
        } else if (state.activeAction === 'wand') {
            applyMagicWand(mouseX, mouseY);
        } else if (state.activeAction === 'brush') {
            state.isDrawing = true;
            drawBrushStroke(mouseX, mouseY, true);
        }
    }

    function canvasMouseMove(e) {
        if (!state.originalImage) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (state.isPanning) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.zoomOffset.x += dx;
            state.zoomOffset.y += dy;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            updateCanvasTransforms();
        } else if (state.isDrawing && state.activeAction === 'brush') {
            drawBrushStroke(mouseX, mouseY, false);
        } else if (state.showSplit && state.activeAction === 'pan') {
            // Handle split slider drag
            const pct = mouseX / rect.width;
            state.splitOffset = Math.max(0, Math.min(1, pct));
            renderWorkspace();
        }
    }

    function canvasMouseUp() {
        state.isPanning = false;
        state.isDrawing = false;
    }

    function canvasWheel(e) {
        e.preventDefault();
        if (!state.originalImage) return;

        const zoomFactor = 1.1;
        if (e.deltaY < 0) {
            state.zoomScale *= zoomFactor;
        } else {
            state.zoomScale /= zoomFactor;
        }
        state.zoomScale = Math.max(0.1, Math.min(10.0, state.zoomScale));
        updateCanvasTransforms();
    }

    function updateCanvasTransforms() {
        const canvas = state.workspaceCanvas;
        if (!canvas) return;
        canvas.style.transform = `translate(${state.zoomOffset.x}px, ${state.zoomOffset.y}px) scale(${state.zoomScale})`;
    }

    // BRUSH PAINTING
    function drawBrushStroke(x, y, isStart) {
        const rect = state.workspaceCanvas.getBoundingClientRect();
        
        // Convert screen canvas coordinate to raw image coordinate
        const scaleX = state.originalImage.naturalWidth / rect.width;
        const scaleY = state.originalImage.naturalHeight / rect.height;
        const imgX = x * scaleX;
        const imgY = y * scaleY;

        const size = state.brushSize;
        const hardness = state.brushHardness;

        const ctx = state.maskCtx;
        ctx.save();
        
        // Create radial gradient for hardness / soft falloff
        const grad = ctx.createRadialGradient(imgX, imgY, size * hardness / 2, imgX, imgY, size / 2);
        if (state.brushMode === 'erase') {
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(imgX, imgY, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        renderWorkspace();
    }

    // FLOOD FILL WAND
    function applyMagicWand(clickX, clickY) {
        const rect = state.workspaceCanvas.getBoundingClientRect();
        const scaleX = state.originalImage.naturalWidth / rect.width;
        const scaleY = state.originalImage.naturalHeight / rect.height;
        const rawX = Math.round(clickX * scaleX);
        const rawY = Math.round(clickY * scaleY);

        const w = state.originalImage.naturalWidth;
        const h = state.originalImage.naturalHeight;

        if (rawX < 0 || rawX >= w || rawY < 0 || rawY >= h) return;

        showInternalLoader('Varinha Mágica', 'Calculando tolerância de cor local...', 20);

        setTimeout(() => {
            const temp = document.createElement('canvas');
            temp.width = w;
            temp.height = h;
            const tempCtx = temp.getContext('2d');
            tempCtx.drawImage(state.originalImage, 0, 0);
            const pixels = tempCtx.getImageData(0, 0, w, h).data;

            const idx = (rawY * w + rawX) * 4;
            const targetR = pixels[idx];
            const targetG = pixels[idx+1];
            const targetB = pixels[idx+2];

            const visited = new Uint8Array(w * h);
            const queue = [rawX, rawY];
            let head = 0;

            const maskData = state.maskCtx.getImageData(0, 0, w, h);
            const maskPixels = maskData.data;
            const tolSq = state.magicWandTolerance * state.magicWandTolerance;

            while (head < queue.length) {
                const cx = queue[head++];
                const cy = queue[head++];

                const offset = cy * w + cx;
                if (visited[offset]) continue;
                visited[offset] = 1;

                const mIdx = offset * 4;
                maskPixels[mIdx] = 0;
                maskPixels[mIdx+1] = 0;
                maskPixels[mIdx+2] = 0;
                maskPixels[mIdx+3] = 0; // Translucency

                const dirs = [0, -1, 0, 1, -1, 0, 1, 0];
                for (let d = 0; d < 8; d += 2) {
                    const nx = cx + dirs[d];
                    const ny = cy + dirs[d+1];

                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const nOffset = ny * w + nx;
                        if (!visited[nOffset]) {
                            const nIdx = nOffset * 4;
                            const dr = pixels[nIdx] - targetR;
                            const dg = pixels[nIdx+1] - targetG;
                            const db = pixels[nIdx+2] - targetB;
                            const distSq = dr*dr + dg*dg + db*db;

                            if (distSq <= tolSq) {
                                queue.push(nx, ny);
                            }
                        }
                    }
                }
            }

            state.maskCtx.putImageData(maskData, 0, 0);
            hideInternalLoader();
            renderWorkspace();
        }, 100);
    }

    // EXPORT AND CONVERT
    function downloadPNG() {
        if (!state.originalImage) return;

        const w = state.originalImage.naturalWidth;
        const h = state.originalImage.naturalHeight;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = w;
        outCanvas.height = h;
        const outCtx = outCanvas.getContext('2d');

        // Draw opaque background color if color is active
        if (state.bgColorType === 'color') {
            outCtx.fillStyle = state.bgColorValue;
            outCtx.fillRect(0, 0, w, h);
        }

        // Composite original with alpha mask
        const temp = document.createElement('canvas');
        temp.width = w;
        temp.height = h;
        const tempCtx = temp.getContext('2d');
        tempCtx.drawImage(state.originalImage, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(state.maskCanvas, 0, 0);

        outCtx.drawImage(temp, 0, 0);

        // Download
        const link = document.createElement('a');
        link.download = `fundozero_${Date.now()}.png`;
        link.href = outCanvas.toDataURL('image/png');
        link.click();
    }

    // INTERNAL PROGRESS LOADER
    function showInternalLoader(title, desc, progress = 0) {
        document.getElementById('loader-title').innerText = title;
        document.getElementById('loader-desc').innerText = desc;
        updateLoaderProgress(progress);
        document.getElementById('internal-loader').className = "absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

    function updateLoaderProgress(pct, newDesc = null) {
        document.getElementById('loader-progress').style.width = `${pct}%`;
        if (newDesc) {
            document.getElementById('loader-desc').innerText = newDesc;
        }
    }

    function hideInternalLoader() {
        document.getElementById('internal-loader').className = "hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

})();

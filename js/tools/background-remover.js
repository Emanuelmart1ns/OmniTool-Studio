// Background Remover (FundoZero AI Modulado)

// Tool states
let bgRemoverState = {
    originalImage: null,
    currentFileOrBlob: null,
    workspaceCanvas: null,
    workspaceCtx: null,
    maskCanvas: null,
    maskCtx: null,
    aiMaskCache: null,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    brushSize: 30,
    brushMode: 'erase', // erase, restore
    brushHardness: 0.8,
    isDrawing: false,
    currentTool: 'pan', // pan, brush, wand
    viewMode: 'split', // split, result, original
    bgType: 'transparent',
    bgSolidColor: '#ffffff',
    bgGradientColors: ['#7c3aed', '#c084fc'],
    aiGeneratedBgImage: null,
    magicWandTolerance: 40,
    splitValue: 50
};

// INITIALIZATION
function initBgRemover() {
    const viewport = document.getElementById('tool-viewport');
    
    // Inject Tool HTML
    viewport.innerHTML = `
        <div class="fade-in flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-[500px]">
            
            <!-- CONTROLES LATERAIS -->
            <div class="w-full md:w-64 border-r border-slate-900 bg-slate-950/20 p-4 flex flex-col justify-between shrink-0 overflow-y-auto no-scrollbar gap-5">
                <div class="space-y-4">
                    <div>
                        <h3 class="text-xs font-bold text-white mb-2">Motor de Segmentação</h3>
                        <div class="p-3.5 rounded-xl border border-slate-900 bg-slate-900/10 flex items-start gap-2.5">
                            <i class="fa-solid fa-user-tie text-accent-400 mt-0.5"></i>
                            <div>
                                <span class="text-[11px] font-bold text-white block">MediaPipe Selfie</span>
                                <p class="text-[10px] text-slate-400 leading-tight">Otimizado para pessoas, selfies e retratos locais.</p>
                            </div>
                        </div>
                    </div>

                    <button id="btn-process-ai" onclick="runMediaPipeRemoval()" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-accent-600 to-indigo-600 hover:from-accent-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-accent-500/10 transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        <span>Remover Fundo com IA</span>
                    </button>

                    <div class="border-t border-slate-900/80"></div>

                    <!-- ESTILIZAR FUNDO -->
                    <div class="space-y-2">
                        <span class="text-xs font-bold text-white">Opções de Fundo</span>
                        <div class="grid grid-cols-2 gap-1.5">
                            <button onclick="changeBgType('transparent')" id="bg-btn-transparent" class="p-2 border border-accent-500 bg-accent-500/10 text-[10px] text-accent-400 font-bold rounded-lg transition flex flex-col items-center gap-1">
                                <i class="fa-solid fa-border-none text-sm"></i>
                                <span>Transparente</span>
                            </button>
                            <button onclick="changeBgType('solid')" id="bg-btn-solid" class="p-2 border border-slate-900 hover:border-slate-800 text-[10px] text-slate-400 font-bold rounded-lg transition flex flex-col items-center gap-1">
                                <i class="fa-solid fa-fill-drip text-sm"></i>
                                <span>Cor Sólida</span>
                            </button>
                        </div>
                        
                        <div id="panel-bg-solid" class="hidden flex items-center gap-2 pt-2">
                            <input type="color" id="bg-solid-picker" value="#ffffff" onchange="setSolidBgColor(this.value)" class="h-7 w-12 rounded border border-slate-800 bg-transparent cursor-pointer">
                            <span class="text-[10px] text-slate-400">Clique para selecionar</span>
                        </div>
                    </div>
                </div>

                <!-- EXPORTAR -->
                <div class="border-t border-slate-900/80 pt-3">
                    <button id="btn-download" onclick="downloadResult()" disabled class="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fa-solid fa-cloud-arrow-down"></i>
                        <span>Baixar em PNG</span>
                    </button>
                </div>
            </div>

            <!-- ÁREA DO WORKSPACE -->
            <div class="flex-1 flex flex-col items-center justify-center bg-slate-950/40 relative p-4 select-none overflow-hidden rounded-3xl min-h-[400px]">
                
                <!-- ZONE DE UPLOAD -->
                <div id="upload-zone" class="max-w-md w-full p-6 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/20 text-center flex flex-col items-center justify-center cursor-pointer hover:border-accent-500 hover:bg-slate-950/40 transition group py-10"
                     onclick="document.getElementById('file-input').click()">
                    <input type="file" id="file-input" accept="image/*" class="hidden" onchange="handleFileSelect(event)">
                    <div class="h-12 w-12 rounded-xl bg-accent-500/10 text-accent-400 flex items-center justify-center mb-4 group-hover:scale-110 transition duration-300">
                        <i class="fa-solid fa-cloud-arrow-up text-2xl"></i>
                    </div>
                    <h3 class="text-sm font-bold text-white mb-1">Selecione uma imagem</h3>
                    <p class="text-[10px] text-slate-500 max-w-xs leading-normal">Arraste e solte ou navegue nos seus arquivos.</p>
                </div>

                <!-- WORKSPACE DE EDIÇÃO -->
                <div id="workspace" class="hidden w-full h-full relative flex flex-col items-center justify-center">
                    
                    <!-- Barra flutuante esquerda -->
                    <div class="absolute top-2 left-2 z-10 flex items-center gap-1 p-1 rounded-lg bg-slate-950/90 border border-slate-900 backdrop-blur-md">
                        <button onclick="setActiveTool('pan')" id="tool-btn-pan" class="h-7 w-7 rounded flex items-center justify-center text-accent-400 bg-accent-500/10 transition" title="Mover Foto">
                            <i class="fa-solid fa-hand text-xs"></i>
                        </button>
                        <button onclick="setActiveTool('brush')" id="tool-btn-brush" class="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition" title="Pincel Manual">
                            <i class="fa-solid fa-paintbrush text-xs"></i>
                        </button>
                        <div class="h-3 w-px bg-slate-800 mx-1"></div>
                        <button onclick="changeZoom(-0.2)" class="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition">
                            <i class="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <span id="zoom-indicator" class="text-[9px] text-slate-400 font-bold px-1 min-w-[32px] text-center">100%</span>
                        <button onclick="changeZoom(0.2)" class="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition">
                            <i class="fa-solid fa-plus text-[10px]"></i>
                        </button>
                    </div>

                    <!-- Comparador alternável -->
                    <div class="absolute top-2 right-2 z-10 flex items-center gap-1 p-1 rounded-lg bg-slate-950/90 border border-slate-900 backdrop-blur-md">
                        <button onclick="setViewMode('split')" id="view-btn-split" class="px-2 py-0.5 rounded text-[9px] font-bold text-accent-400 bg-accent-500/10 transition">Split</button>
                        <button onclick="setViewMode('result')" id="view-btn-result" class="px-2 py-0.5 rounded text-[9px] font-bold text-slate-400 hover:text-white transition">Fundo</button>
                        <button onclick="setViewMode('original')" id="view-btn-original" class="px-2 py-0.5 rounded text-[9px] font-bold text-slate-400 hover:text-white transition">Original</button>
                    </div>

                    <!-- Canvas e Viewport -->
                    <div id="canvas-container" class="w-full h-full flex items-center justify-center relative cursor-grab overflow-hidden"
                         onmousedown="handleCanvasMouseDown(event)"
                         onmousemove="handleCanvasMouseMove(event)"
                         onmouseup="handleCanvasMouseUp(event)"
                         onmouseleave="handleCanvasMouseUp(event)">
                        
                        <div id="preview-viewport" class="relative overflow-hidden transparency-bg select-none shadow-2xl rounded-xl border border-slate-900 flex items-center justify-center" style="width: 350px; height: 350px;">
                            <canvas id="workspace-canvas" class="max-w-full max-h-full pointer-events-none"></canvas>
                            <div id="brush-cursor" class="absolute pointer-events-none rounded-full border border-white bg-white/20 hidden" style="width: 30px; height: 30px; transform: translate(-50%, -50%);"></div>
                        </div>
                    </div>

                    <!-- Slider dividida horizontal -->
                    <div id="split-slider-container" class="absolute bottom-4 w-3/4 max-w-xs z-10 bg-slate-950/80 border border-slate-900 px-3 py-2 rounded-full flex items-center gap-2 shadow-lg">
                        <input type="range" id="split-control" min="0" max="100" value="50" oninput="onSplitChange(this.value)" class="flex-1">
                    </div>
                </div>

                <!-- LOADING INTERNO -->
                <div id="tool-loader" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-3xl">
                    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-500 mb-3"></div>
                    <h4 id="loader-tool-title" class="text-xs font-bold text-white mb-1">Processando</h4>
                    <p id="loader-tool-desc" class="text-[10px] text-slate-400 max-w-xs text-center leading-normal">Carregando...</p>
                </div>

            </div>
        </div>
    `;

    // Map DOM elements to state
    bgRemoverState.workspaceCanvas = document.getElementById('workspace-canvas');
    bgRemoverState.workspaceCtx = bgRemoverState.workspaceCanvas.getContext('2d');
}

// HANDLERS SELECT FILE
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) loadImage(file);
}

function loadImage(fileOrBlob) {
    bgRemoverState.currentFileOrBlob = fileOrBlob;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            bgRemoverState.originalImage = img;
            
            // Build memory canvases
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            bgRemoverState.maskCanvas = document.createElement('canvas');
            bgRemoverState.maskCanvas.width = w;
            bgRemoverState.maskCanvas.height = h;
            bgRemoverState.maskCtx = bgRemoverState.maskCanvas.getContext('2d');
            
            bgRemoverState.maskCtx.fillStyle = '#ffffff';
            bgRemoverState.maskCtx.fillRect(0, 0, w, h);

            bgRemoverState.workspaceCanvas.width = w;
            bgRemoverState.workspaceCanvas.height = h;

            document.getElementById('upload-zone').classList.add('hidden');
            document.getElementById('workspace').classList.remove('hidden');
            document.getElementById('btn-download').disabled = false;
            
            resetView();
            renderWorkspace();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
}

// MEDIAPIPE SEGMENTATION EXECUTION
function runMediaPipeRemoval() {
    if (!bgRemoverState.originalImage) {
        showNotification("Selecione uma imagem primeiro.");
        return;
    }

    showInternalLoader("MediaPipe AI", "Isolando sujeito...");

    const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    });

    selfieSegmentation.setOptions({ modelSelection: 1 });

    selfieSegmentation.onResults((results) => {
        try {
            const w = bgRemoverState.originalImage.naturalWidth;
            const h = bgRemoverState.originalImage.naturalHeight;

            bgRemoverState.maskCtx.clearRect(0, 0, w, h);
            bgRemoverState.maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
            
            const imgData = bgRemoverState.maskCtx.getImageData(0, 0, w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const prob = data[i];
                const val = prob > 128 ? 255 : 0; 
                data[i] = 255;
                data[i+1] = 255;
                data[i+2] = 255;
                data[i+3] = val; 
            }
            bgRemoverState.maskCtx.putImageData(imgData, 0, 0);

            hideInternalLoader();
            renderWorkspace();
            showNotification("Fundo removido com sucesso!");
        } catch(err) {
            console.error(err);
            hideInternalLoader();
            showNotification("Falha ao binarizar máscara da IA.");
        }
    });

    setTimeout(() => {
        selfieSegmentation.send({ image: bgRemoverState.originalImage })
            .catch(err => {
                hideInternalLoader();
                showNotification("Erro na IA local.");
            });
    }, 400);
}

// CANVAS DRAW & WORKSPACE COMPOSITES
function renderWorkspace() {
    if (!bgRemoverState.originalImage || !bgRemoverState.workspaceCanvas) return;

    const w = bgRemoverState.originalImage.naturalWidth;
    const h = bgRemoverState.originalImage.naturalHeight;
    const ctx = bgRemoverState.workspaceCtx;

    ctx.clearRect(0, 0, w, h);

    if (bgRemoverState.viewMode === 'original') {
        ctx.drawImage(bgRemoverState.originalImage, 0, 0);
        return;
    }

    // Masked foreground
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    fgCtx.drawImage(bgRemoverState.originalImage, 0, 0);
    fgCtx.globalCompositeOperation = 'destination-in';
    fgCtx.drawImage(bgRemoverState.maskCanvas, 0, 0);

    if (bgRemoverState.viewMode === 'result') {
        drawSelectedBg(ctx, w, h);
        ctx.drawImage(fgCanvas, 0, 0);
    } else if (bgRemoverState.viewMode === 'split') {
        ctx.drawImage(bgRemoverState.originalImage, 0, 0);

        const rightCanvas = document.createElement('canvas');
        rightCanvas.width = w;
        rightCanvas.height = h;
        const rCtx = rightCanvas.getContext('2d');
        drawSelectedBg(rCtx, w, h);
        rCtx.drawImage(fgCanvas, 0, 0);

        const splitPixel = (bgRemoverState.splitValue / 100) * w;
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitPixel, 0, w - splitPixel, h);
        ctx.clip();
        ctx.drawImage(rightCanvas, 0, 0);
        ctx.restore();

        // Divider
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 4 / bgRemoverState.zoom;
        ctx.beginPath();
        ctx.moveTo(splitPixel, 0);
        ctx.lineTo(splitPixel, h);
        ctx.stroke();
    }
}

function drawSelectedBg(ctx, w, h) {
    if (bgRemoverState.bgType === 'transparent') {
        ctx.clearRect(0, 0, w, h);
    } else if (bgRemoverState.bgType === 'solid') {
        ctx.fillStyle = bgRemoverState.bgSolidColor;
        ctx.fillRect(0, 0, w, h);
    }
}

// ZOOM / NAVEGATION UTILITIES
function changeZoom(delta) {
    bgRemoverState.zoom = Math.max(0.1, Math.min(5, bgRemoverState.zoom + delta));
    document.getElementById('zoom-indicator').innerText = `${Math.round(bgRemoverState.zoom * 100)}%`;
    updateViewportTransform();
}

function resetView() {
    if (!bgRemoverState.originalImage) return;
    const container = document.getElementById('canvas-container');
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = bgRemoverState.originalImage.naturalWidth;
    const ih = bgRemoverState.originalImage.naturalHeight;

    const zoomX = (cw - 40) / iw;
    const zoomY = (ch - 40) / ih;
    bgRemoverState.zoom = Math.min(zoomX, zoomY, 1.0);
    bgRemoverState.panX = 0;
    bgRemoverState.panY = 0;

    document.getElementById('zoom-indicator').innerText = `${Math.round(bgRemoverState.zoom * 100)}%`;
    updateViewportTransform();
}

function updateViewportTransform() {
    const viewport = document.getElementById('preview-viewport');
    if (bgRemoverState.originalImage) {
        viewport.style.width = `${bgRemoverState.originalImage.naturalWidth}px`;
        viewport.style.height = `${bgRemoverState.originalImage.naturalHeight}px`;
    }
    viewport.style.transform = `scale(${bgRemoverState.zoom}) translate(${bgRemoverState.panX}px, ${bgRemoverState.panY}px)`;
}

// MOUSE EVENTS
function handleCanvasMouseDown(e) {
    if (!bgRemoverState.originalImage) return;
    if (bgRemoverState.currentTool === 'pan') {
        bgRemoverState.isDragging = true;
        bgRemoverState.startX = e.clientX - bgRemoverState.panX * bgRemoverState.zoom;
        bgRemoverState.startY = e.clientY - bgRemoverState.panY * bgRemoverState.zoom;
        document.getElementById('canvas-container').style.cursor = 'grabbing';
    } else if (bgRemoverState.currentTool === 'brush') {
        bgRemoverState.isDrawing = true;
        paintBrushStroke(e);
    }
}

function handleCanvasMouseMove(e) {
    if (!bgRemoverState.originalImage) return;
    if (bgRemoverState.currentTool === 'brush') {
        const viewport = document.getElementById('preview-viewport');
        const rect = viewport.getBoundingClientRect();
        const cursor = document.getElementById('brush-cursor');
        const scaledSize = bgRemoverState.brushSize * bgRemoverState.zoom;
        
        cursor.style.width = `${scaledSize}px`;
        cursor.style.height = `${scaledSize}px`;
        cursor.style.left = `${e.clientX - rect.left}px`;
        cursor.style.top = `${e.clientY - rect.top}px`;
        cursor.classList.remove('hidden');

        if (bgRemoverState.isDrawing) paintBrushStroke(e);
    } else {
        document.getElementById('brush-cursor').classList.add('hidden');
    }

    if (bgRemoverState.isDragging) {
        bgRemoverState.panX = (e.clientX - bgRemoverState.startX) / bgRemoverState.zoom;
        bgRemoverState.panY = (e.clientY - bgRemoverState.startY) / bgRemoverState.zoom;
        updateViewportTransform();
    }
}

function handleCanvasMouseUp() {
    bgRemoverState.isDragging = false;
    bgRemoverState.isDrawing = false;
    if (bgRemoverState.currentTool === 'pan') {
        document.getElementById('canvas-container').style.cursor = 'grab';
    }
}

function paintBrushStroke(e) {
    const rect = bgRemoverState.workspaceCanvas.getBoundingClientRect();
    const scaleX = bgRemoverState.originalImage.naturalWidth / rect.width;
    const scaleY = bgRemoverState.originalImage.naturalHeight / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const ctx = bgRemoverState.maskCtx;
    ctx.save();
    
    const grad = ctx.createRadialGradient(px, py, bgRemoverState.brushSize * bgRemoverState.brushHardness / 2, px, py, bgRemoverState.brushSize / 2);
    
    if (bgRemoverState.brushMode === 'erase') {
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, bgRemoverState.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    renderWorkspace();
}

function setActiveTool(tool) {
    bgRemoverState.currentTool = tool;
    document.getElementById('tool-btn-pan').className = "h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition";
    document.getElementById('tool-btn-brush').className = "h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition";

    if (tool === 'pan') {
        document.getElementById('tool-btn-pan').className = "h-7 w-7 rounded flex items-center justify-center text-accent-400 bg-accent-500/10 transition";
        document.getElementById('canvas-container').style.cursor = 'grab';
    } else if (tool === 'brush') {
        document.getElementById('tool-btn-brush').className = "h-7 w-7 rounded flex items-center justify-center text-accent-400 bg-accent-500/10 transition";
        document.getElementById('canvas-container').style.cursor = 'crosshair';
    }
}

function changeBgType(type) {
    bgRemoverState.bgType = type;
    document.getElementById('bg-btn-transparent').className = "p-2 border border-slate-900 hover:border-slate-800 text-[10px] text-slate-400 font-bold rounded-lg transition flex flex-col items-center gap-1";
    document.getElementById('bg-btn-solid').className = "p-2 border border-slate-900 hover:border-slate-800 text-[10px] text-slate-400 font-bold rounded-lg transition flex flex-col items-center gap-1";

    document.getElementById(`bg-btn-${type}`).className = "p-2 border border-accent-500 bg-accent-500/10 text-[10px] text-accent-400 font-bold rounded-lg transition flex flex-col items-center gap-1";

    document.getElementById('panel-bg-solid').classList.add('hidden');
    if (type === 'solid') {
        document.getElementById('panel-bg-solid').classList.remove('hidden');
    }
    
    setViewMode('result');
    renderWorkspace();
}

function setSolidBgColor(color) {
    bgRemoverState.bgSolidColor = color;
    renderWorkspace();
}

function onSplitChange(val) {
    bgRemoverState.splitValue = val;
    renderWorkspace();
}

function setViewMode(mode) {
    bgRemoverState.viewMode = mode;
    document.getElementById('view-btn-split').className = "px-2 py-0.5 rounded text-[9px] font-bold text-slate-400 hover:text-white transition";
    document.getElementById('view-btn-result').className = "px-2 py-0.5 rounded text-[9px] font-bold text-slate-400 hover:text-white transition";
    document.getElementById('view-btn-original').className = "px-2 py-0.5 rounded text-[9px] font-bold text-slate-400 hover:text-white transition";

    document.getElementById(`view-btn-${mode}`).className = "px-2 py-0.5 rounded text-[9px] font-bold text-accent-400 bg-accent-500/10 transition";

    if (mode === 'split') {
        document.getElementById('split-slider-container').classList.remove('hidden');
    } else {
        document.getElementById('split-slider-container').classList.add('hidden');
    }
    renderWorkspace();
}

// EXPORT TO PNG
function downloadResult() {
    if (!bgRemoverState.originalImage) return;

    showInternalLoader("Exportando", "Montando camadas em alta resolução...");

    setTimeout(() => {
        const w = bgRemoverState.originalImage.naturalWidth;
        const h = bgRemoverState.originalImage.naturalHeight;

        const expCanvas = document.createElement('canvas');
        expCanvas.width = w;
        expCanvas.height = h;
        const expCtx = expCanvas.getContext('2d');

        if (bgRemoverState.bgType !== 'transparent') {
            drawSelectedBg(expCtx, w, h);
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(bgRemoverState.originalImage, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(bgRemoverState.maskCanvas, 0, 0);

        expCtx.drawImage(tempCanvas, 0, 0);

        try {
            const dataUrl = expCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `OmniTool_Studio_${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            hideInternalLoader();
            showNotification("Imagem salva!");
        } catch(err) {
            hideInternalLoader();
            showNotification("Falha na exportação.");
        }
    }, 200);
}

// LOADER HELPERS
function showInternalLoader(title, desc) {
    document.getElementById('loader-tool-title').innerText = title;
    document.getElementById('loader-tool-desc').innerText = desc;
    document.getElementById('tool-loader').classList.remove('hidden');
}

function hideInternalLoader() {
    document.getElementById('tool-loader').classList.add('hidden');
}

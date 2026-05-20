// OmniTool Studio: Magic Eraser (Object Eraser / Inpainter) Tool Module
(function() {
    let state = {
        originalImage: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        
        // Mask Canvas (contains user brush marks in red/alpha)
        maskCanvas: null,
        maskCtx: null,

        // Settings
        brushSize: 35,
        brushHardness: 0.8,
        
        // Zoom and Panning
        zoomScale: 1.0,
        zoomOffset: { x: 0, y: 0 },
        
        isDrawing: false,
        isPanning: false,
        lastMousePos: { x: 0, y: 0 },
        activeAction: 'brush' // 'brush', 'pan'
    };

    window.initMagicEraser = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <!-- TOP BAR CONTROL -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-eraser text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Apagar Objetos (Magic Eraser)</h3>
                            <p class="text-[10px] text-slate-400">Pincele sobre logos, pessoas ou imperfeições para removê-los instantaneamente</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button id="btn-erase-clear" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition" disabled>
                            Limpar Seleção
                        </button>
                        <button id="btn-run-eraser" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-sparkles"></i> Apagar Selecionado
                        </button>
                        <button id="btn-eraser-download" class="px-4 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-xs font-bold text-slate-200 transition flex items-center gap-1.5" disabled>
                            <i class="fa-solid fa-download"></i> Baixar Foto
                        </button>
                    </div>
                </div>

                <!-- WORKSPACE GRID -->
                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <!-- CANVAS AREA (LEFT 3 COLS) -->
                    <div class="lg:col-span-3 bg-slate-950/50 border border-slate-900 rounded-3xl relative flex items-center justify-center p-4 min-h-[300px] overflow-hidden" id="eraser-workspace-container">
                        
                        <!-- UPLOAD PLACEHOLDER -->
                        <div id="eraser-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="eraser-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-brush text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione uma imagem para apagar elementos</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Carregue qualquer foto. O inpainting ocorre localmente no canvas do seu navegador.</p>
                        </div>

                        <!-- WORK CANVAS -->
                        <canvas id="canvas-magic-eraser" class="hidden max-w-full max-h-full cursor-crosshair rounded-xl z-0"></canvas>

                        <!-- COMPOSITION LOADER -->
                        <div id="eraser-loader" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex-col items-center justify-center z-20 rounded-3xl">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="eraser-loader-title">Apagando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="eraser-loader-desc">Reconstruindo texturas de fundo localmente.</p>
                        </div>
                    </div>

                    <!-- CONTROL SIDEBAR (RIGHT 1 COL) -->
                    <div class="bg-slate-900/20 border border-slate-900 rounded-3xl p-4 flex flex-col gap-4">
                        <!-- ACTION TOOLS -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Modo de Controle</span>
                            <div class="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-900">
                                <button id="btn-eraser-tool-brush" class="active py-2 rounded-lg text-xs font-bold text-center transition-all bg-accent-600 text-indigo-300 border border-indigo-500/20 bg-indigo-950/20" disabled>
                                    <i class="fa-solid fa-paintbrush mr-1"></i> Pincelar
                                </button>
                                <button id="btn-eraser-tool-pan" class="py-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200" disabled>
                                    <i class="fa-solid fa-hand mr-1"></i> Mover
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <!-- BRUSH CONTROLS -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Configurações do Pincel</span>
                            
                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-[10px] text-slate-300">
                                    <span>Espessura:</span>
                                    <span id="eraser-brush-size-val" class="font-bold text-accent-400">35px</span>
                                </div>
                                <input type="range" id="eraser-brush-size" min="5" max="100" value="35" class="w-full accent-accent-500 bg-slate-900 h-1 rounded-lg cursor-pointer" disabled>
                            </div>

                            <div class="space-y-1">
                                <div class="flex items-center justify-between text-[10px] text-slate-300">
                                    <span>Suavidade das Bordas:</span>
                                    <span id="eraser-brush-hardness-val" class="font-bold text-accent-400">80%</span>
                                </div>
                                <input type="range" id="eraser-brush-hardness" min="10" max="100" value="80" class="w-full accent-accent-500 bg-slate-900 h-1 rounded-lg cursor-pointer" disabled>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <!-- TUTORIAL -->
                        <div class="text-[9px] text-slate-500 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-1">
                            <span class="font-bold text-slate-400 block"><i class="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Como usar:</span>
                            <p>1. Carregue uma imagem.</p>
                            <p>2. Pincele em vermelho a área que você quer remover (ex: um carimbo de data, marca d'água, etc).</p>
                            <p>3. Clique em **"Apagar Selecionado"**.</p>
                            <p>4. Baixe o resultado limpo!</p>
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

        placeholder.addEventListener('click', () => uploader.click());
        uploader.addEventListener('change', handleFileSelect);

        document.getElementById('btn-eraser-tool-brush').addEventListener('click', () => setToolMode('brush'));
        document.getElementById('btn-eraser-tool-pan').addEventListener('click', () => setToolMode('pan'));

        // Brush Sliders
        const brushSize = document.getElementById('eraser-brush-size');
        brushSize.addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            document.getElementById('eraser-brush-size-val').innerText = `${state.brushSize}px`;
        });
        const brushHardness = document.getElementById('eraser-brush-hardness');
        brushHardness.addEventListener('input', (e) => {
            state.brushHardness = parseFloat(e.target.value) / 100;
            document.getElementById('eraser-brush-hardness-val').innerText = `${e.target.value}%`;
        });

        document.getElementById('btn-erase-clear').addEventListener('click', clearMask);
        document.getElementById('btn-run-eraser').addEventListener('click', runInpainting);
        document.getElementById('btn-eraser-download').addEventListener('click', downloadResult);

        // Canvas Events
        const canvas = document.getElementById('canvas-magic-eraser');
        canvas.addEventListener('mousedown', canvasMouseDown);
        canvas.addEventListener('mousemove', canvasMouseMove);
        window.addEventListener('mouseup', canvasMouseUp);
        canvas.addEventListener('wheel', canvasWheel);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        showLoader('Carregando...', 'Configurando o espaço de trabalho.');

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                state.originalImage = img;
                
                state.workspaceCanvas = document.getElementById('canvas-magic-eraser');
                state.workspaceCtx = state.workspaceCanvas.getContext('2d');

                state.maskCanvas = document.createElement('canvas');
                state.maskCanvas.width = img.naturalWidth;
                state.maskCanvas.height = img.naturalHeight;
                state.maskCtx = state.maskCanvas.getContext('2d');

                state.workspaceCanvas.width = img.naturalWidth;
                state.workspaceCanvas.height = img.naturalHeight;
                state.workspaceCanvas.classList.remove('hidden');

                document.getElementById('eraser-placeholder').classList.add('hidden');
                
                // Enable controls
                document.getElementById('btn-eraser-tool-brush').removeAttribute('disabled');
                document.getElementById('btn-eraser-tool-pan').removeAttribute('disabled');
                document.getElementById('eraser-brush-size').removeAttribute('disabled');
                document.getElementById('eraser-brush-hardness').removeAttribute('disabled');
                document.getElementById('btn-erase-clear').removeAttribute('disabled');
                document.getElementById('btn-run-eraser').removeAttribute('disabled');
                document.getElementById('btn-eraser-download').removeAttribute('disabled');

                resetZoomOffset();
                hideLoader();
                renderWorkspace();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetZoomOffset() {
        if (!state.originalImage) return;
        const container = document.getElementById('eraser-workspace-container');
        const contW = container.clientWidth - 32;
        const contH = container.clientHeight - 32;
        const imgW = state.originalImage.naturalWidth;
        const imgH = state.originalImage.naturalHeight;

        state.zoomScale = Math.min(contW / imgW, contH / imgH, 1.0);
        state.zoomOffset = { x: 0, y: 0 };
        updateCanvasTransforms();
    }

    function setToolMode(mode) {
        state.activeAction = mode;
        const btnBrush = document.getElementById('btn-eraser-tool-brush');
        const btnPan = document.getElementById('btn-eraser-tool-pan');

        if (mode === 'brush') {
            btnBrush.className = "active py-2 rounded-lg text-xs font-bold text-center transition-all bg-accent-600 text-indigo-300 border border-indigo-500/20 bg-indigo-950/20";
            btnPan.className = "py-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200";
            state.workspaceCanvas.className = "max-w-full max-h-full cursor-crosshair rounded-xl z-0";
        } else {
            btnPan.className = "active py-2 rounded-lg text-xs font-bold text-center transition-all bg-accent-600 text-indigo-300 border border-indigo-500/20 bg-indigo-950/20";
            btnBrush.className = "py-2 rounded-lg text-xs font-bold text-center transition-all text-slate-400 hover:text-slate-200";
            state.workspaceCanvas.className = "max-w-full max-h-full cursor-grab rounded-xl z-0";
        }
    }

    function renderWorkspace() {
        if (!state.originalImage) return;

        const canvas = state.workspaceCanvas;
        const ctx = state.workspaceCtx;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        
        // 1. Draw Image
        ctx.drawImage(state.originalImage, 0, 0);

        // 2. Overlay User Brush Mask (Semi-transparent red)
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(state.maskCanvas, 0, 0);
        ctx.restore();
    }

    // CANVAS INTERACTIONS
    function canvasMouseDown(e) {
        if (!state.originalImage) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (state.activeAction === 'pan') {
            state.isPanning = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.classList.remove('cursor-grab');
            state.workspaceCanvas.classList.add('cursor-grabbing');
        } else {
            state.isDrawing = true;
            paintMaskStroke(mouseX, mouseY, true);
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
        } else if (state.isDrawing) {
            paintMaskStroke(mouseX, mouseY, false);
        }
    }

    function canvasMouseUp() {
        state.isPanning = false;
        state.isDrawing = false;
        if (state.activeAction === 'pan') {
            state.workspaceCanvas.classList.remove('cursor-grabbing');
            state.workspaceCanvas.classList.add('cursor-grab');
        }
    }

    function canvasWheel(e) {
        e.preventDefault();
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

    // DRAW RED MASK ON MASK CANVAS
    function paintMaskStroke(x, y, isStart) {
        const rect = state.workspaceCanvas.getBoundingClientRect();
        const scaleX = state.originalImage.naturalWidth / rect.width;
        const scaleY = state.originalImage.naturalHeight / rect.height;

        const imgX = x * scaleX;
        const imgY = y * scaleY;

        const ctx = state.maskCtx;
        ctx.save();
        
        const grad = ctx.createRadialGradient(imgX, imgY, state.brushSize * state.brushHardness / 2, imgX, imgY, state.brushSize / 2);
        grad.addColorStop(0, 'rgba(239, 68, 68, 1)'); // Solid red
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)'); // Transparent red

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(imgX, imgY, state.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        renderWorkspace();
    }

    function clearMask() {
        if (!state.maskCanvas) return;
        state.maskCtx.clearRect(0, 0, state.maskCanvas.width, state.maskCanvas.height);
        renderWorkspace();
    }

    // INPAINTING ENGINE
    function runInpainting() {
        if (!state.originalImage) return;

        showLoader('Processando...', 'Reconstruindo pixels da imagem via inpainting local...', 20);

        setTimeout(() => {
            const w = state.originalImage.naturalWidth;
            const h = state.originalImage.naturalHeight;

            // Render current canvas state
            const outCanvas = document.createElement('canvas');
            outCanvas.width = w;
            outCanvas.height = h;
            const outCtx = outCanvas.getContext('2d');
            outCtx.drawImage(state.originalImage, 0, 0);

            const imgData = outCtx.getImageData(0, 0, w, h);
            const pixels = imgData.data;

            const mPixels = state.maskCtx.getImageData(0, 0, w, h).data;

            // Content-Aware Patch Matching Inpainting algorithm
            const maskCoords = [];
            const borderCoords = [];

            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = (y * w + x) * 4;
                    // Red color indicates mask
                    if (mPixels[idx] > 200 && mPixels[idx+3] > 50) {
                        maskCoords.push({ x, y });
                        
                        // Border check
                        const n1 = (y * w + (x-1)) * 4;
                        const n2 = (y * w + (x+1)) * 4;
                        const n3 = ((y-1) * w + x) * 4;
                        const n4 = ((y+1) * w + x) * 4;

                        if (mPixels[n1+3] === 0 || mPixels[n2+3] === 0 || mPixels[n3+3] === 0 || mPixels[n4+3] === 0) {
                            borderCoords.push({ x, y });
                        }
                    }
                }
            }

            if (maskCoords.length === 0) {
                hideLoader();
                if (typeof showNotification === 'function') showNotification("Selecione algum elemento com o pincel primeiro.");
                return;
            }

            // Fill holes with surrounding textures
            const step = Math.max(1, Math.floor(maskCoords.length / 5000));
            for (let i = 0; i < maskCoords.length; i += step) {
                const coord = maskCoords[i];
                const px = coord.x;
                const py = coord.y;

                let bestX = px;
                let bestY = py;
                let minDist = Infinity;

                // Search radius for texture source
                const radius = 40;
                const startX = Math.max(1, px - radius);
                const endX = Math.min(w - 2, px + radius);
                const startY = Math.max(1, py - radius);
                const endY = Math.min(h - 2, py + radius);

                for (let sy = startY; sy <= endY; sy += 3) {
                    for (let sx = startX; sx <= endX; sx += 3) {
                        const sIdx = (sy * w + sx) * 4;
                        const isMasked = mPixels[sIdx] > 200 && mPixels[sIdx+3] > 50;

                        if (!isMasked) {
                            const dist = (sx - px)*(sx - px) + (sy - py)*(sy - py);
                            if (dist < minDist) {
                                minDist = dist;
                                bestX = sx;
                                bestY = sy;
                            }
                        }
                    }
                }

                const targetIdx = (py * w + px) * 4;
                const sourceIdx = (bestY * w + bestX) * 4;

                pixels[targetIdx] = pixels[sourceIdx];
                pixels[targetIdx+1] = pixels[sourceIdx+1];
                pixels[targetIdx+2] = pixels[sourceIdx+2];
            }

            outCtx.putImageData(imgData, 0, 0);

            // Feathering blend on border edges
            outCtx.globalCompositeOperation = 'source-over';
            outCtx.filter = 'blur(4px)';
            borderCoords.forEach(c => {
                const idx = (c.y * w + c.x) * 4;
                outCtx.fillStyle = `rgb(${pixels[idx]}, ${pixels[idx+1]}, ${pixels[idx+2]})`;
                outCtx.fillRect(c.x - 3, c.y - 3, 6, 6);
            });
            outCtx.filter = 'none';

            // Save results to originalImage to allow compound erases!
            const finalImg = new Image();
            finalImg.onload = function() {
                state.originalImage = finalImg;
                clearMask();
                hideLoader();
                renderWorkspace();
                if (typeof showNotification === 'function') showNotification("Elemento removido!");
            };
            finalImg.src = outCanvas.toDataURL('image/png');

        }, 150);
    }

    function downloadResult() {
        if (!state.originalImage) return;
        const link = document.createElement('a');
        link.download = `magicerase_${Date.now()}.png`;
        link.href = state.originalImage.src;
        link.click();
    }

    // UTILS
    function showLoader(title, desc, progress = 0) {
        document.getElementById('eraser-loader-title').innerText = title;
        document.getElementById('eraser-loader-desc').innerText = desc;
        document.getElementById('eraser-loader').className = "absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

    function hideLoader() {
        document.getElementById('eraser-loader').className = "hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

})();

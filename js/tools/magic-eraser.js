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
        activeAction: 'brush'
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

                        <div class="text-[9px] text-slate-500 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-1">
                            <span class="font-bold text-slate-400 block"><i class="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Como usar:</span>
                            <p>1. Carregue uma imagem.</p>
                            <p>2. Pincele em vermelho a área a remover.</p>
                            <p>3. Clique "Apagar" para processar.</p>
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
        uploader.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

        document.getElementById('btn-eraser-tool-brush').addEventListener('click', () => setToolMode('brush'));
        document.getElementById('btn-eraser-tool-pan').addEventListener('click', () => setToolMode('pan'));

        document.getElementById('eraser-brush-size').addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            document.getElementById('eraser-brush-size-val').innerText = `${state.brushSize}px`;
        });
        document.getElementById('eraser-brush-hardness').addEventListener('input', (e) => {
            document.getElementById('eraser-brush-hardness-val').innerText = `${e.target.value}%`;
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
                state.workspaceCtx = state.workspaceCanvas.getContext('2d');
                state.maskCanvas = document.createElement('canvas');
                state.maskCanvas.width = img.naturalWidth;
                state.maskCanvas.height = img.naturalHeight;
                state.maskCtx = state.maskCanvas.getContext('2d');

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

    function runInpainting() {
        if (!state.originalImage) return;
        showLoader('Apagando...', 'Reconstruindo pixels via inpainting local...');
        setTimeout(() => {
            const w = state.workspaceCanvas.width;
            const h = state.workspaceCanvas.height;

            const out = document.createElement('canvas');
            out.width = w; out.height = h;
            const outCtx = out.getContext('2d');
            outCtx.drawImage(state.originalImage, 0, 0);
            const imgData = outCtx.getImageData(0, 0, w, h);
            const pixels = imgData.data;
            const mPx = state.maskCtx.getImageData(0, 0, w, h).data;

            const maskCoords = [], borderCoords = [];
            for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                if (mPx[idx + 3] > 10) {
                    maskCoords.push({ x, y });
                    const n1 = (y * w + (x-1)) * 4, n2 = (y * w + (x+1)) * 4;
                    const n3 = ((y-1) * w + x) * 4, n4 = ((y+1) * w + x) * 4;
                    if (mPx[n1+3] === 0 || mPx[n2+3] === 0 || mPx[n3+3] === 0 || mPx[n4+3] === 0)
                        borderCoords.push({ x, y });
                }
            }

            if (maskCoords.length === 0) { hideLoader(); showNotification("Selecione algo com o pincel primeiro."); return; }

            const step = Math.max(1, Math.floor(maskCoords.length / 5000));
            for (let i = 0; i < maskCoords.length; i += step) {
                const { x: px, y: py } = maskCoords[i];
                let bestX = px, bestY = py, minDist = Infinity;
                const radius = 45;
                for (let sy = Math.max(1, py - radius); sy <= Math.min(h - 2, py + radius); sy += 3) {
                    for (let sx = Math.max(1, px - radius); sx <= Math.min(w - 2, px + radius); sx += 3) {
                        if (mPx[(sy * w + sx) * 4 + 3] <= 10) {
                            const d = (sx - px) ** 2 + (sy - py) ** 2;
                            if (d < minDist) { minDist = d; bestX = sx; bestY = sy; }
                        }
                    }
                }
                const tI = (py * w + px) * 4, sI = (bestY * w + bestX) * 4;
                pixels[tI] = pixels[sI]; pixels[tI+1] = pixels[sI+1]; pixels[tI+2] = pixels[sI+2];
            }

            outCtx.putImageData(imgData, 0, 0);
            outCtx.filter = 'blur(4px)';
            borderCoords.forEach(c => {
                const idx = (c.y * w + c.x) * 4;
                outCtx.fillStyle = `rgb(${pixels[idx]},${pixels[idx+1]},${pixels[idx+2]})`;
                outCtx.fillRect(c.x - 3, c.y - 3, 6, 6);
            });
            outCtx.filter = 'none';

            const finalImg = new Image();
            finalImg.onload = () => {
                state.originalImage = finalImg;
                clearMask(); hideLoader(); renderWorkspace();
                showNotification("Elemento removido!");
            };
            state.originalDataURL = out.toDataURL('image/png');
            finalImg.src = state.originalDataURL;
        }, 150);
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

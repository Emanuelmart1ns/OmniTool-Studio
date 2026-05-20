// OmniTool Studio: Magic Grab (Subject Isolation and Movement) Tool Module
(function() {
    let state = {
        originalImage: null,
        currentFile: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        
        // Layers
        backgroundCanvas: null, // Magic Filled Background
        foregroundImage: null, // Isolated Subject transparent cropped canvas
        
        // Subject Interaction State
        subjectScale: 1.0,
        subjectRotation: 0, // In degrees
        subjectPosition: { x: 0, y: 0 },
        subjectRect: { w: 0, h: 0 },
        
        isInteracting: false,
        interactionMode: 'none', // 'drag'
        lastMousePos: { x: 0, y: 0 },
        
        // Background Options
        bgFillMode: 'inpainted', // 'inpainted' (magic fill), 'original' (sticker duplicate), 'transparent'
    };

    window.initMagicGrab = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <!-- TOP BAR CONTROL -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-arrows-up-down-left-right text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Mover Sujeito (Magic Grab)</h3>
                            <p class="text-[10px] text-slate-400">Destaque pessoas ou objetos e movimente-os livremente pela cena</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button id="btn-grab-reset" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition" disabled>
                            Reiniciar Posição
                        </button>
                        <button id="btn-grab-download" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-download"></i> Baixar Imagem
                        </button>
                    </div>
                </div>

                <!-- WORKSPACE GRID -->
                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <!-- CANVAS AREA (LEFT 3 COLS) -->
                    <div class="lg:col-span-3 bg-slate-950/50 border border-slate-900 rounded-3xl relative flex items-center justify-center p-4 min-h-[300px] overflow-hidden" id="grab-workspace-container">
                        
                        <!-- UPLOAD PLACEHOLDER -->
                        <div id="grab-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="grab-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-arrows-spin text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione uma imagem para destacar o sujeito</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Carregue qualquer foto. Nossa IA local vai isolar o sujeito para você poder movê-lo.</p>
                        </div>

                        <!-- WORK CANVAS -->
                        <canvas id="canvas-magic-grab" class="hidden cursor-grab rounded-xl z-0"></canvas>

                        <!-- COMPOSITION LOADER -->
                        <div id="grab-loader" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex-col items-center justify-center z-20 rounded-3xl">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="grab-loader-title">Processando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="grab-loader-desc">Aguarde o processamento local.</p>
                            <!-- PROGRESS BAR -->
                            <div class="w-48 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                                <div class="bg-accent-500 h-1.5 rounded-full w-0 transition-all duration-300" id="grab-loader-progress"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CONTROL SIDEBAR (RIGHT 1 COL) -->
                    <div class="bg-slate-900/20 border border-slate-900 rounded-3xl p-4 flex flex-col gap-4">
                        <!-- AI CONFIG -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Foco do Destaque</span>
                            <div class="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-900">
                                <label class="cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all bg-accent-600 text-white" id="lbl-grab-people">
                                    <input type="radio" name="grab-engine" value="mediapipe" checked class="hidden">
                                    Pessoas (Rápido)
                                </label>
                                <label class="cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all text-slate-400 hover:text-slate-200" id="lbl-grab-objects">
                                    <input type="radio" name="grab-engine" value="imgly" class="hidden">
                                    Objetos (Geral)
                                </label>
                            </div>
                            <button id="btn-run-grab" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-2" disabled>
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Separar Sujeito
                            </button>
                        </div>

                        <hr class="border-slate-900">

                        <!-- BACKGROUND MODE -->
                        <div class="space-y-3">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Modo do Fundo Recortado</span>
                            <div class="flex flex-col gap-1.5">
                                <button id="btn-bg-mode-inpainted" class="active w-full py-2 px-3 rounded-xl border border-indigo-500 bg-indigo-950/20 text-left text-xs text-indigo-300 transition flex items-center gap-2" disabled>
                                    <i class="fa-solid fa-sparkles text-xs"></i> Preenchimento Inteligente (Inpaint)
                                </button>
                                <button id="btn-bg-mode-original" class="w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2" disabled>
                                    <i class="fa-solid fa-clone text-xs"></i> Duplicar Sujeito (Sticker)
                                </button>
                                <button id="btn-bg-mode-transparent" class="w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2" disabled>
                                    <i class="fa-solid fa-border-none text-xs"></i> Fundo Transparente
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <!-- INSTRUCTIONS -->
                        <div class="space-y-2 text-[10px] text-slate-500 leading-relaxed">
                            <span class="font-bold text-slate-400 block">Dicas de Controle:</span>
                            <ul class="list-disc pl-4 space-y-1">
                                <li>Clique e arraste no objeto para movê-lo.</li>
                                <li>Use a roda do mouse (Scroll) para alterar o tamanho.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupListeners();
    };

    function setupListeners() {
        const uploader = document.getElementById('grab-file-uploader');
        const placeholder = document.getElementById('grab-placeholder');

        placeholder.addEventListener('click', () => uploader.click());
        uploader.addEventListener('change', handleFileSelect);

        // Radios
        const lblPeople = document.getElementById('lbl-grab-people');
        const lblObjects = document.getElementById('lbl-grab-objects');
        document.querySelectorAll('input[name="grab-engine"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'mediapipe') {
                    lblPeople.className = "cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all bg-accent-600 text-white";
                    lblObjects.className = "cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all text-slate-400 hover:text-slate-200";
                } else {
                    lblObjects.className = "cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all bg-accent-600 text-white";
                    lblPeople.className = "cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all text-slate-400 hover:text-slate-200";
                }
            });
        });

        document.getElementById('btn-run-grab').addEventListener('click', runGrabAI);
        document.getElementById('btn-grab-reset').addEventListener('click', resetSubjectPos);
        document.getElementById('btn-grab-download').addEventListener('click', downloadGrabImage);

        // BG Modes
        const btnInpaint = document.getElementById('btn-bg-mode-inpainted');
        const btnOriginal = document.getElementById('btn-bg-mode-original');
        const btnTrans = document.getElementById('btn-bg-mode-transparent');

        btnInpaint.addEventListener('click', () => {
            state.bgFillMode = 'inpainted';
            btnInpaint.className = "active w-full py-2 px-3 rounded-xl border border-indigo-500 bg-indigo-950/20 text-left text-xs text-indigo-300 transition flex items-center gap-2";
            btnOriginal.className = "w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
            btnTrans.className = "w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
            renderWorkspace();
        });

        btnOriginal.addEventListener('click', () => {
            state.bgFillMode = 'original';
            btnOriginal.className = "active w-full py-2 px-3 rounded-xl border border-indigo-500 bg-indigo-950/20 text-left text-xs text-indigo-300 transition flex items-center gap-2";
            btnInpaint.className = "w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
            btnTrans.className = "w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
            renderWorkspace();
        });

        btnTrans.addEventListener('click', () => {
            state.bgFillMode = 'transparent';
            btnTrans.className = "active w-full py-2 px-3 rounded-xl border border-indigo-500 bg-indigo-950/20 text-left text-xs text-indigo-300 transition flex items-center gap-2";
            btnInpaint.className = "w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
            btnOriginal.className = "w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
            renderWorkspace();
        });

        // Canvas gestures
        const canvas = document.getElementById('canvas-magic-grab');
        canvas.addEventListener('mousedown', canvasMouseDown);
        canvas.addEventListener('mousemove', canvasMouseMove);
        window.addEventListener('mouseup', canvasMouseUp);
        canvas.addEventListener('wheel', canvasWheel);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        state.currentFile = file;

        showLoader('Carregando...', 'Renderizando imagem no canvas.');

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                state.originalImage = img;
                
                state.workspaceCanvas = document.getElementById('canvas-magic-grab');
                state.workspaceCtx = state.workspaceCanvas.getContext('2d');

                state.workspaceCanvas.width = img.naturalWidth;
                state.workspaceCanvas.height = img.naturalHeight;
                
                // Set CSS style to prevent double-scaling layout
                state.workspaceCanvas.style.width = `${img.naturalWidth}px`;
                state.workspaceCanvas.style.height = `${img.naturalHeight}px`;
                state.workspaceCanvas.style.maxWidth = 'none';
                state.workspaceCanvas.style.maxHeight = 'none';
                state.workspaceCanvas.style.transformOrigin = '0 0';
                
                // Centering inside workspace
                const container = document.getElementById('grab-workspace-container');
                const scale = Math.min((container.clientWidth - 32) / img.naturalWidth, (container.clientHeight - 32) / img.naturalHeight, 1.0);
                const ox = (container.clientWidth - img.naturalWidth * scale) / 2;
                const oy = (container.clientHeight - img.naturalHeight * scale) / 2;
                state.workspaceCanvas.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
                state.workspaceCanvas.classList.remove('hidden');

                document.getElementById('grab-placeholder').classList.add('hidden');
                document.getElementById('btn-run-grab').removeAttribute('disabled');

                hideLoader();
                
                // Clear any past states
                state.foregroundImage = null;
                state.backgroundCanvas = null;
                
                renderWorkspace();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderWorkspace() {
        if (!state.originalImage) return;

        const canvas = state.workspaceCanvas;
        const ctx = state.workspaceCtx;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw Background Layer
        if (state.foregroundImage && state.bgFillMode === 'transparent') {
            drawCheckerboard(ctx, w, h);
        } else if (state.foregroundImage && state.bgFillMode === 'inpainted' && state.backgroundCanvas) {
            ctx.drawImage(state.backgroundCanvas, 0, 0);
        } else {
            ctx.drawImage(state.originalImage, 0, 0);
        }

        // 2. Draw Floating Subject
        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const subW = state.subjectRect.w * state.subjectScale;
            const subH = state.subjectRect.h * state.subjectScale;

            ctx.save();
            ctx.translate(state.subjectPosition.x, state.subjectPosition.y);
            ctx.rotate(state.subjectRotation * Math.PI / 180);
            
            // Draw centered around subjectPosition
            ctx.drawImage(img, -subW / 2, -subH / 2, subW, subH);

            // Draw a subtle border indicator around the subject to guide the user
            ctx.strokeStyle = 'rgba(124, 58, 237, 0.6)';
            ctx.lineWidth = Math.max(2, 2 / (parseFloat(state.workspaceCanvas.style.transform.match(/scale\((.*?)\)/)?.[1] || 1)));
            ctx.strokeRect(-subW / 2 - 2, -subH / 2 - 2, subW + 4, subH + 4);
            ctx.restore();
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

    function runGrabAI() {
        const engine = document.querySelector('input[name="grab-engine"]:checked').value;
        if (engine === 'mediapipe') {
            runMediaPipeGrab();
        } else {
            runImglyGrab();
        }
    }

    function runMediaPipeGrab() {
        showLoader('Separando Sujeito', 'Processando silhueta da pessoa via MediaPipe AI...', 30);
        try {
            const selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            });
            selfieSegmentation.setOptions({ modelSelection: 1 });

            selfieSegmentation.onResults((results) => {
                const w = state.originalImage.naturalWidth;
                const h = state.originalImage.naturalHeight;

                const mask = document.createElement('canvas');
                mask.width = w;
                mask.height = h;
                const mCtx = mask.getContext('2d');
                mCtx.drawImage(results.segmentationMask, 0, 0);

                const imgData = mCtx.getImageData(0, 0, w, h);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const prob = data[i];
                    data[i] = 255;
                    data[i+1] = 255;
                    data[i+2] = 255;
                    data[i+3] = prob > 128 ? 255 : 0;
                }
                mCtx.putImageData(imgData, 0, 0);

                applyIsolateSubject(mask);
            });

            setTimeout(() => {
                selfieSegmentation.send({ image: state.originalImage }).catch(e => {
                    hideLoader();
                    if (typeof showNotification === 'function') showNotification("Falha no MediaPipe. Use o motor de Objetos.");
                });
            }, 300);

        } catch (e) {
            hideLoader();
            console.error(e);
        }
    }

    async function runImglyGrab() {
        if (!window.imglyRemoveBackground) {
            showLoader('Inicializando Motor', 'Carregando arquivos de IA de objetos...', 10);
            let check = setInterval(() => {
                if (window.imglyRemoveBackground) {
                    clearInterval(check);
                    hideLoader();
                    runImglyGrabLogic();
                }
            }, 1000);
            return;
        }
        runImglyGrabLogic();
    }

    async function runImglyGrabLogic() {
        showLoader('Separando Sujeito', 'Extraindo sujeito com IMG.LY...', 15);
        try {
            const blob = await window.imglyRemoveBackground(state.currentFile, {
                model: 'isnet_quint8',
                device: 'cpu',
                proxyToWorker: false
            });

            const url = URL.createObjectURL(blob);
            const resImg = new Image();
            resImg.onload = function() {
                const w = state.originalImage.naturalWidth;
                const h = state.originalImage.naturalHeight;

                const mask = document.createElement('canvas');
                mask.width = w;
                mask.height = h;
                const mCtx = mask.getContext('2d');
                mCtx.drawImage(resImg, 0, 0);

                const imgData = mCtx.getImageData(0, 0, w, h);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i+3];
                    data[i] = 255;
                    data[i+1] = 255;
                    data[i+2] = 255;
                    data[i+3] = alpha > 10 ? 255 : 0;
                }
                mCtx.putImageData(imgData, 0, 0);

                applyIsolateSubject(mask);
            };
            resImg.src = url;
        } catch (e) {
            hideLoader();
            console.error(e);
            if (typeof showNotification === 'function') showNotification("Falha ao isolar objeto.");
        }
    }

    // HELPER: CROP SUBJECT TO BOUNDING BOX
    function getCroppedSubject(img, maskCanvas) {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        
        const mCtx = maskCanvas.getContext('2d');
        const mData = mCtx.getImageData(0, 0, w, h).data;
        
        let minX = w, maxX = 0, minY = h, maxY = 0;
        let found = false;
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (mData[idx+3] > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }
        
        if (!found) {
            return {
                canvas: img,
                rect: { x: 0, y: 0, w: w, h: h }
            };
        }
        
        minX = Math.max(0, minX - 3);
        minY = Math.max(0, minY - 3);
        maxX = Math.min(w - 1, maxX + 3);
        maxY = Math.min(h - 1, maxY + 3);
        
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        
        cropCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        cropCtx.globalCompositeOperation = 'destination-in';
        cropCtx.drawImage(maskCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        cropCtx.globalCompositeOperation = 'source-over';
        
        return {
            canvas: cropCanvas,
            rect: { x: minX, y: minY, w: cropW, h: cropH }
        };
    }

    function applyIsolateSubject(maskCanvas) {
        const w = state.originalImage.naturalWidth;
        const h = state.originalImage.naturalHeight;

        // Isolate and Crop subject
        const cropped = getCroppedSubject(state.originalImage, maskCanvas);
        state.foregroundImage = cropped.canvas;
        state.subjectRect = { w: cropped.rect.w, h: cropped.rect.h };
        
        // Subject starting position (centered on its original location)
        state.subjectPosition = {
            x: cropped.rect.x + cropped.rect.w / 2,
            y: cropped.rect.y + cropped.rect.h / 2
        };
        state.subjectScale = 1.0;
        state.subjectRotation = 0;

        // 2. Create Magic Filled Background Layer (Inpaint)
        showLoader('Preenchimento Mágico', 'Reconstruindo o fundo atrás do sujeito (Inpainting)...', 60);

        setTimeout(() => {
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = w;
            bgCanvas.height = h;
            const bgCtx = bgCanvas.getContext('2d');
            bgCtx.drawImage(state.originalImage, 0, 0);

            // Execute local patch inpainting!
            performLocalInpaint(bgCanvas, maskCanvas);

            state.backgroundCanvas = bgCanvas;

            // Enable buttons
            document.getElementById('btn-grab-reset').removeAttribute('disabled');
            document.getElementById('btn-grab-download').removeAttribute('disabled');
            document.getElementById('btn-bg-mode-inpainted').removeAttribute('disabled');
            document.getElementById('btn-bg-mode-original').removeAttribute('disabled');
            document.getElementById('btn-bg-mode-transparent').removeAttribute('disabled');

            hideLoader();
            renderWorkspace();
            if (typeof showNotification === 'function') showNotification("Sujeito destacado! Agora arraste para movê-lo.");
        }, 150);
    }

    // LOCAL PATCH INPAINT (CONTENT-AWARE FILL IN JS)
    function performLocalInpaint(canvas, mask) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        const imgData = ctx.getImageData(0, 0, w, h);
        const pixels = imgData.data;

        const mCtx = mask.getContext('2d');
        const mPixels = mCtx.getImageData(0, 0, w, h).data;

        const maskCoords = [];
        const borderCoords = []; 

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                if (mPixels[idx+3] > 128) {
                    maskCoords.push({ x, y });
                    
                    const n1 = (y * w + (x-1)) * 4;
                    const n2 = (y * w + (x+1)) * 4;
                    const n3 = ((y-1) * w + x) * 4;
                    const n4 = ((y+1) * w + x) * 4;

                    if (mPixels[n1+3] <= 128 || mPixels[n2+3] <= 128 || mPixels[n3+3] <= 128 || mPixels[n4+3] <= 128) {
                        borderCoords.push({ x, y });
                    }
                }
            }
        }

        if (maskCoords.length === 0) return;

        const step = Math.max(1, Math.floor(maskCoords.length / 5000)); 
        
        for (let i = 0; i < maskCoords.length; i += step) {
            const coord = maskCoords[i];
            const px = coord.x;
            const py = coord.y;

            let bestX = px;
            let bestY = py;
            let minDist = Infinity;

            const radius = 45;
            const startX = Math.max(1, px - radius);
            const endX = Math.min(w - 2, px + radius);
            const startY = Math.max(1, py - radius);
            const endY = Math.min(h - 2, py + radius);

            for (let sy = startY; sy <= endY; sy += 3) {
                for (let sx = startX; sx <= endX; sx += 3) {
                    const sIdx = (sy * w + sx) * 4;
                    if (mPixels[sIdx+3] === 0) { 
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
            pixels[targetIdx+3] = 255; 
        }

        ctx.putImageData(imgData, 0, 0);

        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'blur(6px)';
        
        borderCoords.forEach(c => {
            const idx = (c.y * w + c.x) * 4;
            ctx.fillStyle = `rgb(${pixels[idx]}, ${pixels[idx+1]}, ${pixels[idx+2]})`;
            ctx.fillRect(c.x - 3, c.y - 3, 6, 6);
        });

        ctx.filter = 'none';
    }

    // GESTURES
    function canvasMouseDown(e) {
        if (!state.foregroundImage) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const scaleX = state.workspaceCanvas.width / rect.width;
        const scaleY = state.workspaceCanvas.height / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        // Verify click on cropped subject boundaries
        const subW = state.subjectRect.w * state.subjectScale;
        const subH = state.subjectRect.h * state.subjectScale;
        
        const left = state.subjectPosition.x - subW / 2;
        const right = state.subjectPosition.x + subW / 2;
        const top = state.subjectPosition.y - subH / 2;
        const bottom = state.subjectPosition.y + subH / 2;

        if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
            state.isInteracting = true;
            state.interactionMode = 'drag';
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.style.cursor = 'grabbing';
        }
    }

    function canvasMouseMove(e) {
        if (!state.isInteracting) return;

        const rect = state.workspaceCanvas.getBoundingClientRect();
        const scaleX = state.workspaceCanvas.width / rect.width;
        const scaleY = state.workspaceCanvas.height / rect.height;

        const dx = (e.clientX - state.lastMousePos.x) * scaleX;
        const dy = (e.clientY - state.lastMousePos.y) * scaleY;

        if (state.interactionMode === 'drag') {
            state.subjectPosition.x += dx;
            state.subjectPosition.y += dy;
        }

        state.lastMousePos = { x: e.clientX, y: e.clientY };
        renderWorkspace();
    }

    function canvasMouseUp() {
        if (state.isInteracting) {
            state.isInteracting = false;
            state.interactionMode = 'none';
            state.workspaceCanvas.style.cursor = 'grab';
        }
    }

    function canvasWheel(e) {
        if (!state.foregroundImage) return;
        e.preventDefault();

        const scaleFactor = 1.05;
        if (e.deltaY < 0) {
            state.subjectScale *= scaleFactor;
        } else {
            state.subjectScale /= scaleFactor;
        }
        state.subjectScale = Math.max(0.1, Math.min(5.0, state.subjectScale));
        renderWorkspace();
    }

    function resetSubjectPos() {
        if (!state.originalImage || !state.foregroundImage) return;
        
        const w = state.originalImage.naturalWidth;
        const h = state.originalImage.naturalHeight;
        
        state.subjectScale = 1.0;
        state.subjectRotation = 0;
        
        // Return to original crop position
        const container = document.getElementById('grab-workspace-container');
        const scale = Math.min((container.clientWidth - 32) / w, (container.clientHeight - 32) / h, 1.0);
        const ox = (container.clientWidth - w * scale) / 2;
        const oy = (container.clientHeight - h * scale) / 2;
        state.workspaceCanvas.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
        
        // Re-read crop metrics to restore position
        state.subjectPosition = {
            x: w / 2,
            y: h / 2
        };
        
        renderWorkspace();
    }

    function downloadGrabImage() {
        if (!state.workspaceCanvas) return;
        
        // Export composition at full size without the 紫色 border indicator
        const canvas = document.createElement('canvas');
        canvas.width = state.workspaceCanvas.width;
        canvas.height = state.workspaceCanvas.height;
        const ctx = canvas.getContext('2d');
        
        // Draw background
        if (state.foregroundImage && state.bgFillMode === 'transparent') {
            // Keep transparent
        } else if (state.foregroundImage && state.bgFillMode === 'inpainted' && state.backgroundCanvas) {
            ctx.drawImage(state.backgroundCanvas, 0, 0);
        } else {
            ctx.drawImage(state.originalImage, 0, 0);
        }

        // Draw subject
        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const subW = state.subjectRect.w * state.subjectScale;
            const subH = state.subjectRect.h * state.subjectScale;

            ctx.save();
            ctx.translate(state.subjectPosition.x, state.subjectPosition.y);
            ctx.rotate(state.subjectRotation * Math.PI / 180);
            ctx.drawImage(img, -subW / 2, -subH / 2, subW, subH);
            ctx.restore();
        }
        
        const link = document.createElement('a');
        link.download = `magicgrab_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // UTILS
    function showLoader(title, desc, progress = 0) {
        document.getElementById('grab-loader-title').innerText = title;
        document.getElementById('grab-loader-desc').innerText = desc;
        document.getElementById('grab-loader-progress').style.width = `${progress}%`;
        document.getElementById('grab-loader').className = "absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

    function hideLoader() {
        document.getElementById('grab-loader').className = "hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

})();

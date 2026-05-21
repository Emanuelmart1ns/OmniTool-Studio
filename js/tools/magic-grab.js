(function() {
    let state = {
        originalImage: null,
        currentFile: null,
        workspaceCanvas: null,
        workspaceCtx: null,
        backgroundCanvas: null,
        foregroundImage: null,
        subjectScale: 1.0,
        subjectRotation: 0,
        subjectPosition: { x: 0, y: 0 },
        subjectRect: { w: 0, h: 0 },
        originalSubjectPos: { x: 0, y: 0 },
        isInteracting: false,
        lastMousePos: { x: 0, y: 0 },
        bgFillMode: 'inpainted'
    };

    window.initMagicGrab = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-arrows-up-down-left-right text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Mover Sujeito (Magic Grab)</h3>
                            <p class="text-[10px] text-slate-400">Destaque e movimente objetos pela cena</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-grab-reset" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition" disabled>Reiniciar</button>
                        <button id="btn-grab-download" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20" disabled>
                            <i class="fa-solid fa-download"></i> Baixar
                        </button>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <div class="lg:col-span-3 canvas-workspace" id="grab-workspace-container">
                        <div id="grab-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="grab-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-arrows-spin text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione uma imagem</h4>
                            <p class="text-xs text-slate-500 mt-1">A IA local vai isolar o sujeito para você movê-lo.</p>
                        </div>
                        <canvas id="canvas-magic-grab" class="hidden cursor-grab rounded-xl z-0"></canvas>
                        <div id="grab-loader" class="loader-overlay hidden">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="grab-loader-title">Processando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="grab-loader-desc"></p>
                            <div class="progress-bar-track"><div class="progress-bar-fill" id="grab-loader-progress" style="width:0%"></div></div>
                        </div>
                    </div>

                    <div class="control-sidebar">
                        <div class="space-y-3">
                            <span class="tool-section-title">1. Foco</span>
                            <div class="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-900">
                                <label class="engine-btn active cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all" id="lbl-grab-people">
                                    <input type="radio" name="grab-engine" value="mediapipe" checked class="hidden">Pessoas
                                </label>
                                <label class="engine-btn cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all text-slate-400 hover:text-slate-200" id="lbl-grab-objects">
                                    <input type="radio" name="grab-engine" value="imgly" class="hidden">Objetos
                                </label>
                            </div>
                            <button id="btn-run-grab" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-2" disabled>
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Separar Sujeito
                            </button>
                        </div>

                        <hr class="border-slate-900">

                        <div class="space-y-3">
                            <span class="tool-section-title">2. Modo do Fundo</span>
                            <div class="flex flex-col gap-1.5">
                                <button id="btn-bg-mode-inpainted" class="tool-btn active w-full py-2 px-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-left text-xs text-indigo-300 transition flex items-center gap-2" disabled>
                                    <i class="fa-solid fa-sparkles text-xs"></i> Preenchimento Inteligente
                                </button>
                                <button id="btn-bg-mode-original" class="tool-btn w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2" disabled>
                                    <i class="fa-solid fa-clone text-xs"></i> Duplicar (Sticker)
                                </button>
                                <button id="btn-bg-mode-transparent" class="tool-btn w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2" disabled>
                                    <i class="fa-solid fa-border-none text-xs"></i> Fundo Transparente
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-900">

                        <div class="text-[10px] text-slate-500 leading-relaxed space-y-1">
                            <span class="font-bold text-slate-400 block">Dicas:</span>
                            <ul class="list-disc pl-4 space-y-0.5">
                                <li>Clique e arraste para mover.</li>
                                <li>Scroll para alterar tamanho.</li>
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
        setupDragDrop(placeholder, uploader, (file) => handleFile(file));

        const lblP = document.getElementById('lbl-grab-people');
        const lblO = document.getElementById('lbl-grab-objects');
        document.querySelectorAll('input[name="grab-engine"]').forEach(r => {
            r.addEventListener('change', (e) => {
                const isP = e.target.value === 'mediapipe';
                lblP.className = `engine-btn ${isP ? 'active' : ''} cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all ${isP ? '' : 'text-slate-400 hover:text-slate-200'}`;
                lblO.className = `engine-btn ${!isP ? 'active' : ''} cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all ${!isP ? '' : 'text-slate-400 hover:text-slate-200'}`;
            });
        });

        document.getElementById('btn-run-grab').addEventListener('click', runGrabAI);
        document.getElementById('btn-grab-reset').addEventListener('click', resetSubjectPos);
        document.getElementById('btn-grab-download').addEventListener('click', downloadGrabImage);

        const btnI = document.getElementById('btn-bg-mode-inpainted');
        const btnO2 = document.getElementById('btn-bg-mode-original');
        const btnT = document.getElementById('btn-bg-mode-transparent');

        btnI.addEventListener('click', () => { state.bgFillMode = 'inpainted'; updateBgBtns(); renderWorkspace(); });
        btnO2.addEventListener('click', () => { state.bgFillMode = 'original'; updateBgBtns(); renderWorkspace(); });
        btnT.addEventListener('click', () => { state.bgFillMode = 'transparent'; updateBgBtns(); renderWorkspace(); });

        const canvas = document.getElementById('canvas-magic-grab');
        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
    }

    function updateBgBtns() {
        const btns = { inpainted: document.getElementById('btn-bg-mode-inpainted'), original: document.getElementById('btn-bg-mode-original'), transparent: document.getElementById('btn-bg-mode-transparent') };
        Object.entries(btns).forEach(([key, btn]) => {
            btn.className = key === state.bgFillMode
                ? "tool-btn active w-full py-2 px-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-left text-xs text-indigo-300 transition flex items-center gap-2"
                : "tool-btn w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/30 text-left text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-2";
        });
    }

    function handleFile(file) {
        state.currentFile = file;
        showLoader('Carregando...', 'Renderizando imagem.');
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.workspaceCanvas = document.getElementById('canvas-magic-grab');
                state.workspaceCtx = state.workspaceCanvas.getContext('2d', { willReadFrequently: true });
                state.workspaceCanvas.width = img.naturalWidth;
                state.workspaceCanvas.height = img.naturalHeight;
                fitCanvasInContainer(state.workspaceCanvas, document.getElementById('grab-workspace-container'));
                state.workspaceCanvas.classList.remove('hidden');
                document.getElementById('grab-placeholder').classList.add('hidden');
                document.getElementById('btn-run-grab').removeAttribute('disabled');
                ['btn-bg-mode-inpainted', 'btn-bg-mode-original', 'btn-bg-mode-transparent'].forEach(id => {
                    document.getElementById(id).removeAttribute('disabled');
                });
                state.foregroundImage = null; state.backgroundCanvas = null;
                hideLoader(); renderWorkspace();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderWorkspace() {
        if (!state.originalImage) return;
        const ctx = state.workspaceCtx;
        const w = state.workspaceCanvas.width;
        const h = state.workspaceCanvas.height;
        ctx.clearRect(0, 0, w, h);

        if (state.foregroundImage && state.bgFillMode === 'transparent') drawCheckerboard(ctx, w, h);
        else if (state.foregroundImage && state.bgFillMode === 'inpainted' && state.backgroundCanvas) ctx.drawImage(state.backgroundCanvas, 0, 0);
        else ctx.drawImage(state.originalImage, 0, 0);

        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const sw = state.subjectRect.w * state.subjectScale;
            const sh = state.subjectRect.h * state.subjectScale;
            ctx.save();
            ctx.translate(state.subjectPosition.x, state.subjectPosition.y);
            ctx.rotate(state.subjectRotation * Math.PI / 180);
            ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
            ctx.strokeStyle = 'rgba(124, 58, 237, 0.6)'; ctx.lineWidth = 2;
            ctx.strokeRect(-sw / 2 - 2, -sh / 2 - 2, sw + 4, sh + 4);
            ctx.restore();
        }
    }

    function runGrabAI() {
        const engine = document.querySelector('input[name="grab-engine"]:checked').value;
        if (engine === 'mediapipe') runMediaPipeGrab();
        else runImglyGrab();
    }

    async function runMediaPipeGrab() {
        showLoader('Separando...', 'MediaPipe AI processando...', 30);
        try {
            await window.ensureMediaPipe();
            const { ImageSegmenter, FilesetResolver } = window.MediaPipeTasksVision || mpTasksVision();

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
            );
            const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
                    delegate: 'GPU'
                },
                outputCategoryMask: true,
                outputConfidenceMasks: false,
                runningMode: 'IMAGE'
            });

            const w = state.originalImage.naturalWidth;
            const h = state.originalImage.naturalHeight;

            const result = imageSegmenter.segment(state.originalImage);
            const categoryMask = result.categoryMask;
            const maskData = categoryMask.getAsUint8Array();

            const mask = document.createElement('canvas');
            mask.width = w; mask.height = h;
            const mCtx = mask.getContext('2d', { willReadFrequently: true });
            const imgData = mCtx.createImageData(w, h);
            const d = imgData.data;
            for (let i = 0; i < maskData.length; i++) {
                const v = maskData[i] > 0 ? 255 : 0;
                d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; d[i * 4 + 3] = v;
            }
            mCtx.putImageData(imgData, 0, 0);

            categoryMask.close();
            imageSegmenter.close();

            applyIsolateSubject(mask);
        } catch (e) {
            console.error('MediaPipe tasks-vision error (grab):', e);
            hideLoader();
            showNotification("Falha no MediaPipe. A usar motor de Objectos como fallback.");
            runImglyGrab();
        }
    }

    async function runImglyGrab() {
        showLoader('Separando...', 'Inicializando IMG.LY...', 10);
        try {
            await window.loadImglyEngine();
        } catch (e) {
            hideLoader(); showNotification("IMG.LY indisponível. Tente novamente mais tarde.");
            return;
        }
        showLoader('Separando...', 'IMG.LY processando...', 15);
        try {
            const blob = await window.imglyRemoveBackground(state.currentFile, {
                model: 'isnet', device: 'cpu', proxyToWorker: true,
                progress: (key, current, total) => {
                    const pct = Math.round((current / total) * 80) + 15;
                    showLoader('Separando...', `IMG.LY: ${Math.round((current/total)*100)}%`, pct);
                }
            });
            if (!blob) throw new Error('Nenhum resultado retornado pelo motor IMG.LY');

            const url = URL.createObjectURL(blob);
            const resImg = new Image();
            resImg.onload = () => {
                const w = state.originalImage.naturalWidth;
                const h = state.originalImage.naturalHeight;
                const mask = document.createElement('canvas');
                mask.width = w; mask.height = h;
                const mCtx = mask.getContext('2d', { willReadFrequently: true });
                mCtx.drawImage(resImg, 0, 0);
                const imgData = mCtx.getImageData(0, 0, w, h);
                const d = imgData.data;
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = d[i+3] > 10 ? 255 : 0;
                }
                mCtx.putImageData(imgData, 0, 0);
                URL.revokeObjectURL(url);
                applyIsolateSubject(mask);
            };
            resImg.onerror = (err) => {
                hideLoader();
                URL.revokeObjectURL(url);
                showNotification('Falha ao processar a máscara de objeto. Tente novamente com outra imagem.');
            };
            resImg.src = url;
        } catch (e) {
            hideLoader();
            showNotification("Falha ao isolar objeto. Verifique se a imagem contém um único objeto reconhecível.");
        }
    }

    function getCroppedSubject(img, maskCanvas) {
        const w = img.naturalWidth, h = img.naturalHeight;
        const mD = maskCanvas.getContext('2d').getImageData(0, 0, w, h).data;
        let minX = w, maxX = 0, minY = h, maxY = 0, found = false;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (mD[(y * w + x) * 4 + 3] > 10) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                found = true;
            }
        }
        if (!found) return { canvas: img, rect: { x: 0, y: 0, w, h } };
        minX = Math.max(0, minX - 3); minY = Math.max(0, minY - 3);
        maxX = Math.min(w - 1, maxX + 3); maxY = Math.min(h - 1, maxY + 3);
        const cw = maxX - minX + 1, ch = maxY - minY + 1;
        const cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
        const cCtx = cc.getContext('2d');
        cCtx.drawImage(img, minX, minY, cw, ch, 0, 0, cw, ch);
        cCtx.globalCompositeOperation = 'destination-in';
        cCtx.drawImage(maskCanvas, minX, minY, cw, ch, 0, 0, cw, ch);
        return { canvas: cc, rect: { x: minX, y: minY, w: cw, h: ch } };
    }

    function applyIsolateSubject(maskCanvas) {
        const cropped = getCroppedSubject(state.originalImage, maskCanvas);
        state.foregroundImage = cropped.canvas;
        state.subjectRect = { w: cropped.rect.w, h: cropped.rect.h };
        state.subjectPosition = { x: cropped.rect.x + cropped.rect.w / 2, y: cropped.rect.y + cropped.rect.h / 2 };
        state.originalSubjectPos = { ...state.subjectPosition };
        state.subjectScale = 1.0; state.subjectRotation = 0;

        showLoader('Preenchimento...', 'Reconstruindo fundo...', 60);
        setTimeout(() => {
            const w = state.originalImage.naturalWidth;
            const h = state.originalImage.naturalHeight;
            const bgC = document.createElement('canvas'); bgC.width = w; bgC.height = h;
            const bgCtx = bgC.getContext('2d', { willReadFrequently: true });
            bgCtx.drawImage(state.originalImage, 0, 0);
            performLocalInpaint(bgC, maskCanvas);
            state.backgroundCanvas = bgC;

            ['btn-grab-reset', 'btn-grab-download', 'btn-bg-mode-inpainted', 'btn-bg-mode-original', 'btn-bg-mode-transparent'].forEach(id => {
                document.getElementById(id).removeAttribute('disabled');
            });
            hideLoader(); renderWorkspace();
            showNotification("Sujeito destacado! Arraste para mover.");
        }, 150);
    }

    function performLocalInpaint(canvas, mask) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width, h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const pixels = imgData.data;
        const mPx = mask.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
        const maskCoords = [], borderCoords = [];

        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            if (mPx[idx + 3] > 128) {
                maskCoords.push({ x, y });
                const n = [(y*w+(x-1))*4, (y*w+(x+1))*4, ((y-1)*w+x)*4, ((y+1)*w+x)*4];
                if (n.some(i => mPx[i + 3] <= 128)) borderCoords.push({ x, y });
            }
        }
        if (maskCoords.length === 0) return;

        const step = Math.max(1, Math.floor(maskCoords.length / 5000));
        for (let i = 0; i < maskCoords.length; i += step) {
            const { x: px, y: py } = maskCoords[i];
            let bestX = px, bestY = py, minDist = Infinity;
            const r = 45;
            for (let sy = Math.max(1, py - r); sy <= Math.min(h - 2, py + r); sy += 3) {
                for (let sx = Math.max(1, px - r); sx <= Math.min(w - 2, px + r); sx += 3) {
                    if (mPx[(sy * w + sx) * 4 + 3] === 0) {
                        const d = (sx - px) ** 2 + (sy - py) ** 2;
                        if (d < minDist) { minDist = d; bestX = sx; bestY = sy; }
                    }
                }
            }
            const tI = (py * w + px) * 4, sI = (bestY * w + bestX) * 4;
            pixels[tI] = pixels[sI]; pixels[tI+1] = pixels[sI+1]; pixels[tI+2] = pixels[sI+2]; pixels[tI+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        ctx.filter = 'blur(6px)';
        borderCoords.forEach(c => {
            const idx = (c.y * w + c.x) * 4;
            ctx.fillStyle = `rgb(${pixels[idx]},${pixels[idx+1]},${pixels[idx+2]})`;
            ctx.fillRect(c.x - 3, c.y - 3, 6, 6);
        });
        ctx.filter = 'none';
    }

    function onDown(e) {
        if (!state.foregroundImage) return;
        const coords = canvasToImageCoords(state.workspaceCanvas, e.clientX, e.clientY);
        const sw = state.subjectRect.w * state.subjectScale;
        const sh = state.subjectRect.h * state.subjectScale;
        const l = state.subjectPosition.x - sw / 2, t = state.subjectPosition.y - sh / 2;
        if (coords.x >= l && coords.x <= l + sw && coords.y >= t && coords.y <= t + sh) {
            state.isInteracting = true;
            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.workspaceCanvas.style.cursor = 'grabbing';
        }
    }

    function onMove(e) {
        if (!state.isInteracting) return;
        const rect = state.workspaceCanvas.getBoundingClientRect();
        const sx = state.workspaceCanvas.width / rect.width;
        const sy = state.workspaceCanvas.height / rect.height;
        state.subjectPosition.x += (e.clientX - state.lastMousePos.x) * sx;
        state.subjectPosition.y += (e.clientY - state.lastMousePos.y) * sy;
        state.lastMousePos = { x: e.clientX, y: e.clientY };
        renderWorkspace();
    }

    function onUp() {
        if (state.isInteracting) {
            state.isInteracting = false;
            state.workspaceCanvas.style.cursor = 'grab';
        }
    }

    function onWheel(e) {
        if (!state.foregroundImage) return;
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        state.subjectScale = Math.max(0.1, Math.min(5.0, state.subjectScale * f));
        renderWorkspace();
    }

    function resetSubjectPos() {
        if (!state.foregroundImage) return;
        state.subjectScale = 1.0; state.subjectRotation = 0;
        state.subjectPosition = { ...state.originalSubjectPos };
        renderWorkspace();
    }

    function downloadGrabImage() {
        if (!state.workspaceCanvas) return;
        const c = document.createElement('canvas');
        c.width = state.workspaceCanvas.width; c.height = state.workspaceCanvas.height;
        const ctx = c.getContext('2d');
        if (state.foregroundImage && state.bgFillMode === 'transparent') { /* keep transparent */ }
        else if (state.foregroundImage && state.bgFillMode === 'inpainted' && state.backgroundCanvas) ctx.drawImage(state.backgroundCanvas, 0, 0);
        else ctx.drawImage(state.originalImage, 0, 0);
        if (state.foregroundImage) {
            const img = state.foregroundImage;
            const sw = state.subjectRect.w * state.subjectScale;
            const sh = state.subjectRect.h * state.subjectScale;
            ctx.save(); ctx.translate(state.subjectPosition.x, state.subjectPosition.y);
            ctx.rotate(state.subjectRotation * Math.PI / 180);
            ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
            ctx.restore();
        }
        downloadCanvasAsPNG(c, `magicgrab_${Date.now()}.png`);
    }

    function showLoader(t, d, p = 0) {
        document.getElementById('grab-loader-title').innerText = t;
        document.getElementById('grab-loader-desc').innerText = d;
        document.getElementById('grab-loader-progress').style.width = `${p}%`;
        document.getElementById('grab-loader').classList.remove('hidden');
    }
    function hideLoader() { document.getElementById('grab-loader').classList.add('hidden'); }
})();

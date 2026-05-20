(function() {
    let state = {
        canvasWidth: 1080,
        canvasHeight: 1080,
        elements: [],
        selectedId: null,
        isDragging: false,
        isResizing: false,
        dragStart: { x: 0, y: 0 },
        elementStart: { x: 0, y: 0, w: 0, h: 0 },
        zoom: 1.0,
        panX: 0,
        panY: 0,
        nextId: 1,
        bgMode: 'solid',
        bgColor: '#0f172a',
        bgGradient: ['#4f46e5', '#c084fc'],
        bgImage: null,
        activeTab: 'elements'
    };

    const TEMPLATES = [
        { name: 'Instagram Post', w: 1080, h: 1080, bg: '#0f172a', elements: [] },
        { name: 'Story', w: 1080, h: 1920, bg: '#1a1a2e', elements: [] },
        { name: 'YouTube Thumb', w: 1280, h: 720, bg: '#000000', elements: [] },
        { name: 'Facebook Cover', w: 820, h: 312, bg: '#1e293b', elements: [] },
        { name: 'A4 Retrato', w: 794, h: 1123, bg: '#ffffff', elements: [] },
        { name: 'Banner 1200x628', w: 1200, h: 628, bg: '#0f172a', elements: [] }
    ];

    window.initCanvaEditor = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-3">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-object-group text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Canva Editor</h3>
                            <p class="text-[10px] text-slate-400">Crie designs com templates, textos e formas</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <select id="template-select" class="px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 focus:outline-none focus:border-accent-500">
                            <option value="">Template...</option>
                            ${TEMPLATES.map((t, i) => `<option value="${i}">${t.name} (${t.w}x${t.h})</option>`).join('')}
                        </select>
                        <span id="canvas-size-badge" class="text-[10px] text-slate-400 font-mono">1080x1080</span>
                        <button id="btn-canva-download" class="px-4 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-accent-500/20">
                            <i class="fa-solid fa-download"></i> Exportar PNG
                        </button>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-3 min-h-[400px] overflow-hidden">
                    <!-- SIDEBAR -->
                    <div class="lg:col-span-1 control-sidebar overflow-y-auto no-scrollbar">
                        <!-- TABS -->
                        <div class="flex border-b border-slate-900 mb-3">
                            <button id="tab-elements" class="flex-1 py-2 text-[10px] font-bold text-indigo-300 border-b-2 border-indigo-500 transition" onclick="canvaSetTab('elements')">Elementos</button>
                            <button id="tab-layers" class="flex-1 py-2 text-[10px] font-bold text-slate-400 border-b-2 border-transparent transition" onclick="canvaSetTab('layers')">Camadas</button>
                            <button id="tab-background" class="flex-1 py-2 text-[10px] font-bold text-slate-400 border-b-2 border-transparent transition" onclick="canvaSetTab('background')">Fundo</button>
                        </div>

                        <!-- ELEMENTS TAB -->
                        <div id="canva-panel-elements" class="space-y-3">
                            <span class="tool-section-title">Adicionar</span>
                            <button onclick="canvaAddText()" class="w-full py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-xs text-slate-300 transition flex items-center gap-2 justify-center">
                                <i class="fa-solid fa-font"></i> Texto
                            </button>
                            <button onclick="canvaAddImage()" class="w-full py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-xs text-slate-300 transition flex items-center gap-2 justify-center">
                                <i class="fa-solid fa-image"></i> Imagem
                            </button>
                            <div class="space-y-2">
                                <span class="tool-section-title">Formas</span>
                                <div class="grid grid-cols-4 gap-1.5">
                                    <button onclick="canvaAddShape('rect')" class="p-2 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-slate-400 hover:text-white transition"><i class="fa-solid fa-square"></i></button>
                                    <button onclick="canvaAddShape('circle')" class="p-2 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-slate-400 hover:text-white transition"><i class="fa-solid fa-circle"></i></button>
                                    <button onclick="canvaAddShape('triangle')" class="p-2 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-slate-400 hover:text-white transition"><i class="fa-solid fa-play fa-rotate-270"></i></button>
                                    <button onclick="canvaAddShape('line')" class="p-2 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-slate-400 hover:text-white transition"><i class="fa-solid fa-minus"></i></button>
                                </div>
                            </div>
                        </div>

                        <!-- LAYERS TAB -->
                        <div id="canva-panel-layers" class="hidden space-y-2">
                            <span class="tool-section-title">Camadas</span>
                            <div id="layers-list" class="space-y-1 max-h-[300px] overflow-y-auto no-scrollbar"></div>
                        </div>

                        <!-- BACKGROUND TAB -->
                        <div id="canva-panel-background" class="hidden space-y-3">
                            <span class="tool-section-title">Tipo de Fundo</span>
                            <div class="grid grid-cols-3 gap-1.5">
                                <button onclick="canvaSetBgMode('solid')" id="bg-btn-solid" class="tool-btn active py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 text-[10px] text-indigo-300 font-bold">Cor</button>
                                <button onclick="canvaSetBgMode('gradient')" id="bg-btn-gradient" class="tool-btn py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-[10px] text-slate-400 font-bold">Gradiente</button>
                                <button onclick="canvaSetBgMode('image')" id="bg-btn-image" class="tool-btn py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-[10px] text-slate-400 font-bold">Imagem</button>
                            </div>
                            <div id="bg-panel-solid" class="space-y-2">
                                <input type="color" id="bg-color-input" value="#0f172a" class="w-full h-8 rounded-lg border border-slate-800 cursor-pointer bg-transparent" onchange="canvaSetBgColor(this.value)">
                                <div class="flex flex-wrap gap-1.5">
                                    ${['#0f172a','#1e293b','#ffffff','#000000','#4f46e5','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1'].map(c =>
                                        `<button onclick="canvaSetBgColor('${c}')" class="h-6 w-6 rounded-full border border-slate-700" style="background:${c}"></button>`
                                    ).join('')}
                                </div>
                            </div>
                            <div id="bg-panel-gradient" class="hidden space-y-2">
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="text-[9px] text-slate-500 block">Cor 1</label>
                                        <input type="color" id="bg-grad1" value="#4f46e5" class="w-full h-7 rounded border border-slate-800 cursor-pointer bg-transparent" onchange="canvaSetBgGradient()">
                                    </div>
                                    <div>
                                        <label class="text-[9px] text-slate-500 block">Cor 2</label>
                                        <input type="color" id="bg-grad2" value="#c084fc" class="w-full h-7 rounded border border-slate-800 cursor-pointer bg-transparent" onchange="canvaSetBgGradient()">
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-1.5">
                                    ${[['#4f46e5','#c084fc'],['#111827','#374151'],['#064e3b','#10b981'],['#f59e0b','#ef4444']].map(([a,b]) =>
                                        `<button onclick="canvaSetGradientPreset('${a}','${b}')" class="h-8 rounded-lg border border-slate-800" style="background:linear-gradient(to right,${a},${b})"></button>`
                                    ).join('')}
                                </div>
                            </div>
                            <div id="bg-panel-image" class="hidden space-y-2">
                                <button onclick="document.getElementById('canva-bg-file').click()" class="w-full py-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-xs text-slate-300 transition">
                                    <i class="fa-solid fa-upload mr-1"></i> Carregar Imagem
                                </button>
                                <input type="file" id="canva-bg-file" class="hidden" accept="image/*" onchange="canvaSetBgImage(event)">
                            </div>
                        </div>

                        <!-- PROPERTIES (when selected) -->
                        <div id="canva-properties" class="hidden mt-3 pt-3 border-t border-slate-900 space-y-3">
                            <span class="tool-section-title">Propriedades</span>
                            <div class="space-y-2">
                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">X</label>
                                        <input type="number" id="prop-x" class="w-full px-2 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-white" onchange="canvaUpdateProp()">
                                    </div>
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">Y</label>
                                        <input type="number" id="prop-y" class="w-full px-2 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-white" onchange="canvaUpdateProp()">
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">W</label>
                                        <input type="number" id="prop-w" class="w-full px-2 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-white" onchange="canvaUpdateProp()">
                                    </div>
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">H</label>
                                        <input type="number" id="prop-h" class="w-full px-2 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-white" onchange="canvaUpdateProp()">
                                    </div>
                                </div>
                            </div>
                            <div id="prop-text-panel" class="hidden space-y-2">
                                <textarea id="prop-text" rows="2" class="w-full px-2 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-white resize-none" oninput="canvaUpdateText()"></textarea>
                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">Tamanho</label>
                                        <input type="number" id="prop-font-size" min="8" max="200" class="w-full px-2 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-white" onchange="canvaUpdateText()">
                                    </div>
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">Cor</label>
                                        <input type="color" id="prop-font-color" class="w-full h-7 rounded border border-slate-800 bg-transparent cursor-pointer" onchange="canvaUpdateText()">
                                    </div>
                                </div>
                                <div class="flex gap-1.5">
                                    <button id="prop-bold" onclick="canvaToggleBold()" class="px-2 py-1 rounded border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition font-bold">B</button>
                                    <button id="prop-italic" onclick="canvaToggleItalic()" class="px-2 py-1 rounded border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition italic">I</button>
                                    <select id="prop-align" onchange="canvaUpdateText()" class="px-1 py-1 text-xs rounded border border-slate-800 bg-slate-950 text-slate-300">
                                        <option value="left">Esq</option>
                                        <option value="center">Centro</option>
                                        <option value="right">Dir</option>
                                    </select>
                                </div>
                            </div>
                            <div id="prop-shape-panel" class="hidden space-y-2">
                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">Cor</label>
                                        <input type="color" id="prop-fill" class="w-full h-7 rounded border border-slate-800 bg-transparent cursor-pointer" onchange="canvaUpdateShape()">
                                    </div>
                                    <div class="flex-1">
                                        <label class="text-[9px] text-slate-500">Borda</label>
                                        <input type="color" id="prop-stroke" class="w-full h-7 rounded border border-slate-800 bg-transparent cursor-pointer" onchange="canvaUpdateShape()">
                                    </div>
                                </div>
                            </div>
                            <button onclick="canvaDeleteSelected()" class="w-full py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-xs text-red-400 hover:bg-red-900/30 transition">
                                <i class="fa-solid fa-trash mr-1"></i> Remover
                            </button>
                        </div>
                    </div>

                    <!-- CANVAS AREA -->
                    <div class="lg:col-span-4 canvas-workspace" id="canva-workspace-container">
                        <canvas id="canvas-canva-editor" class="rounded-xl z-0"></canvas>
                        <input type="file" id="canva-image-file" class="hidden" accept="image/*" onchange="canvaLoadImageElement(event)">
                    </div>
                </div>
            </div>
        `;
        setupCanvaListeners();
        renderCanvas();
    };

    function setupCanvaListeners() {
        document.getElementById('template-select').addEventListener('change', (e) => {
            if (e.target.value === '') return;
            const t = TEMPLATES[parseInt(e.target.value)];
            state.canvasWidth = t.w; state.canvasHeight = t.h;
            state.bgColor = t.bg; state.bgMode = 'solid'; state.bgImage = null;
            state.elements = []; state.selectedId = null;
            document.getElementById('canvas-size-badge').innerText = `${t.w}x${t.h}`;
            renderCanvas();
            showNotification(`Template "${t.name}" aplicado!`);
        });

        document.getElementById('btn-canva-download').addEventListener('click', exportPNG);

        const canvas = document.getElementById('canvas-canva-editor');
        canvas.addEventListener('mousedown', onCanvasDown);
        canvas.addEventListener('mousemove', onCanvasMove);
        canvas.addEventListener('mouseup', onCanvasUp);
        canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    }

    window.canvaSetTab = function(tab) {
        state.activeTab = tab;
        ['elements', 'layers', 'background'].forEach(t => {
            document.getElementById(`tab-${t}`).className = t === tab
                ? "flex-1 py-2 text-[10px] font-bold text-indigo-300 border-b-2 border-indigo-500 transition"
                : "flex-1 py-2 text-[10px] font-bold text-slate-400 border-b-2 border-transparent transition";
            document.getElementById(`canva-panel-${t}`).classList.toggle('hidden', t !== tab);
        });
        if (tab === 'layers') renderLayersList();
    };

    window.canvaAddText = function() {
        state.elements.push({
            id: state.nextId++, type: 'text', x: 100, y: 100, w: 300, h: 60,
            text: 'Seu Texto Aqui', fontSize: 36, fontColor: '#ffffff',
            bold: false, italic: false, align: 'center', fontFamily: 'Outfit'
        });
        state.selectedId = state.elements[state.elements.length - 1].id;
        showProperties(); renderCanvas();
    };

    window.canvaAddImage = function() {
        document.getElementById('canva-image-file').click();
    };

    window.canvaLoadImageElement = function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(400 / img.width, 400 / img.height, 1.0);
                state.elements.push({
                    id: state.nextId++, type: 'image', x: 100, y: 100,
                    w: img.width * scale, h: img.height * scale, imageEl: img
                });
                state.selectedId = state.elements[state.elements.length - 1].id;
                showProperties(); renderCanvas();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.canvaAddShape = function(shape) {
        const base = { id: state.nextId++, type: 'shape', shape, x: 200, y: 200, w: 150, h: 150, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 0 };
        if (shape === 'line') { base.w = 300; base.h = 4; base.y = 300; }
        state.elements.push(base);
        state.selectedId = state.elements[state.elements.length - 1].id;
        showProperties(); renderCanvas();
    };

    window.canvaSetBgMode = function(mode) {
        state.bgMode = mode;
        ['solid', 'gradient', 'image'].forEach(m => {
            document.getElementById(`bg-btn-${m}`).className = m === mode
                ? "tool-btn active py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 text-[10px] text-indigo-300 font-bold"
                : "tool-btn py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-[10px] text-slate-400 font-bold";
            document.getElementById(`bg-panel-${m}`).classList.toggle('hidden', m !== mode);
        });
        renderCanvas();
    };

    window.canvaSetBgColor = function(c) { state.bgColor = c; document.getElementById('bg-color-input').value = c; renderCanvas(); };

    window.canvaSetBgGradient = function() {
        state.bgGradient = [document.getElementById('bg-grad1').value, document.getElementById('bg-grad2').value];
        renderCanvas();
    };

    window.canvaSetGradientPreset = function(a, b) {
        state.bgGradient = [a, b];
        document.getElementById('bg-grad1').value = a;
        document.getElementById('bg-grad2').value = b;
        renderCanvas();
    };

    window.canvaSetBgImage = function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => { state.bgImage = img; renderCanvas(); };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.canvaUpdateProp = function() {
        const el = getSelected(); if (!el) return;
        el.x = parseFloat(document.getElementById('prop-x').value) || 0;
        el.y = parseFloat(document.getElementById('prop-y').value) || 0;
        el.w = Math.max(10, parseFloat(document.getElementById('prop-w').value) || 10);
        el.h = Math.max(10, parseFloat(document.getElementById('prop-h').value) || 10);
        renderCanvas();
    };

    window.canvaUpdateText = function() {
        const el = getSelected(); if (!el || el.type !== 'text') return;
        el.text = document.getElementById('prop-text').value;
        el.fontSize = parseInt(document.getElementById('prop-font-size').value) || 24;
        el.fontColor = document.getElementById('prop-font-color').value;
        el.align = document.getElementById('prop-align').value;
        renderCanvas();
    };

    window.canvaToggleBold = function() {
        const el = getSelected(); if (!el || el.type !== 'text') return;
        el.bold = !el.bold;
        document.getElementById('prop-bold').classList.toggle('bg-indigo-950/20', el.bold);
        renderCanvas();
    };

    window.canvaToggleItalic = function() {
        const el = getSelected(); if (!el || el.type !== 'text') return;
        el.italic = !el.italic;
        document.getElementById('prop-italic').classList.toggle('bg-indigo-950/20', el.italic);
        renderCanvas();
    };

    window.canvaUpdateShape = function() {
        const el = getSelected(); if (!el || el.type !== 'shape') return;
        el.fill = document.getElementById('prop-fill').value;
        el.stroke = document.getElementById('prop-stroke').value;
        renderCanvas();
    };

    window.canvaDeleteSelected = function() {
        if (state.selectedId === null) return;
        state.elements = state.elements.filter(e => e.id !== state.selectedId);
        state.selectedId = null;
        document.getElementById('canva-properties').classList.add('hidden');
        renderCanvas();
    };

    function getSelected() { return state.elements.find(e => e.id === state.selectedId); }

    function showProperties() {
        const el = getSelected();
        if (!el) { document.getElementById('canva-properties').classList.add('hidden'); return; }
        document.getElementById('canva-properties').classList.remove('hidden');
        document.getElementById('prop-x').value = Math.round(el.x);
        document.getElementById('prop-y').value = Math.round(el.y);
        document.getElementById('prop-w').value = Math.round(el.w);
        document.getElementById('prop-h').value = Math.round(el.h);

        document.getElementById('prop-text-panel').classList.toggle('hidden', el.type !== 'text');
        document.getElementById('prop-shape-panel').classList.toggle('hidden', el.type !== 'shape');

        if (el.type === 'text') {
            document.getElementById('prop-text').value = el.text;
            document.getElementById('prop-font-size').value = el.fontSize;
            document.getElementById('prop-font-color').value = el.fontColor;
            document.getElementById('prop-align').value = el.align;
        }
        if (el.type === 'shape') {
            document.getElementById('prop-fill').value = el.fill;
            document.getElementById('prop-stroke').value = el.stroke;
        }
    }

    function renderLayersList() {
        const list = document.getElementById('layers-list');
        list.innerHTML = '';
        [...state.elements].reverse().forEach(el => {
            const isSelected = el.id === state.selectedId;
            const icon = el.type === 'text' ? 'fa-font' : el.type === 'image' ? 'fa-image' : 'fa-shapes';
            const label = el.type === 'text' ? el.text.slice(0, 15) : el.type === 'image' ? 'Imagem' : el.shape;
            const div = document.createElement('div');
            div.className = `flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition text-xs ${isSelected ? 'bg-indigo-950/30 border border-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:bg-slate-900/40'}`;
            div.innerHTML = `<i class="fa-solid ${icon} text-[10px]"></i><span class="truncate flex-1">${label}</span>`;
            div.onclick = () => { state.selectedId = el.id; showProperties(); renderCanvas(); };
            list.appendChild(div);
        });
        if (state.elements.length === 0) list.innerHTML = '<p class="text-[10px] text-slate-500 text-center py-4">Nenhum elemento</p>';
    }

    function renderCanvas() {
        const canvas = document.getElementById('canvas-canva-editor');
        if (!canvas) return;
        canvas.width = state.canvasWidth;
        canvas.height = state.canvasHeight;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;

        // Background
        if (state.bgMode === 'solid') {
            ctx.fillStyle = state.bgColor; ctx.fillRect(0, 0, w, h);
        } else if (state.bgMode === 'gradient') {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, state.bgGradient[0]);
            grad.addColorStop(1, state.bgGradient[1]);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        } else if (state.bgMode === 'image' && state.bgImage) {
            ctx.drawImage(state.bgImage, 0, 0, w, h);
        } else {
            drawCheckerboard(ctx, w, h);
        }

        // Elements
        state.elements.forEach(el => {
            ctx.save();
            if (el.type === 'shape') {
                ctx.fillStyle = el.fill;
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth || 0;
                if (el.shape === 'rect') { ctx.fillRect(el.x, el.y, el.w, el.h); if (el.strokeWidth) ctx.strokeRect(el.x, el.y, el.w, el.h); }
                else if (el.shape === 'circle') { ctx.beginPath(); ctx.ellipse(el.x + el.w/2, el.y + el.h/2, el.w/2, el.h/2, 0, 0, Math.PI * 2); ctx.fill(); if (el.strokeWidth) ctx.stroke(); }
                else if (el.shape === 'triangle') { ctx.beginPath(); ctx.moveTo(el.x + el.w/2, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.lineTo(el.x, el.y + el.h); ctx.closePath(); ctx.fill(); if (el.strokeWidth) ctx.stroke(); }
                else if (el.shape === 'line') { ctx.strokeStyle = el.fill; ctx.lineWidth = Math.max(2, el.h); ctx.beginPath(); ctx.moveTo(el.x, el.y + el.h/2); ctx.lineTo(el.x + el.w, el.y + el.h/2); ctx.stroke(); }
            } else if (el.type === 'text') {
                const weight = el.bold ? 'bold' : 'normal';
                const style = el.italic ? 'italic' : 'normal';
                ctx.font = `${style} ${weight} ${el.fontSize}px ${el.fontFamily || 'Outfit'}, sans-serif`;
                ctx.fillStyle = el.fontColor;
                ctx.textAlign = el.align || 'left';
                ctx.textBaseline = 'top';
                const lines = el.text.split('\n');
                lines.forEach((line, i) => {
                    ctx.fillText(line, el.x, el.y + i * (el.fontSize * 1.2));
                });
            } else if (el.type === 'image' && el.imageEl) {
                ctx.drawImage(el.imageEl, el.x, el.y, el.w, el.h);
            }
            ctx.restore();
        });

        // Selection handles
        const sel = getSelected();
        if (sel) {
            ctx.save();
            ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.strokeRect(sel.x - 1, sel.y - 1, sel.w + 2, sel.h + 2);
            ctx.setLineDash([]);
            // Corner handles
            const hs = 6;
            [[sel.x, sel.y], [sel.x + sel.w, sel.y], [sel.x, sel.y + sel.h], [sel.x + sel.w, sel.y + sel.h]].forEach(([hx, hy]) => {
                ctx.fillStyle = '#7c3aed'; ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
                ctx.fillStyle = '#fff'; ctx.fillRect(hx - hs/4, hy - hs/4, hs/2, hs/2);
            });
            ctx.restore();
        }

        // Fit in container
        fitCanvasInContainer(canvas, document.getElementById('canva-workspace-container'));

        if (state.activeTab === 'layers') renderLayersList();
    }

    function onCanvasDown(e) {
        const coords = canvasToImageCoords(document.getElementById('canvas-canva-editor'), e.clientX, e.clientY);
        const mx = coords.x, my = coords.y;

        // Check resize handles first
        const sel = getSelected();
        if (sel) {
            const corners = [
                { x: sel.x, y: sel.y, cx: 'left', cy: 'top' },
                { x: sel.x + sel.w, y: sel.y, cx: 'right', cy: 'top' },
                { x: sel.x, y: sel.y + sel.h, cx: 'left', cy: 'bottom' },
                { x: sel.x + sel.w, y: sel.y + sel.h, cx: 'right', cy: 'bottom' }
            ];
            for (const c of corners) {
                if (Math.abs(mx - c.x) < 10 && Math.abs(my - c.y) < 10) {
                    state.isResizing = true;
                    state.resizeCorner = c;
                    state.elementStart = { x: sel.x, y: sel.y, w: sel.w, h: sel.h };
                    state.dragStart = { x: mx, y: my };
                    return;
                }
            }
        }

        // Check elements (top to bottom)
        let hit = null;
        for (let i = state.elements.length - 1; i >= 0; i--) {
            const el = state.elements[i];
            if (mx >= el.x && mx <= el.x + el.w && my >= el.y && my <= el.y + el.h) {
                hit = el; break;
            }
        }

        if (hit) {
            state.selectedId = hit.id;
            state.isDragging = true;
            state.elementStart = { x: hit.x, y: hit.y, w: hit.w, h: hit.h };
            state.dragStart = { x: mx, y: my };
        } else {
            state.selectedId = null;
            document.getElementById('canva-properties').classList.add('hidden');
        }
        showProperties(); renderCanvas();
    }

    function onCanvasMove(e) {
        const coords = canvasToImageCoords(document.getElementById('canvas-canva-editor'), e.clientX, e.clientY);
        const mx = coords.x, my = coords.y;
        const sel = getSelected();

        if (state.isResizing && sel) {
            const dx = mx - state.dragStart.x;
            const dy = my - state.dragStart.y;
            const s = state.elementStart;
            const c = state.resizeCorner;

            if (c.cx === 'right') { sel.w = Math.max(20, s.w + dx); }
            else { sel.x = s.x + dx; sel.w = Math.max(20, s.w - dx); }
            if (c.cy === 'bottom') { sel.h = Math.max(20, s.h + dy); }
            else { sel.y = s.y + dy; sel.h = Math.max(20, s.h - dy); }
            showProperties(); renderCanvas();
        } else if (state.isDragging && sel) {
            sel.x = state.elementStart.x + (mx - state.dragStart.x);
            sel.y = state.elementStart.y + (my - state.dragStart.y);
            showProperties(); renderCanvas();
        }
    }

    function onCanvasUp() {
        state.isDragging = false; state.isResizing = false;
    }

    function onCanvasWheel(e) {
        e.preventDefault();
        const canvas = document.getElementById('canvas-canva-editor');
        const container = document.getElementById('canva-workspace-container');
        const baseScale = Math.min((container.clientWidth - 32) / canvas.width, (container.clientHeight - 32) / canvas.height, 1.0);
        state.zoom = Math.max(0.2, Math.min(5.0, state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        const s = baseScale * state.zoom;
        const ox = (container.clientWidth - canvas.width * s) / 2;
        const oy = (container.clientHeight - canvas.height * s) / 2;
        canvas.style.transform = `translate(${ox}px, ${oy}px) scale(${s})`;
    }

    function exportPNG() {
        const c = document.createElement('canvas');
        c.width = state.canvasWidth; c.height = state.canvasHeight;
        const ctx = c.getContext('2d');
        const orig = document.getElementById('canvas-canva-editor');
        ctx.drawImage(orig, 0, 0);
        downloadCanvasAsPNG(c, `canva_design_${Date.now()}.png`);
        showNotification("Design exportado em PNG!");
    }
})();

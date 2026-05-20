(function() {
    let state = { originalImage: null, extractedColors: [] };

    window.initColorPalette = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex-grow flex flex-col h-full p-4 space-y-6">
                <div class="text-center space-y-1">
                    <h3 class="text-lg font-display font-bold text-white">Extrator de Paleta de Cores</h3>
                    <p class="text-[11px] text-slate-400">Envie uma imagem para descobrir suas cores dominantes.</p>
                </div>

                <!-- AD UNIT: In-tool -->
                <div class="ad-slot ad-infeed w-full h-[60px] bg-slate-900/30 border border-slate-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden" role="complementary" aria-label="Publicidade">
                    <span class="text-[9px] text-slate-600 uppercase tracking-widest absolute top-1 left-3">Anúncio</span>
                    <div class="text-xs text-slate-500 font-medium"><i class="fa-solid fa-rectangle-ad mr-1.5"></i> Ad Unit</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
                    <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col items-center justify-center relative min-h-[220px]">
                        <div id="upload-zone-palette" class="w-full h-full border-2 border-dashed border-slate-800 hover:border-accent-500 bg-slate-950/20 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition duration-300">
                            <input type="file" id="file-input-palette" accept="image/*" class="hidden">
                            <i class="fa-solid fa-palette text-3xl text-accent-400 mb-3"></i>
                            <span class="text-xs font-semibold text-white">Carregue sua Imagem</span>
                            <p class="text-[9px] text-slate-500 mt-1">Clique para procurar</p>
                        </div>
                        <div id="preview-zone-palette" class="hidden w-full h-full flex flex-col items-center justify-between space-y-3">
                            <div class="h-40 flex items-center justify-center overflow-hidden rounded-lg border border-slate-900 p-1 bg-slate-950/40 w-full">
                                <img id="preview-img-palette" class="max-h-full object-contain">
                            </div>
                            <button id="btn-reset-palette" class="py-1 px-3 border border-slate-800 hover:bg-slate-900/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition">Alterar Imagem</button>
                        </div>
                    </div>

                    <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
                        <div class="space-y-4">
                            <span class="text-xs font-bold text-white block">Paleta Extraída</span>
                            <div id="palette-colors-grid" class="flex flex-col gap-2">
                                <div class="text-center py-10 text-slate-500 text-[10px]">Envie uma imagem para ver as cores dominantes.</div>
                            </div>
                        </div>
                        <button id="btn-copy-palette" disabled class="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="fa-solid fa-copy"></i> Copiar Todas as Cores
                        </button>
                    </div>
                </div>
            </div>
        `;
        setupPaletteListeners();
    };

    function setupPaletteListeners() {
        const uploader = document.getElementById('file-input-palette');
        const zone = document.getElementById('upload-zone-palette');
        setupDragDrop(zone, uploader, (file) => handlePaletteFile(file));
        uploader.addEventListener('change', (e) => { if (e.target.files[0]) handlePaletteFile(e.target.files[0]); });

        document.getElementById('btn-reset-palette').addEventListener('click', resetPalette);
        document.getElementById('btn-copy-palette').addEventListener('click', copyFullPalette);
    }

    function handlePaletteFile(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                document.getElementById('upload-zone-palette').classList.add('hidden');
                document.getElementById('preview-zone-palette').classList.remove('hidden');
                document.getElementById('preview-img-palette').src = ev.target.result;
                extractPalette();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetPalette() {
        state.originalImage = null; state.extractedColors = [];
        document.getElementById('upload-zone-palette').classList.remove('hidden');
        document.getElementById('preview-zone-palette').classList.add('hidden');
        document.getElementById('btn-copy-palette').disabled = true;
        document.getElementById('palette-colors-grid').innerHTML = '<div class="text-center py-10 text-slate-500 text-[10px]">Envie uma imagem para ver as cores dominantes.</div>';
    }

    function extractPalette() {
        if (!state.originalImage) return;
        const img = state.originalImage;
        const c = document.createElement('canvas');
        const side = 60; c.width = side; c.height = side;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, side, side);
        const d = ctx.getImageData(0, 0, side, side).data;
        const buckets = {};

        for (let i = 0; i < d.length; i += 4) {
            if (d[i+3] < 128) continue;
            const r = Math.round(d[i] / 16) * 16;
            const g = Math.round(d[i+1] / 16) * 16;
            const b = Math.round(d[i+2] / 16) * 16;
            const key = `${r},${g},${b}`;
            if (buckets[key]) { buckets[key].count++; buckets[key].r += d[i]; buckets[key].g += d[i+1]; buckets[key].b += d[i+2]; }
            else { buckets[key] = { count: 1, r: d[i], g: d[i+1], b: d[i+2] }; }
        }

        const sorted = Object.values(buckets).sort((a, b) => b.count - a.count);
        state.extractedColors = [];
        for (let i = 0; i < Math.min(6, sorted.length); i++) {
            const c = sorted[i];
            state.extractedColors.push(rgbToHex(Math.round(c.r / c.count), Math.round(c.g / c.count), Math.round(c.b / c.count)));
        }
        renderPaletteColors();
        document.getElementById('btn-copy-palette').disabled = false;
        showNotification("Paleta gerada!");
    }

    function renderPaletteColors() {
        const grid = document.getElementById('palette-colors-grid');
        grid.innerHTML = '';
        state.extractedColors.forEach((hex, i) => {
            const div = document.createElement('div');
            div.className = "group flex items-center justify-between p-2.5 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 transition cursor-pointer";
            div.onclick = async () => { if (await copyTextToClipboard(hex)) showNotification(`Copiado: ${hex}`); };
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="h-8 w-8 rounded-lg shadow-inner border border-slate-800" style="background-color:${hex}"></div>
                    <div>
                        <span class="text-xs font-bold text-white block uppercase">${hex}</span>
                        <span class="text-[9px] text-slate-500 font-medium">Cor #${i + 1}</span>
                    </div>
                </div>
                <button class="h-7 w-7 rounded-lg hover:bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-white transition">
                    <i class="fa-solid fa-copy text-xs"></i>
                </button>
            `;
            grid.appendChild(div);
        });
    }

    async function copyFullPalette() {
        if (state.extractedColors.length === 0) return;
        if (await copyTextToClipboard(state.extractedColors.join(', '))) showNotification("Paleta copiada!");
    }
})();

// Color Palette Extractor Module

let paletteState = {
    originalImage: null,
    extractedColors: []
};

function initColorPalette() {
    const viewport = document.getElementById('tool-viewport');

    viewport.innerHTML = `
        <div class="fade-in flex-grow flex flex-col justify-between h-full p-4 space-y-6">
            <div class="text-center space-y-1">
                <h3 class="text-lg font-display font-bold text-white">Extrator de Paleta de Cores</h3>
                <p class="text-[11px] text-slate-400">Envie uma imagem para descobrir suas cores dominantes em segundos.</p>
            </div>

            <!-- WORKSPACE -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
                
                <!-- INPUT IMAGE -->
                <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col items-center justify-center relative min-h-[220px]">
                    <div id="upload-zone-palette" class="w-full h-full border-2 border-dashed border-slate-800 hover:border-accent-500 bg-slate-950/20 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition duration-300"
                         onclick="document.getElementById('file-input-palette').click()">
                        <input type="file" id="file-input-palette" accept="image/*" class="hidden" onchange="handlePaletteFileSelect(event)">
                        <i class="fa-solid fa-palette text-3xl text-accent-400 mb-3"></i>
                        <span class="text-xs font-semibold text-white">Carregue sua Imagem</span>
                        <p class="text-[9px] text-slate-500 mt-1">Clique para procurar</p>
                    </div>

                    <div id="preview-zone-palette" class="hidden w-full h-full flex flex-col items-center justify-between space-y-3">
                        <div class="h-40 flex items-center justify-center overflow-hidden rounded-lg border border-slate-900 p-1 bg-slate-950/40 w-full">
                            <img id="preview-img-palette" class="max-h-full object-contain">
                        </div>
                        <button onclick="resetPalette()" class="py-1 px-3 border border-slate-850 hover:bg-slate-900/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition">Alterar Imagem</button>
                    </div>
                </div>

                <!-- CORES EXTRACTED -->
                <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
                    <div class="space-y-4">
                        <span class="text-xs font-bold text-white block">Paleta de Cores Extraída</span>
                        
                        <div id="palette-colors-grid" class="flex flex-col gap-2">
                            <!-- Placeholder -->
                            <div class="text-center py-10 text-slate-500 text-[10px]">Envie uma imagem para ver as cores dominantes.</div>
                        </div>
                    </div>

                    <button id="btn-copy-palette" onclick="copyFullPalette()" disabled class="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fa-solid fa-copy"></i>
                        <span>Copiar Todas as Cores</span>
                    </button>
                </div>

            </div>

        </div>
    `;
}

function handlePaletteFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                paletteState.originalImage = img;
                
                // Show preview
                document.getElementById('upload-zone-palette').classList.add('hidden');
                document.getElementById('preview-zone-palette').classList.remove('hidden');
                document.getElementById('preview-img-palette').src = ev.target.result;
                
                extractPaletteFromImg();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function resetPalette() {
    paletteState.originalImage = null;
    paletteState.extractedColors = [];

    document.getElementById('upload-zone-palette').classList.remove('hidden');
    document.getElementById('preview-zone-palette').classList.add('hidden');
    document.getElementById('btn-copy-palette').disabled = true;
    
    document.getElementById('palette-colors-grid').innerHTML = `
        <div class="text-center py-10 text-slate-500 text-[10px]">Envie uma imagem para ver as cores dominantes.</div>
    `;
}

// ALGORITMO LOCAL DE EXTRAÇÃO DE PALETA (QUANTIZAÇÃO POR BUCKET)
function extractPaletteFromImg() {
    if (!paletteState.originalImage) return;

    const img = paletteState.originalImage;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Redimensionar para otimizar processamento
    const side = 60;
    canvas.width = side;
    canvas.height = side;
    ctx.drawImage(img, 0, 0, side, side);

    const imgData = ctx.getImageData(0, 0, side, side);
    const data = imgData.data;
    const colorBuckets = {};

    // Mapeamento dos pixels em blocos
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];

        // Despreza pixels transparentes
        if (a < 128) continue;

        // Agrupamento dividindo RGB por 16 (gera buckets discretos)
        const bucketR = Math.round(r / 16) * 16;
        const bucketG = Math.round(g / 16) * 16;
        const bucketB = Math.round(b / 16) * 16;
        const key = `${bucketR},${bucketG},${bucketB}`;

        if (colorBuckets[key]) {
            colorBuckets[key].count++;
            colorBuckets[key].r += r;
            colorBuckets[key].g += g;
            colorBuckets[key].b += b;
        } else {
            colorBuckets[key] = { count: 1, r, g, b };
        }
    }

    // Ordenação de frequências
    const sortedColors = Object.values(colorBuckets).sort((a, b) => b.count - a.count);
    
    // Extrai as 5 principais cores médias
    const topColors = [];
    for (let i = 0; i < Math.min(5, sortedColors.length); i++) {
        const c = sortedColors[i];
        const avgR = Math.round(c.r / c.count);
        const avgG = Math.round(c.g / c.count);
        const avgB = Math.round(c.b / c.count);
        topColors.push(rgbToHex(avgR, avgG, avgB));
    }

    paletteState.extractedColors = topColors;
    renderPaletteColors();
    
    document.getElementById('btn-copy-palette').disabled = false;
    showNotification("Paleta de cores gerada!");
}

function renderPaletteColors() {
    const grid = document.getElementById('palette-colors-grid');
    grid.innerHTML = '';

    paletteState.extractedColors.forEach((hex, index) => {
        const colorCard = document.createElement('div');
        colorCard.className = "group flex items-center justify-between p-2.5 rounded-xl border border-slate-900 hover:border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 transition cursor-pointer";
        colorCard.onclick = () => copyColorHex(hex);
        colorCard.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-lg shadow-inner border border-slate-800" style="background-color: ${hex};"></div>
                <div>
                    <span class="text-xs font-bold text-white block uppercase">${hex}</span>
                    <span class="text-[9px] text-slate-500 font-medium">Cor #${index + 1}</span>
                </div>
            </div>
            <button class="h-7 w-7 rounded-lg hover:bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-white transition">
                <i class="fa-solid fa-copy text-xs"></i>
            </button>
        `;
        grid.appendChild(colorCard);
    });
}

function copyColorHex(hex) {
    const temp = document.createElement('textarea');
    temp.value = hex;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showNotification(`Copiado: ${hex}`);
}

function copyFullPalette() {
    if (paletteState.extractedColors.length === 0) return;
    const txt = paletteState.extractedColors.join(', ');
    const temp = document.createElement('textarea');
    temp.value = txt;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showNotification("Paleta inteira copiada!");
}

// RGB to HEX conversion
function rgbToHex(r, g, b) {
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

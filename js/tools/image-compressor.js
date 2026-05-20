// Image Compressor and Converter Module

let compressorState = {
    originalImage: null,
    originalFile: null,
    compressedBlob: null,
    selectedFormat: 'image/jpeg',
    quality: 0.8
};

function initImageCompressor() {
    const viewport = document.getElementById('tool-viewport');

    viewport.innerHTML = `
        <div class="fade-in flex-grow flex flex-col justify-between h-full p-4 space-y-6">
            <div class="text-center space-y-1">
                <h3 class="text-lg font-display font-bold text-white">Compressor e Conversor de Imagens</h3>
                <p class="text-[11px] text-slate-400">Reduza o tamanho físico de arquivos e converta formatos com facilidade.</p>
            </div>

            <!-- CONTROLE PRINCIPAL -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
                
                <!-- INPUT CARD -->
                <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col items-center justify-center relative min-h-[220px]">
                    <div id="upload-zone-compress" class="w-full h-full border-2 border-dashed border-slate-800 hover:border-accent-500 bg-slate-950/20 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition duration-300"
                         onclick="document.getElementById('file-input-compress').click()">
                        <input type="file" id="file-input-compress" accept="image/*" class="hidden" onchange="handleCompressFileSelect(event)">
                        <i class="fa-solid fa-file-image text-3xl text-accent-400 mb-3"></i>
                        <span class="text-xs font-semibold text-white">Carregue sua Imagem</span>
                        <p class="text-[9px] text-slate-500 mt-1">JPEG, PNG ou WebP</p>
                    </div>

                    <div id="preview-zone-compress" class="hidden w-full h-full flex flex-col items-center justify-between space-y-3">
                        <div class="h-28 flex items-center justify-center overflow-hidden rounded-lg border border-slate-900 p-1 bg-slate-950/40 w-full">
                            <img id="preview-img-compress" class="max-h-full object-contain">
                        </div>
                        <div class="w-full text-center space-y-1">
                            <p id="compress-file-name" class="text-xs font-bold text-slate-300 truncate max-w-xs mx-auto"></p>
                            <p id="compress-file-size" class="text-[10px] text-slate-500"></p>
                        </div>
                        <button onclick="resetCompressor()" class="py-1 px-3 border border-slate-850 hover:bg-slate-900/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition">Alterar Imagem</button>
                    </div>
                </div>

                <!-- CONFIGURAÇÃO CARD -->
                <div class="bg-slate-900/10 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
                    <div class="space-y-4">
                        <span class="text-xs font-bold text-white block">Opções de Exportação</span>
                        
                        <!-- Formato -->
                        <div class="space-y-1.5">
                            <label class="text-[10px] text-slate-400 block font-semibold">Formato de Saída:</label>
                            <div class="grid grid-cols-3 gap-2">
                                <button onclick="setCompressFormat('image/jpeg')" id="fmt-btn-jpeg" class="py-1.5 border border-accent-500 bg-accent-500/10 text-[10px] font-bold text-accent-400 rounded-lg transition text-center">JPEG</button>
                                <button onclick="setCompressFormat('image/png')" id="fmt-btn-png" class="py-1.5 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-lg transition text-center">PNG</button>
                                <button onclick="setCompressFormat('image/webp')" id="fmt-btn-webp" class="py-1.5 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-lg transition text-center">WEBP</button>
                            </div>
                        </div>

                        <!-- Qualidade -->
                        <div id="quality-slider-container" class="space-y-1.5">
                            <div class="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                <span>Qualidade da Compressão:</span>
                                <span id="quality-val" class="text-accent-400 font-bold">80%</span>
                            </div>
                            <input type="range" id="compress-quality" min="10" max="100" value="80" oninput="updateCompressQuality(this.value)" class="w-full accent-accent-500">
                            <p class="text-[9px] text-slate-500 leading-tight">Valores menores resultam em arquivos mais leves com menor definição visual.</p>
                        </div>
                    </div>

                    <!-- Botão Executar -->
                    <button id="btn-run-compress" onclick="executeCompression()" disabled class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-bold text-xs shadow-lg shadow-accent-500/10 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fa-solid fa-gear"></i>
                        <span>Comprimir Imagem</span>
                    </button>
                </div>
            </div>

            <!-- RESULTADO CARD -->
            <div id="compress-result-panel" class="hidden bg-slate-900/10 border border-slate-900 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <i class="fa-solid fa-circle-check text-lg"></i>
                    </div>
                    <div>
                        <span class="text-xs font-bold text-white block">Compressão Finalizada!</span>
                        <div class="flex items-center gap-2 text-[10px] text-slate-400">
                            <span id="res-orig-size">Original: --</span>
                            <i class="fa-solid fa-arrow-right text-[8px]"></i>
                            <span id="res-comp-size" class="text-emerald-400 font-bold">Comprimida: --</span>
                            <span id="res-saved-pct" class="bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold">--</span>
                        </div>
                    </div>
                </div>
                <button onclick="downloadCompressed()" class="w-full md:w-auto py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-download"></i>
                    <span>Baixar Arquivo</span>
                </button>
            </div>
        </div>
    `;
}

// LOGICS
function handleCompressFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        compressorState.originalFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                compressorState.originalImage = img;
                
                // Show preview
                document.getElementById('upload-zone-compress').classList.add('hidden');
                document.getElementById('preview-zone-compress').classList.remove('hidden');
                document.getElementById('preview-img-compress').src = ev.target.result;
                
                document.getElementById('compress-file-name').innerText = file.name;
                document.getElementById('compress-file-size').innerText = formatBytes(file.size);
                
                document.getElementById('btn-run-compress').disabled = false;
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function resetCompressor() {
    compressorState.originalImage = null;
    compressorState.originalFile = null;
    compressorState.compressedBlob = null;

    document.getElementById('upload-zone-compress').classList.remove('hidden');
    document.getElementById('preview-zone-compress').classList.add('hidden');
    document.getElementById('btn-run-compress').disabled = true;
    document.getElementById('compress-result-panel').classList.add('hidden');
}

function setCompressFormat(format) {
    compressorState.selectedFormat = format;
    
    // Toggle active buttons
    document.getElementById('fmt-btn-jpeg').className = "py-1.5 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-lg transition text-center";
    document.getElementById('fmt-btn-png').className = "py-1.5 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-lg transition text-center";
    document.getElementById('fmt-btn-webp').className = "py-1.5 border border-slate-900 hover:border-slate-800 text-[10px] font-bold text-slate-400 rounded-lg transition text-center";

    const parts = format.split('/');
    const activeId = `fmt-btn-${parts[1]}`;
    document.getElementById(activeId).className = "py-1.5 border border-accent-500 bg-accent-500/10 text-[10px] font-bold text-accent-400 rounded-lg transition text-center";

    // Quality slider is only active for jpeg and webp
    const sliderContainer = document.getElementById('quality-slider-container');
    if (format === 'image/png') {
        sliderContainer.classList.add('opacity-40', 'pointer-events-none');
    } else {
        sliderContainer.classList.remove('opacity-40', 'pointer-events-none');
    }
}

function updateCompressQuality(val) {
    compressorState.quality = parseFloat(val) / 100;
    document.getElementById('quality-val').innerText = `${val}%`;
}

// EXECUTE COMPRESSION ON CANVAS
function executeCompression() {
    if (!compressorState.originalImage) return;

    const img = compressorState.originalImage;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
        compressorState.compressedBlob = blob;
        
        // Update results display
        const origSize = compressorState.originalFile.size;
        const compSize = blob.size;
        const savedPct = Math.round(((origSize - compSize) / origSize) * 100);

        document.getElementById('res-orig-size').innerText = `Original: ${formatBytes(origSize)}`;
        document.getElementById('res-comp-size').innerText = `Comprimida: ${formatBytes(compSize)}`;
        
        const pctBadge = document.getElementById('res-saved-pct');
        if (savedPct > 0) {
            pctBadge.innerText = `-${savedPct}%`;
            pctBadge.className = "bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold";
        } else {
            pctBadge.innerText = `+${Math.abs(savedPct)}%`;
            pctBadge.className = "bg-red-500/20 text-red-300 px-1 py-0.2 rounded font-bold";
        }

        document.getElementById('compress-result-panel').classList.remove('hidden');
        showNotification("Compressão finalizada com sucesso!");
    }, compressorState.selectedFormat, compressorState.selectedFormat === 'image/png' ? undefined : compressorState.quality);
}

function downloadCompressed() {
    if (!compressorState.compressedBlob) return;

    const extMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };
    const extension = extMap[compressorState.selectedFormat] || 'jpg';
    const origName = compressorState.originalFile.name;
    const dotIdx = origName.lastIndexOf('.');
    const nameWithoutExt = dotIdx > 0 ? origName.substring(0, dotIdx) : 'imagem';

    const url = URL.createObjectURL(compressorState.compressedBlob);
    const link = document.createElement('a');
    link.download = `${nameWithoutExt}_compressed.${extension}`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// HELPERS
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

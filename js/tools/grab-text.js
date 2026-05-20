// OmniTool Studio: Grab Text (OCR) Tool Module
(function() {
    let state = {
        selectedImage: null,
        selectedLanguage: 'por', // 'por' for Portuguese, 'eng' for English, 'spa' for Spanish
    };

    window.initGrabText = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <!-- TOP BAR CONTROL -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-900 rounded-2xl">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-file-lines text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Extrair Texto OCR (Grab Text)</h3>
                            <p class="text-[10px] text-slate-400">Converta fotos, documentos ou capturas de tela em texto editável</p>
                        </div>
                    </div>
                </div>

                <!-- WORKSPACE GRID -->
                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <!-- PREVIEW AREA (LEFT 3 COLS) -->
                    <div class="lg:col-span-2 bg-slate-950/50 border border-slate-900 rounded-3xl relative flex items-center justify-center p-4 min-h-[300px] overflow-hidden" id="ocr-workspace-container">
                        
                        <!-- UPLOAD PLACEHOLDER -->
                        <div id="ocr-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="ocr-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-file-invoice text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione uma imagem com escrita</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">Arraste fotos ou prints. O processamento OCR é executado 100% offline e localmente.</p>
                        </div>

                        <!-- WORK CANVAS / IMAGE PREVIEW -->
                        <img id="ocr-img-preview" class="hidden max-w-full max-h-full rounded-xl object-contain z-0 shadow-lg border border-slate-800">

                        <!-- OCR LOADER -->
                        <div id="ocr-loader" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="ocr-loader-title">Analisando imagem...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center leading-relaxed" id="ocr-loader-desc">Aguarde o reconhecimento local de texto.</p>
                            <!-- PROGRESS BAR -->
                            <div class="w-48 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                                <div class="bg-accent-500 h-1.5 rounded-full w-0 transition-all duration-300" id="ocr-loader-progress"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CONTROL SIDEBAR (RIGHT 2 COLS FOR TEXT OUTPUT) -->
                    <div class="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-3xl p-4 flex flex-col gap-4">
                        <!-- SETTINGS -->
                        <div class="space-y-3 shrink-0">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Idioma do Documento</span>
                            <div class="grid grid-cols-3 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-900">
                                <button id="btn-lang-por" class="active py-1.5 text-xs font-bold rounded-lg transition text-indigo-300 border border-indigo-500/20 bg-indigo-950/20">Português</button>
                                <button id="btn-lang-eng" class="py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200">Inglês</button>
                                <button id="btn-lang-spa" class="py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200">Espanhol</button>
                            </div>
                            <button id="btn-run-ocr" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-accent-500/10" disabled>
                                <i class="fa-solid fa-bolt"></i> Extrair Texto
                            </button>
                        </div>

                        <hr class="border-slate-900 shrink-0">

                        <!-- OUTPUT AREA -->
                        <div class="flex-1 flex flex-col min-h-[200px]">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">2. Texto Extraído</span>
                                <button id="btn-ocr-copy" class="text-xs text-accent-400 hover:text-accent-300 font-bold transition flex items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-copy"></i> Copiar Texto
                                </button>
                            </div>
                            <textarea id="ocr-output-text" class="w-full flex-1 p-3 text-xs leading-relaxed rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-300 focus:outline-none focus:border-slate-700 transition resize-none" placeholder="O texto extraído aparecerá aqui após o processamento..." readonly></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupListeners();
    };

    function setupListeners() {
        const uploader = document.getElementById('ocr-file-uploader');
        const placeholder = document.getElementById('ocr-placeholder');

        placeholder.addEventListener('click', () => uploader.click());
        uploader.addEventListener('change', handleFileSelect);

        // Lang toggles
        document.getElementById('btn-lang-por').addEventListener('click', () => setLanguage('por'));
        document.getElementById('btn-lang-eng').addEventListener('click', () => setLanguage('eng'));
        document.getElementById('btn-lang-spa').addEventListener('click', () => setLanguage('spa'));

        document.getElementById('btn-run-ocr').addEventListener('click', runOCR);
        document.getElementById('btn-ocr-copy').addEventListener('click', copyOutputText);
    }

    function setLanguage(lang) {
        state.selectedLanguage = lang;
        const btnPor = document.getElementById('btn-lang-por');
        const btnEng = document.getElementById('btn-lang-eng');
        const btnSpa = document.getElementById('btn-lang-spa');

        btnPor.className = "py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200";
        btnEng.className = "py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200";
        btnSpa.className = "py-1.5 text-xs font-bold rounded-lg transition text-slate-400 hover:text-slate-200";

        const activeBtn = document.getElementById(`btn-lang-${lang}`);
        activeBtn.className = "active py-1.5 text-xs font-bold rounded-lg transition text-indigo-300 border border-indigo-500/20 bg-indigo-950/20";
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        state.selectedImage = file;

        // Show image preview
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById('ocr-img-preview');
            preview.src = event.target.result;
            preview.classList.remove('hidden');
            document.getElementById('ocr-placeholder').classList.add('hidden');
            document.getElementById('btn-run-ocr').removeAttribute('disabled');
        };
        reader.readAsDataURL(file);
    }

    async function runOCR() {
        if (!state.selectedImage) return;

        showLoader('Carregando OCR', 'Inicializando rede neural local...', 5);

        try {
            // Run Tesseract OCR using CDN scripts
            const result = await Tesseract.recognize(
                state.selectedImage,
                state.selectedLanguage,
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round(m.progress * 100);
                            updateLoader(pct, `Extraindo caracteres: ${pct}%`);
                        } else {
                            // Translate states to portuguese
                            let statusText = 'Preparando rede neural...';
                            if (m.status === 'loading tesseract core') statusText = 'Carregando núcleo do motor OCR...';
                            else if (m.status === 'initializing api') statusText = 'Inicializando API local...';
                            else if (m.status === 'loading language traineddata') statusText = 'Fazendo download de arquivos de idioma...';
                            updateLoader(15, statusText);
                        }
                    }
                }
            );

            // Print Output
            const outputTextarea = document.getElementById('ocr-output-text');
            const text = result.data.text.trim();

            if (text) {
                outputTextarea.value = text;
                document.getElementById('btn-ocr-copy').removeAttribute('disabled');
                if (typeof showNotification === 'function') showNotification("Texto extraído com sucesso!");
            } else {
                outputTextarea.value = "Nenhum caractere identificável foi encontrado na imagem. Tente uma foto com maior contraste.";
                if (typeof showNotification === 'function') showNotification("Nenhum texto detectado.");
            }
            hideLoader();

        } catch (err) {
            console.error(err);
            hideLoader();
            if (typeof showNotification === 'function') showNotification("Erro ao processar imagem.");
        }
    }

    function copyOutputText() {
        const text = document.getElementById('ocr-output-text').value;
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            if (typeof showNotification === 'function') showNotification("Texto copiado para a área de transferência.");
        });
    }

    // LOADERS UTILS
    function showLoader(title, desc, progress = 0) {
        document.getElementById('ocr-loader-title').innerText = title;
        document.getElementById('ocr-loader-desc').innerText = desc;
        document.getElementById('ocr-loader-progress').style.width = `${progress}%`;
        document.getElementById('ocr-loader').className = "absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }

    function updateLoader(pct, desc) {
        document.getElementById('ocr-loader-progress').style.width = `${pct}%`;
        if (desc) document.getElementById('ocr-loader-desc').innerText = desc;
    }

    function hideLoader() {
        document.getElementById('ocr-loader').className = "hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-3xl";
    }
})();

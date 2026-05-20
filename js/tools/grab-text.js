(function() {
    let state = {
        selectedImage: null,
        selectedLanguage: 'por'
    };

    window.initGrabText = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-accent-600/10 text-accent-400 flex items-center justify-center">
                            <i class="fa-solid fa-file-lines text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Extrair Texto OCR</h3>
                            <p class="text-[10px] text-slate-400">Converta imagens em texto editável localmente</p>
                        </div>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <div class="lg:col-span-2 canvas-workspace" id="ocr-workspace-container">
                        <div id="ocr-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="ocr-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-file-invoice text-accent-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Selecione uma imagem com texto</h4>
                            <p class="text-xs text-slate-500 mt-1">OCR 100% offline e local.</p>
                        </div>
                        <img id="ocr-img-preview" class="hidden max-w-full max-h-full rounded-xl object-contain z-0 shadow-lg border border-slate-800">
                        <div id="ocr-loader" class="loader-overlay hidden">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="ocr-loader-title">Analisando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="ocr-loader-desc"></p>
                            <div class="progress-bar-track"><div class="progress-bar-fill" id="ocr-loader-progress" style="width:0%"></div></div>
                        </div>
                    </div>

                    <div class="lg:col-span-2 control-sidebar">
                        <div class="space-y-3 shrink-0">
                            <span class="tool-section-title">1. Idioma</span>
                            <div class="grid grid-cols-3 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-900">
                                <button id="btn-lang-por" class="engine-btn active py-1.5 text-xs font-bold rounded-lg transition text-center">PT</button>
                                <button id="btn-lang-eng" class="engine-btn py-1.5 text-xs font-bold rounded-lg transition text-center text-slate-400 hover:text-slate-200">EN</button>
                                <button id="btn-lang-spa" class="engine-btn py-1.5 text-xs font-bold rounded-lg transition text-center text-slate-400 hover:text-slate-200">ES</button>
                            </div>
                            <button id="btn-run-ocr" class="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-accent-500/10" disabled>
                                <i class="fa-solid fa-bolt"></i> Extrair Texto
                            </button>
                        </div>

                        <hr class="border-slate-900 shrink-0">

                        <div class="flex-1 flex flex-col min-h-[200px]">
                            <div class="flex items-center justify-between mb-2">
                                <span class="tool-section-title mb-0">2. Texto Extraído</span>
                                <button id="btn-ocr-copy" class="text-xs text-accent-400 hover:text-accent-300 font-bold transition flex items-center gap-1.5" disabled>
                                    <i class="fa-solid fa-copy"></i> Copiar
                                </button>
                            </div>
                            <textarea id="ocr-output-text" class="w-full flex-1 p-3 text-xs leading-relaxed rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-300 focus:outline-none focus:border-slate-700 transition resize-none" placeholder="O texto extraído aparecerá aqui..." readonly></textarea>
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
        setupDragDrop(placeholder, uploader, (file) => handleFile(file));

        document.getElementById('btn-lang-por').addEventListener('click', () => setLang('por'));
        document.getElementById('btn-lang-eng').addEventListener('click', () => setLang('eng'));
        document.getElementById('btn-lang-spa').addEventListener('click', () => setLang('spa'));
        document.getElementById('btn-run-ocr').addEventListener('click', runOCR);
        document.getElementById('btn-ocr-copy').addEventListener('click', async () => {
            const text = document.getElementById('ocr-output-text').value;
            if (text && await copyTextToClipboard(text)) showNotification("Copiado!");
        });
    }

    function setLang(lang) {
        state.selectedLanguage = lang;
        ['por', 'eng', 'spa'].forEach(l => {
            document.getElementById(`btn-lang-${l}`).className = l === lang
                ? "engine-btn active py-1.5 text-xs font-bold rounded-lg transition text-center"
                : "engine-btn py-1.5 text-xs font-bold rounded-lg transition text-center text-slate-400 hover:text-slate-200";
        });
    }

    function handleFile(file) {
        state.selectedImage = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('ocr-img-preview').src = ev.target.result;
            document.getElementById('ocr-img-preview').classList.remove('hidden');
            document.getElementById('ocr-placeholder').classList.add('hidden');
            document.getElementById('btn-run-ocr').removeAttribute('disabled');
        };
        reader.readAsDataURL(file);
    }

    async function runOCR() {
        if (!state.selectedImage) return;
        showLoader('OCR', 'Inicializando rede neural local...', 5);
        try {
            if (typeof window.ensureTesseract === 'function') await window.ensureTesseract();
            const result = await Tesseract.recognize(state.selectedImage, state.selectedLanguage, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        updateLoader(Math.round(m.progress * 100), `Extraindo: ${Math.round(m.progress * 100)}%`);
                    } else {
                        const labels = {
                            'loading tesseract core': 'Carregando núcleo OCR...',
                            'initializing api': 'Inicializando API...',
                            'loading language traineddata': 'Baixando idioma...'
                        };
                        updateLoader(15, labels[m.status] || 'Preparando...');
                    }
                }
            });
            const text = result.data.text.trim();
            if (text) {
                document.getElementById('ocr-output-text').value = text;
                document.getElementById('btn-ocr-copy').removeAttribute('disabled');
                showNotification("Texto extraído!");
            } else {
                document.getElementById('ocr-output-text').value = "Nenhum texto encontrado. Tente imagem com mais contraste.";
            }
            hideLoader();
        } catch (e) { hideLoader(); showNotification("Erro no OCR."); }
    }

    function showLoader(t, d, p = 0) {
        document.getElementById('ocr-loader-title').innerText = t;
        document.getElementById('ocr-loader-desc').innerText = d;
        document.getElementById('ocr-loader-progress').style.width = `${p}%`;
        document.getElementById('ocr-loader').classList.remove('hidden');
    }
    function updateLoader(p, d) {
        document.getElementById('ocr-loader-progress').style.width = `${p}%`;
        if (d) document.getElementById('ocr-loader-desc').innerText = d;
    }
    function hideLoader() { document.getElementById('ocr-loader').classList.add('hidden'); }
})();

(function() {
    let state = { selectedImage: null, selectedFile: null };

    window.initAiAssistant = function() {
        const viewport = document.getElementById('tool-viewport');
        viewport.innerHTML = `
            <div class="fade-in flex flex-col h-full space-y-4">
                <div class="top-bar">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg bg-amber-600/10 text-amber-400 flex items-center justify-center">
                            <i class="fa-solid fa-brain text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-display font-bold text-white">Assistente Criativo IA</h3>
                            <p class="text-[10px] text-slate-400">Analise imagens e gere copy de marketing com Gemini Vision</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-ai-copy-all" class="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5" disabled>
                            <i class="fa-solid fa-copy"></i> Copiar Tudo
                        </button>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
                    <div class="lg:col-span-2 canvas-workspace" id="ai-upload-zone-outer">
                        <div id="ai-upload-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-900/10 transition z-10">
                            <input type="file" id="ai-file-uploader" class="hidden" accept="image/*">
                            <div class="h-16 w-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-cloud-arrow-up text-amber-400 text-2xl"></i>
                            </div>
                            <h4 class="font-display font-semibold text-sm text-slate-200">Envie uma imagem para analisar</h4>
                            <p class="text-xs text-slate-500 mt-1 max-w-xs">A IA identifica o produto, gera título, copy, hashtags e sugestões de fundo.</p>
                        </div>
                        <div id="ai-preview-container" class="hidden w-full h-full flex items-center justify-center">
                            <div class="relative">
                                <img id="ai-preview-img" class="max-w-full max-h-full rounded-xl object-contain shadow-lg border border-slate-800">
                                <button id="btn-ai-change-img" class="absolute top-2 right-2 h-7 w-7 rounded-lg bg-slate-950/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition text-xs">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>
                        <div id="ai-loader" class="loader-overlay hidden">
                            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
                            <h5 class="text-sm font-bold text-white" id="ai-loader-title">Analisando...</h5>
                            <p class="text-xs text-slate-400 mt-1 max-w-xs text-center" id="ai-loader-desc"></p>
                            <div class="progress-bar-track"><div class="progress-bar-fill" id="ai-loader-progress" style="width:0%"></div></div>
                        </div>
                    </div>

                    <div class="lg:col-span-2 control-sidebar overflow-y-auto no-scrollbar">
                        <div id="ai-results-empty" class="flex flex-col items-center justify-center h-full text-center py-8">
                            <div class="h-14 w-14 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-wand-magic-sparkles text-slate-600 text-xl"></i>
                            </div>
                            <p class="text-xs text-slate-500 max-w-[200px]">Carregue uma imagem e clique em <strong class="text-amber-400">Analisar com Gemini IA</strong> para receber copy de marketing, hashtags e sugestões de fundo.</p>
                        </div>

                        <div id="ai-results-content" class="hidden space-y-4">
                            <button id="btn-ai-analyze" class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
                                <i class="fa-solid fa-brain"></i> Analisar com Gemini IA
                            </button>

                            <div class="space-y-3">
                                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Título de Produto</span>
                                        <button onclick="window._aiCopyField('ai-res-title')" class="text-slate-400 hover:text-white text-xs transition"><i class="fa-solid fa-copy"></i></button>
                                    </div>
                                    <p id="ai-res-title" class="text-sm text-white font-bold"></p>
                                </div>

                                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Copy para Redes Sociais</span>
                                        <button onclick="window._aiCopyField('ai-res-copy')" class="text-slate-400 hover:text-white text-xs transition"><i class="fa-solid fa-copy"></i></button>
                                    </div>
                                    <p id="ai-res-copy" class="text-xs text-slate-300 leading-relaxed italic"></p>
                                </div>

                                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Hashtags</span>
                                        <button onclick="window._aiCopyField('ai-res-tags')" class="text-slate-400 hover:text-white text-xs transition"><i class="fa-solid fa-copy"></i></button>
                                    </div>
                                    <p id="ai-res-tags" class="text-xs text-violet-400 font-medium"></p>
                                </div>

                                <div class="space-y-2">
                                    <span class="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Cenários de Fundo Sugeridos</span>
                                    <div id="ai-res-scenarios" class="space-y-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setupListeners();
    };

    function setupListeners() {
        const uploader = document.getElementById('ai-file-uploader');
        const placeholder = document.getElementById('ai-upload-placeholder');
        setupDragDrop(placeholder, uploader, (file) => handleFile(file));

        document.getElementById('btn-ai-change-img').addEventListener('click', resetImage);
        document.getElementById('btn-ai-analyze').addEventListener('click', analyzeImage);
        document.getElementById('btn-ai-copy-all').addEventListener('click', copyAll);
    }

    window._aiCopyField = function(id) {
        const text = document.getElementById(id)?.innerText || '';
        if (text && navigator.clipboard) { navigator.clipboard.writeText(text); showNotification('Copiado!'); }
    };

    function handleFile(file) {
        state.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                state.selectedImage = img;
                document.getElementById('ai-preview-img').src = ev.target.result;
                document.getElementById('ai-upload-placeholder').classList.add('hidden');
                document.getElementById('ai-preview-container').classList.remove('hidden');
                document.getElementById('ai-results-empty').classList.add('hidden');
                document.getElementById('ai-results-content').classList.remove('hidden');
                document.getElementById('btn-ai-copy-all').removeAttribute('disabled');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetImage() {
        state.selectedImage = null;
        state.selectedFile = null;
        document.getElementById('ai-preview-container').classList.add('hidden');
        document.getElementById('ai-upload-placeholder').classList.remove('hidden');
        document.getElementById('ai-results-empty').classList.remove('hidden');
        document.getElementById('ai-results-content').classList.add('hidden');
        document.getElementById('btn-ai-copy-all').setAttribute('disabled', '');
        clearResults();
    }

    function clearResults() {
        document.getElementById('ai-res-title').innerText = '';
        document.getElementById('ai-res-copy').innerText = '';
        document.getElementById('ai-res-tags').innerText = '';
        document.getElementById('ai-res-scenarios').innerHTML = '';
    }

    async function analyzeImage() {
        if (!state.selectedImage) { showNotification("Carregue uma imagem primeiro."); return; }
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            if (typeof toggleApiModal === 'function') toggleApiModal();
            showNotification("Configure sua chave Gemini API primeiro.");
            return;
        }

        showLoader('Gemini Vision AI', 'Analisando imagem e gerando copy...', 20);

        const miniCanvas = document.createElement('canvas');
        const maxDim = 512;
        let w = state.selectedImage.naturalWidth, h = state.selectedImage.naturalHeight;
        if (w > h) { if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; } }
        miniCanvas.width = w; miniCanvas.height = h;
        miniCanvas.getContext('2d', { willReadFrequently: true }).drawImage(state.selectedImage, 0, 0, w, h);
        const base64Data = miniCanvas.toDataURL('image/png').split(',')[1];

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const sysPrompt = "Você é um Diretor de Arte e Copywriter especialista em E-Commerce e Marketing Digital. Analise a imagem enviada e retorne APENAS um objeto JSON limpo (sem markdown, sem crases) com este formato: {\"titulo\": \"Título cativante de até 6 palavras\", \"copy\": \"Copy curto focado em engajamento para redes sociais (máximo 3 linhas)\", \"hashtags\": \"#ex1 #ex2 #ex3 #ex4 #ex5\", \"cenarios\": [{\"nome\": \"Nome Cenário\", \"prompt\": \"prompt detalhado em inglês para IA de imagem\"}]}";

        const payload = {
            contents: [{ role: "user", parts: [
                { text: sysPrompt },
                { inlineData: { mimeType: "image/png", data: base64Data } }
            ]}],
            generationConfig: { responseMimeType: "application/json" }
        };

        try {
            const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) {
                if (res.status === 403 || res.status === 401) { hideLoader(); showNotification("Chave API inválida."); return; }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Resposta vazia");

            let parsed;
            try { parsed = JSON.parse(text.trim()); }
            catch { const match = text.match(/\{[\s\S]*\}/); if (match) parsed = JSON.parse(match[0]); else throw new Error("JSON inválido"); }

            document.getElementById('ai-res-title').innerText = parsed.titulo || "Elemento Detectado";
            document.getElementById('ai-res-copy').innerText = parsed.copy || "";
            document.getElementById('ai-res-tags').innerText = parsed.hashtags || "";

            const container = document.getElementById('ai-res-scenarios');
            container.innerHTML = '';
            if (parsed.cenarios && parsed.cenarios.length > 0) {
                parsed.cenarios.forEach(s => {
                    const div = document.createElement('div');
                    div.className = "flex flex-col gap-1 p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-slate-700 transition cursor-pointer";
                    div.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-slate-300">${s.nome}</span>
                            <button class="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition" data-prompt="${s.prompt.replace(/"/g, '&quot;')}">
                                <i class="fa-solid fa-circle-plus"></i> Usar no Gerador
                            </button>
                        </div>
                        <p class="text-[10px] text-slate-500 truncate">${s.prompt}</p>
                    `;
                    div.querySelector('button').addEventListener('click', () => {
                        useScenarioInGenerator(s.prompt);
                    });
                    container.appendChild(div);
                });
            }

            hideLoader();
            showNotification("Análise criativa concluída!");
        } catch (e) {
            hideLoader();
            showNotification("Erro na análise. Verifique sua chave API.");
        }
    }

    function useScenarioInGenerator(prompt) {
        if (typeof switchTool === 'function') {
            switchTool('bg-generator');
            setTimeout(() => {
                const ta = document.getElementById('ai-prompt');
                if (ta) { ta.value = prompt; showNotification("Prompt carregado no Gerador de Fundos!"); }
            }, 500);
        }
    }

    function copyAll() {
        const title = document.getElementById('ai-res-title')?.innerText || '';
        const copy = document.getElementById('ai-res-copy')?.innerText || '';
        const tags = document.getElementById('ai-res-tags')?.innerText || '';
        const text = `${title}\n\n${copy}\n\n${tags}`;
        if (text.trim() && navigator.clipboard) { navigator.clipboard.writeText(text); showNotification("Tudo copiado!"); }
    }

    function showLoader(title, desc, pct = 0) {
        document.getElementById('ai-loader-title').innerText = title;
        document.getElementById('ai-loader-desc').innerText = desc;
        document.getElementById('ai-loader-progress').style.width = `${pct}%`;
        document.getElementById('ai-loader').classList.remove('hidden');
    }
    function hideLoader() { document.getElementById('ai-loader').classList.add('hidden'); }
})();
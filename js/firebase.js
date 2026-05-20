// Firebase Integration Template for OmniTool Studio
// -------------------------------------------------------------
// Como ativar:
// 1. Crie um projeto no console do Firebase (https://console.firebase.google.com/)
// 2. Registre um aplicativo web e copie as credenciais abaixo.
// 3. Importe este arquivo no index.html antes do app.js se desejar rastrear estatísticas.

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID",
    measurementId: "SEU_MEASUREMENT_ID"
};

// Inicialização segura (só roda se as credenciais forem substituídas)
let db = null;
let analytics = null;

if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && typeof firebase !== 'undefined') {
    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    analytics = firebase.analytics();
    console.log("Firebase inicializado com sucesso.");
}

/**
 * Função para registrar uso de ferramentas no Firestore (Estatísticas de Acesso)
 * Útil para entender quais ferramentas são mais acessadas e otimizar posicionamento de anúncios.
 */
function logToolUsage(toolName) {
    if (!db) {
        console.log(`[Firebase Log Simulado]: Ferramenta '${toolName}' acessada.`);
        return;
    }

    try {
        const statsRef = db.collection('tool_usage').doc(toolName);
        statsRef.set({
            count: firebase.firestore.FieldValue.increment(1),
            lastAccessed: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (analytics) {
            analytics.logEvent('use_tool', { name: toolName });
        }
    } catch (e) {
        console.error("Erro ao registrar estatísticas no Firebase:", e);
    }
}

// Vincula o rastreamento às mudanças de aba
document.addEventListener('DOMContentLoaded', () => {
    // Intercepta a navegação no app.js
    const originalSwitch = window.switchTool;
    if (typeof originalSwitch === 'function') {
        window.switchTool = function(toolId) {
            originalSwitch(toolId);
            if (toolId !== 'dashboard') {
                logToolUsage(toolId);
            }
        };
    }
});

// Firebase Modular SDK v11 — tree-shakeable, non-blocking
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, increment, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js';

const firebaseConfig = {
    apiKey: "AIzaSyDNb4H3XN6pIb2xFKDXYGjtC5J74_elsJE",
    authDomain: "adssite-a0cd5.firebaseapp.com",
    projectId: "adssite-a0cd5",
    storageBucket: "adssite-a0cd5.firebasestorage.app",
    messagingSenderId: "296787725137",
    appId: "1:296787725137:web:ce99404e8235f7e9682170",
    measurementId: "G-LHKRBD90Z6"
};

let db = null;
let firebaseAuth = null;
let analytics = null;
let currentUser = null;
let firebaseReady = false;

// Inicializa Firebase com as credenciais reais
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseAuth = getAuth(app);
    analytics = getAnalytics(app);
    firebaseReady = true;

    onAuthStateChanged(firebaseAuth, (user) => {
        currentUser = user;
        if (user) {
            saveUserToDB(user);
            updateAuthUI(true, user);
            console.log("Firebase v11: Utilizador autenticado:", user.displayName);
        } else {
            updateAuthUI(false);
        }
    });

    console.log("Firebase v11 Modular inicializado com sucesso.");
} catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
}

async function saveUserToDB(user) {
    if (!db || !user) return;
    try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        const userData = {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            lastLogin: serverTimestamp(),
            loginCount: increment(1)
        };

        if (!snap.exists()) {
            userData.createdAt = serverTimestamp();
            userData.firstLogin = serverTimestamp();
            userData.loginCount = 1;
            userData.source = 'google_login';
        }

        await setDoc(userRef, userData, { merge: true });

        if (snap.exists()) {
            const existing = snap.data();
            const updates = {};
            if (!existing.email && user.email) updates.email = user.email;
            if (!existing.displayName && user.displayName) updates.displayName = user.displayName;
            if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
        }
    } catch (e) {
        console.error("Erro ao guardar dados do utilizador:", e);
    }
}

// Expõe globalmente para ser chamado pelo HTML
window.signInWithGoogle = async function() {
    if (!firebaseAuth) {
        if (typeof showNotification === 'function') showNotification("Firebase não configurado. Adicione as credenciais em firebase.js");
        return;
    }
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await signInWithPopup(firebaseAuth, provider);
        if (typeof showNotification === 'function') showNotification("Login realizado com sucesso!");
    } catch (e) {
        if (e.code !== 'auth/popup-closed-by-user') {
            console.error("Erro no login Google:", e);
            if (typeof showNotification === 'function') showNotification("Erro ao fazer login. Tente novamente.");
        }
    }
};

window.signOutUser = async function() {
    if (!firebaseAuth) return;
    try {
        await signOut(firebaseAuth);
        if (typeof showNotification === 'function') showNotification("Sessão terminada.");
    } catch (e) {
        console.error("Erro ao terminar sessão:", e);
    }
};

function updateAuthUI(isLoggedIn, user = null) {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;

    if (isLoggedIn && user) {
        authBtn.innerHTML = `
            <img src="${user.photoURL || ''}" class="h-7 w-7 rounded-full border border-slate-700 object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <div class="h-7 w-7 rounded-full bg-accent-600 items-center justify-center text-white text-xs font-bold hidden">${(user.displayName || 'U')[0].toUpperCase()}</div>
            <span class="text-xs text-slate-300 hidden sm:inline max-w-[80px] truncate">${user.displayName || user.email}</span>
            <i class="fa-solid fa-right-from-bracket text-slate-400 hover:text-red-400 transition text-xs ml-1 cursor-pointer" onclick="event.stopPropagation(); window.signOutUser()"></i>
        `;
        authBtn.onclick = null;
    } else {
        authBtn.innerHTML = `
            <i class="fa-brands fa-google text-sm"></i>
            <span class="text-xs text-slate-300">Entrar</span>
        `;
        authBtn.onclick = window.signInWithGoogle;
    }
}

window.logToolUsage = function(toolName) {
    if (!db) {
        console.log(`[Firebase Log Simulado]: Ferramenta '${toolName}' acessada.`);
        return;
    }
    try {
        const statsRef = doc(db, 'tool_usage', toolName);
        setDoc(statsRef, {
            count: increment(1),
            lastAccessed: serverTimestamp()
        }, { merge: true });

        if (currentUser) {
            const userStatsRef = doc(db, 'users', currentUser.uid, 'tool_history', toolName);
            setDoc(userStatsRef, {
                count: increment(1),
                lastUsed: serverTimestamp()
            }, { merge: true });
        }

        if (analytics) {
            logEvent(analytics, 'tool_view', { tool_name: toolName });
        }
    } catch (e) {
        console.error("Erro ao registrar estatísticas:", e);
    }
};

// Intercepta switchTool para logar uso após o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguarda app.js definir switchTool
    const checkAndPatch = () => {
        if (typeof window.switchTool === 'function') {
            const originalSwitch = window.switchTool;
            window.switchTool = function(toolId) {
                originalSwitch(toolId);
                if (toolId !== 'dashboard') {
                    window.logToolUsage(toolId);
                }
            };
        } else {
            requestAnimationFrame(checkAndPatch);
        }
    };
    requestAnimationFrame(checkAndPatch);
});

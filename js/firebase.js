const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID",
    measurementId: "SEU_MEASUREMENT_ID"
};

let db = null;
let firebaseAuth = null;
let currentUser = null;
let firebaseReady = false;

if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        firebaseAuth = firebase.auth();
        firebaseReady = true;

        firebaseAuth.onAuthStateChanged((user) => {
            currentUser = user;
            if (user) {
                saveUserToDB(user);
                updateAuthUI(true, user);
                console.log("Firebase: Utilizador autenticado:", user.displayName);
            } else {
                updateAuthUI(false);
                console.log("Firebase: Nenhum utilizador autenticado.");
            }
        });

        if (firebase.analytics) {
            firebase.analytics();
        }
        console.log("Firebase inicializado com sucesso.");
    } catch (e) {
        console.error("Erro ao inicializar Firebase:", e);
    }
}

async function saveUserToDB(user) {
    if (!db || !user) return;
    try {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();

        const userData = {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            loginCount: doc.exists
                ? firebase.firestore.FieldValue.increment(1)
                : 1
        };

        if (!doc.exists) {
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.firstLogin = firebase.firestore.FieldValue.serverTimestamp();
            userData.source = 'google_login';
        }

        await userRef.set(userData, { merge: true });

        if (doc.exists) {
            const existing = doc.data();
            if (!existing.email && user.email) {
                await userRef.update({ email: user.email });
            }
            if (!existing.displayName && user.displayName) {
                await userRef.update({ displayName: user.displayName });
            }
        }
    } catch (e) {
        console.error("Erro ao guardar dados do utilizador:", e);
    }
}

async function signInWithGoogle() {
    if (!firebaseAuth) {
        showNotification("Firebase não configurado. Adicione as credenciais em firebase.js");
        return;
    }
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await firebaseAuth.signInWithPopup(provider);
        showNotification("Login realizado com sucesso!");
    } catch (e) {
        if (e.code === 'auth/popup-closed-by-user') {
            // User closed popup, no error needed
        } else {
            console.error("Erro no login Google:", e);
            showNotification("Erro ao fazer login. Tente novamente.");
        }
    }
}

async function signOutUser() {
    if (!firebaseAuth) return;
    try {
        await firebaseAuth.signOut();
        showNotification("Sessão terminada.");
    } catch (e) {
        console.error("Erro ao terminar sessão:", e);
    }
}

function updateAuthUI(isLoggedIn, user = null) {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;

    if (isLoggedIn && user) {
        authBtn.innerHTML = `
            <img src="${user.photoURL || ''}" class="h-7 w-7 rounded-full border border-slate-700 object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <div class="h-7 w-7 rounded-full bg-accent-600 items-center justify-center text-white text-xs font-bold hidden">${(user.displayName || 'U')[0].toUpperCase()}</div>
            <span class="text-xs text-slate-300 hidden sm:inline max-w-[80px] truncate">${user.displayName || user.email}</span>
            <i class="fa-solid fa-right-from-bracket text-slate-400 hover:text-red-400 transition text-xs ml-1 cursor-pointer" onclick="event.stopPropagation(); signOutUser()"></i>
        `;
        authBtn.onclick = null;
    } else {
        authBtn.innerHTML = `
            <i class="fa-brands fa-google text-sm"></i>
            <span class="text-xs text-slate-300">Entrar</span>
        `;
        authBtn.onclick = signInWithGoogle;
    }
}

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

        if (currentUser) {
            const userStatsRef = db.collection('users').doc(currentUser.uid).collection('tool_history').doc(toolName);
            userStatsRef.set({
                count: firebase.firestore.FieldValue.increment(1),
                lastUsed: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    } catch (e) {
        console.error("Erro ao registrar estatísticas:", e);
    }
}

async function getLoginStats() {
    if (!db) return null;
    try {
        const snapshot = await db.collection('users').get();
        return {
            totalUsers: snapshot.size,
            users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
    } catch (e) {
        console.error("Erro ao buscar estatísticas:", e);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
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

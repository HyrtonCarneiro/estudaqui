window.notificationService = {
    /**
     * Solicita permissão e registra Push Notifications.
     * Inclui diagnósticos detalhados em cada etapa.
     */
    requestPermission: async function() {
        try {
            // === DIAGNÓSTICOS PRÉ-REGISTRO ===
            if (!('serviceWorker' in navigator)) {
                window.utils.showToast("ERRO: Navegador sem suporte a Service Workers.", "error");
                return;
            }
            if (!('PushManager' in window)) {
                window.utils.showToast("ERRO: Navegador sem suporte a PushManager.", "error");
                return;
            }

            const state = window.store.getState();
            if (!state.isAuthenticated || !state.currentUser) {
                window.utils.showToast("ERRO: Você precisa estar logado.", "error");
                return;
            }

            // Pedir permissão
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                window.utils.showToast("ERRO: Permissão negada pelo usuário (status: " + permission + ").", "error");
                return;
            }

            // Verificar se o arquivo do SW está acessível (pre-flight)
            try {
                const swCheck = await fetch('/firebase-messaging-sw.js');
                if (!swCheck.ok) {
                    window.utils.showToast("ERRO PRÉ-TESTE: firebase-messaging-sw.js retornou HTTP " + swCheck.status + ". Arquivo não encontrado no servidor.", "error");
                    return;
                }
                console.log("Push: SW file pre-check OK (HTTP " + swCheck.status + ")");
            } catch (fetchErr) {
                window.utils.showToast("ERRO PRÉ-TESTE: Não foi possível baixar firebase-messaging-sw.js: " + fetchErr.message, "error");
                return;
            }

            window.utils.showToast("Conectando ao serviço de push...", "success");

            const messaging = firebase.messaging();
            const VAPID_KEY = 'BHDkjfknKZxGgd6sRIQ7YemXZBzOjp9oyztTgGsho5DKH-PBQN_GUYQ6qy4ZiHU3XsNqx5kmSmxLSdIoHmLbB-s';
            let token = null;
            let tentativa1Erro = null;

            // ===== TENTATIVA 1: Firebase automático =====
            try {
                console.log("Push T1: Deixando Firebase fazer tudo...");
                token = await messaging.getToken({ vapidKey: VAPID_KEY });
                console.log("Push T1: Sucesso! Token obtido.");
            } catch (err1) {
                tentativa1Erro = err1.message;
                console.warn("Push T1 FALHOU:", err1.message);

                // ===== TENTATIVA 2: Limpeza + registro manual =====
                try {
                    // Passo 2A: Deletar token antigo
                    console.log("Push T2-A: Deletando token antigo...");
                    try { await messaging.deleteToken(); } catch(e) { console.log("Push T2-A: Nenhum token antigo."); }

                    // Passo 2B: Limpar assinaturas push e SWs
                    console.log("Push T2-B: Limpando assinaturas e SWs...");
                    const regs = await navigator.serviceWorker.getRegistrations();
                    console.log("Push T2-B: " + regs.length + " SW(s) encontrado(s).");
                    for (const reg of regs) {
                        try {
                            const sub = await reg.pushManager.getSubscription();
                            if (sub) {
                                await sub.unsubscribe();
                                console.log("Push T2-B: Assinatura push removida.");
                            }
                        } catch(e) { console.log("Push T2-B: Erro ao remover assinatura:", e.message); }
                        await reg.unregister();
                        console.log("Push T2-B: SW desregistrado.");
                    }

                    // Passo 2C: Esperar
                    console.log("Push T2-C: Aguardando 2s...");
                    await new Promise(r => setTimeout(r, 2000));

                    // Passo 2D: Registrar SW novamente
                    console.log("Push T2-D: Registrando SW...");
                    const newReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    console.log("Push T2-D: SW registrado, scope:", newReg.scope);

                    // Passo 2E: Esperar ativação
                    console.log("Push T2-E: Esperando ativação do SW...");
                    await this._waitForSWActive(newReg);
                    console.log("Push T2-E: SW ativo!");

                    // Passo 2F: Obter token
                    console.log("Push T2-F: Obtendo token...");
                    token = await messaging.getToken({
                        serviceWorkerRegistration: newReg,
                        vapidKey: VAPID_KEY
                    });
                    console.log("Push T2-F: Token obtido!");

                } catch (err2) {
                    console.error("Push T2 FALHOU:", err2.message);
                    window.utils.showToast(
                        "FALHA DUPLA:\n" +
                        "T1: " + tentativa1Erro + "\n" +
                        "T2: " + err2.message,
                        "error"
                    );
                    return;
                }
            }

            // ===== SUCESSO =====
            if (token) {
                await window.db.collection('users').doc(state.currentUser).set({
                    fcmToken: token,
                    ultimoAlertaAnki: null
                }, { merge: true });

                window.utils.showToast("Notificações ativadas com sucesso! 🎉", "success");
                const btn = document.getElementById('btn-enable-notifications');
                if (btn) btn.style.display = 'none';
            } else {
                window.utils.showToast("ERRO: Token retornado é null/vazio após ambas tentativas.", "error");
            }

        } catch (error) {
            console.error("Push ERRO FATAL:", error);
            window.utils.showToast("ERRO FATAL: " + error.message, "error");
        }
    },

    _waitForSWActive: function(registration) {
        return new Promise((resolve, reject) => {
            if (registration.active) { resolve(); return; }
            const sw = registration.installing || registration.waiting;
            if (!sw) { reject(new Error("Nenhum SW installing/waiting após register().")); return; }
            sw.addEventListener('statechange', function() {
                if (this.state === 'activated') resolve();
                else if (this.state === 'redundant') reject(new Error("SW virou redundant."));
            });
            setTimeout(() => reject(new Error("Timeout 10s esperando SW ativar.")), 10000);
        });
    },

    triggerMobilePush: async function(username, cardsCount, breakdown) {
        try {
            const userDoc = await window.db.collection('users').doc(username).get();
            if (!userDoc.exists) return false;
            const userData = userDoc.data();
            if (!userData.fcmToken) return false;

            const host = window.location.protocol === "file:" 
                ? "https://concursosti.vercel.app" 
                : window.location.origin;

            let bodyText = 'Você tem ' + cardsCount + ' cards pendentes no Anki para hoje!';
            if (breakdown) {
                bodyText += '\nNovos: ' + breakdown.new + ' | Aprender: ' + breakdown.learn + ' | Revisar: ' + breakdown.review;
            }

            const response = await fetch(host + '/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: userData.fcmToken,
                    title: "Estudos Pendentes 📚",
                    body: bodyText
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Erro no backend");
            }
            return true;
        } catch (error) {
            console.error("Push trigger erro:", error);
            return false;
        }
    }
};

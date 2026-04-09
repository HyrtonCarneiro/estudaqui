window.notificationService = {
    /**
     * Solicita permissão e registra o dispositivo para Push Notifications.
     * Usa estratégia de tentativa dupla: se a primeira falhar, limpa resíduos e tenta de novo.
     */
    requestPermission: async function() {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                window.utils.showToast("Seu navegador não suporta notificações Push.", "error");
                return;
            }

            const state = window.store.getState();
            if (!state.isAuthenticated || !state.currentUser) {
                window.utils.showToast("Você precisa estar logado para ativar notificações.", "error");
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                window.utils.showToast("Permissão para notificações foi negada.", "error");
                return;
            }

            window.utils.showToast("Conectando ao serviço de push...", "success");

            const messaging = firebase.messaging();
            const VAPID_KEY = 'BHDkjfknKZxGgd6sRIQ7YemXZBzOjp9oyztTgGsho5DKH-PBQN_GUYQ6qy4ZiHU3XsNqx5kmSmxLSdIoHmLbB-s';

            let token = null;

            // ===== TENTATIVA 1: Deixar o Firebase gerenciar tudo sozinho =====
            try {
                console.log("Push: Tentativa 1 - Firebase automático...");
                token = await messaging.getToken({ vapidKey: VAPID_KEY });
            } catch (err1) {
                console.warn("Push: Tentativa 1 falhou:", err1.message);

                // ===== TENTATIVA 2: Limpar resíduos e tentar com SW manual =====
                console.log("Push: Tentativa 2 - Limpeza profunda + registro manual...");

                // 2a. Deletar token antigo do Firebase (ignora erro se não existir)
                try { await messaging.deleteToken(); } catch(e) { /* ok */ }

                // 2b. Limpar assinaturas push antigas de TODOS os SWs registrados
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) {
                        const sub = await reg.pushManager.getSubscription();
                        if (sub) {
                            await sub.unsubscribe();
                            console.log("Push: Assinatura antiga removida.");
                        }
                        // Desregistrar o SW antigo
                        await reg.unregister();
                        console.log("Push: SW antigo removido.");
                    }
                } catch(e) { console.warn("Push: Erro na limpeza:", e); }

                // 2c. Esperar o browser processar
                await new Promise(r => setTimeout(r, 1500));

                // 2d. Registrar SW novamente e esperar ativação
                const newReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                await this._waitForSWActive(newReg);

                // 2e. Tentar obter o token de novo
                token = await messaging.getToken({
                    serviceWorkerRegistration: newReg,
                    vapidKey: VAPID_KEY
                });
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

                console.log("Push: Token salvo com sucesso.");
            } else {
                window.utils.showToast("Não foi possível gerar o token. Tente novamente.", "error");
            }

        } catch (error) {
            console.error("Push: Erro final:", error);
            window.utils.showToast("Erro: " + error.message, "error");
        }
    },

    /**
     * Aguarda o Service Worker ficar no estado 'activated'.
     */
    _waitForSWActive: function(registration) {
        return new Promise((resolve, reject) => {
            if (registration.active) { resolve(); return; }

            const sw = registration.installing || registration.waiting;
            if (!sw) { reject(new Error("SW não encontrado.")); return; }

            sw.addEventListener('statechange', function() {
                if (this.state === 'activated') resolve();
                else if (this.state === 'redundant') reject(new Error("SW descartado."));
            });

            setTimeout(() => reject(new Error("Timeout de ativação do SW.")), 10000);
        });
    },

    /**
     * Dispara push notification via Vercel Serverless Function.
     */
    triggerMobilePush: async function(username, cardsCount, breakdown) {
        try {
            const userDoc = await window.db.collection('users').doc(username).get();
            if (!userDoc.exists) return false;

            const userData = userDoc.data();
            if (!userData.fcmToken) {
                console.log("Push: Usuário sem token FCM.");
                return false;
            }

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

            console.log("Push: Notificação enviada com sucesso!");
            return true;
        } catch (error) {
            console.error("Push: Erro ao disparar:", error);
            return false;
        }
    }
};

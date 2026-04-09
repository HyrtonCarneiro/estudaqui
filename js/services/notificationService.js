window.notificationService = {
    /**
     * Solicita permissão e registra Push Notifications.
     * O Service Worker já é pré-registrado na página (index.html).
     * Aqui só precisamos esperar ele estar pronto e pedir o token.
     */
    requestPermission: async function() {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                window.utils.showToast("ERRO: Navegador sem suporte a Push.", "error");
                return;
            }

            const state = window.store.getState();
            if (!state.isAuthenticated || !state.currentUser) {
                window.utils.showToast("ERRO: Faça login primeiro.", "error");
                return;
            }

            // Pedir permissão
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                window.utils.showToast("Permissão negada. Status: " + permission, "error");
                return;
            }

            window.utils.showToast("Conectando ao serviço de push...", "success");

            // Esperar o SW que foi pré-registrado no index.html ficar pronto
            const registration = await navigator.serviceWorker.ready;
            console.log("Push: SW pronto, scope:", registration.scope);

            // Pedir o token ao Firebase
            const messaging = firebase.messaging();
            const VAPID_KEY = 'BHDkjfknKZxGgd6sRIQ7YemXZBzOjp9oyztTgGsho5DKH-PBQN_GUYQ6qy4ZiHU3XsNqx5kmSmxLSdIoHmLbB-s';

            let token = null;
            let lastError = null;

            // Tentar até 3 vezes com intervalo de 2s (push service error pode ser transitório)
            for (let tentativa = 1; tentativa <= 3; tentativa++) {
                try {
                    console.log("Push: Tentativa " + tentativa + "/3...");
                    token = await messaging.getToken({
                        serviceWorkerRegistration: registration,
                        vapidKey: VAPID_KEY
                    });
                    if (token) {
                        console.log("Push: Token obtido na tentativa " + tentativa);
                        break;
                    }
                } catch (err) {
                    lastError = err;
                    console.warn("Push: Tentativa " + tentativa + " falhou:", err.message);

                    if (tentativa < 3) {
                        // Limpar assinatura push anterior e tentar de novo
                        try {
                            const sub = await registration.pushManager.getSubscription();
                            if (sub) await sub.unsubscribe();
                        } catch(e) {}
                        try { await messaging.deleteToken(); } catch(e) {}
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }

            if (token) {
                // Salvar no Firestore
                await window.db.collection('users').doc(state.currentUser).set({
                    fcmToken: token,
                    ultimoAlertaAnki: null
                }, { merge: true });

                window.utils.showToast("Notificações ativadas com sucesso! 🎉", "success");
                const btn = document.getElementById('btn-enable-notifications');
                if (btn) btn.style.display = 'none';
            } else {
                const errMsg = lastError ? lastError.message : "Token vazio";
                window.utils.showToast("FALHA após 3 tentativas: " + errMsg, "error");
            }

        } catch (error) {
            console.error("Push ERRO:", error);
            window.utils.showToast("ERRO: " + error.message, "error");
        }
    },

    /**
     * Dispara push notification via Vercel Serverless Function.
     */
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

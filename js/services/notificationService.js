window.notificationService = {
    // Chamado automaticamente após o login — registra push silenciosamente
    autoRegister: async function() {
        try {
            // Só funciona em navegadores com suporte
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                console.log("Push: Navegador sem suporte.");
                return;
            }

            const state = window.store.getState();
            if (!state.isAuthenticated || !state.currentUser) return;

            // Se já tem token, apenas configura o handler de foreground e sai
            if (state.fcmToken) {
                console.log("Push: Token já existe. Configurando handler de foreground.");
                this._setupForegroundHandler();
                return;
            }

            // Se a permissão ainda não foi pedida, pede agora
            if (Notification.permission === 'default') {
                console.log("Push: Permissão ainda não foi pedida. Solicitando...");
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.log("Push: Permissão negada pelo usuário:", permission);
                    return;
                }
            } else if (Notification.permission === 'denied') {
                console.log("Push: Permissão foi negada anteriormente. Não é possível registrar.");
                return;
            }

            // Registrar token
            await this._registerToken();

        } catch (error) {
            console.error("Push autoRegister erro:", error);
        }
    },

    // Registro manual — chamado pelo botão "Ativar Notificações" (fallback)
    requestPermission: async function() {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                window.utils.showToast("Navegador sem suporte a Push.", "error");
                return;
            }

            const state = window.store.getState();
            if (!state.isAuthenticated || !state.currentUser) {
                window.utils.showToast("Faça login primeiro.", "error");
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                window.utils.showToast("Permissão negada: '" + permission + "'. Vá em Configurações > Notificações e permita este site.", "error");
                return;
            }

            window.utils.showToast("Registrando notificações...", "success");
            await this._registerToken();
            window.utils.showToast("Notificações ativadas! 🎉", "success");

        } catch (error) {
            console.error("Push requestPermission erro:", error);
            window.utils.showToast("Erro: " + error.message, "error");
        }
    },

    // Core: registra o token no Firebase e salva no Firestore
    _registerToken: async function() {
        const registration = await navigator.serviceWorker.ready;
        console.log("Push: SW pronto. Scope:", registration.scope, "Script:", registration.active?.scriptURL);

        // Verificar se o SW correto está ativo
        if (registration.active && !registration.active.scriptURL.includes('firebase-messaging')) {
            console.error("Push: SW ativo NÃO é firebase-messaging-sw.js:", registration.active.scriptURL);
            window.utils.showToast("Service Worker incorreto ativo. Limpe o cache e recarregue.", "error");
            return;
        }

        const VAPID_KEY = 'BHDkjfknKZxGgd6sRIQ7YemXZBzOjp9oyztTgGsho5DKH-PBQN_GUYQ6qy4ZiHU3XsNqx5kmSmxLSdIoHmLbB-s';

        const messaging = firebase.messaging();
        const token = await messaging.getToken({
            serviceWorkerRegistration: registration,
            vapidKey: VAPID_KEY
        });

        if (token) {
            console.log("Push: Token obtido. Prefix:", token.substring(0, 20) + "...");
            window.store.getState().fcmToken = token;
            await window.store.save();

            // Atualizar botão de ativação se existir
            const btn = document.getElementById('btn-enable-notifications');
            if (btn) {
                btn.innerHTML = '<i class="ph-bold ph-check-circle"></i> Notificações Ativas';
                btn.classList.remove('text-primary-500', 'bg-primary-50');
                btn.classList.add('text-green-600', 'bg-green-50');
            }

            this._setupForegroundHandler();
        } else {
            console.error("Push: getToken retornou null. VAPID Key pode estar incorreta.");
            window.utils.showToast("Falha ao obter token. Verifique a configuração do Firebase.", "error");
        }
    },

    // Handler de foreground — mostra notificação mesmo com o app aberto
    _setupForegroundHandler: function() {
        try {
            if (this._foregroundHandlerReady) return; // Evitar duplo registro

            const messaging = firebase.messaging();
            messaging.onMessage((payload) => {
                console.log("Push: Mensagem recebida em FOREGROUND:", payload);

                const title = payload.data?.title || payload.notification?.title || 'Estudaqui TI';
                const body = payload.data?.body || payload.notification?.body || '';

                // Mostrar notificação nativa
                if (Notification.permission === 'granted') {
                    new Notification(title, {
                        body: body,
                        icon: '/icon-192.png',
                        tag: 'estudaqui-foreground',
                        renotify: true
                    });
                }

                // Toast no app
                window.utils.showToast("🔔 " + title + ": " + body, "success");
            });

            this._foregroundHandlerReady = true;
            console.log("Push: Handler de foreground registrado.");
        } catch (e) {
            console.warn("Push: Falha ao registrar onMessage:", e.message);
        }
    },

    _urlBase64ToUint8Array: function(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },

    triggerMobilePush: async function(username, cardsCount, breakdown) {
        try {
            const userDoc = await window.db.collection('users').doc(username).get();
            if (!userDoc.exists) return false;
            const userData = userDoc.data();
            const token = userData.state?.fcmToken || userData.fcmToken;
            if (!token) return false;

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
                    token: token,
                    title: "Estudos Pendentes 📚",
                    body: bodyText
                })
            });

            const resData = await response.json();
            return resData.success === true;
        } catch (error) {
            console.error("Push trigger erro:", error);
            return false;
        }
    },

    manualTestPush: async function() {
        try {
            const state = window.store.getState();
            let token = state.fcmToken;

            if (!token) {
                window.utils.showToast("Registrando notificações primeiro...", "info");
                await this.requestPermission();
                token = window.store.getState().fcmToken;
                if (!token) return;
            }

            // Diagnóstico
            const swReg = await navigator.serviceWorker.getRegistration();
            const swScript = swReg?.active?.scriptURL || 'nenhum';
            const permStatus = Notification.permission;

            console.log("Push Teste — Token:", token.substring(0, 20), "SW:", swScript, "Perm:", permStatus);

            if (permStatus !== 'granted') {
                window.utils.showToast("Permissão de notificação: '" + permStatus + "'. Vá em Configurações e permita.", "error");
                return;
            }

            window.utils.showToast("Enviando teste...", "info");

            const host = window.location.protocol === "file:"
                ? "https://concursosti.vercel.app"
                : window.location.origin;

            const response = await fetch(host + '/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    title: "Teste de Notificação 🔥",
                    body: "Se você recebeu isso, tudo está funcionando!"
                })
            });

            const resData = await response.json();

            if (resData.success) {
                window.utils.showToast(
                    "✅ Enviado com sucesso! ID: " + (resData.messageId || '?').substring(0, 25) +
                    ". Se NÃO aparecer: 1) Config > Apps > Chrome > Notificações. 2) Desative Economia de Bateria. SW: " + swScript,
                    "success"
                );
            } else {
                window.utils.showToast(
                    "❌ Erro: " + (resData.error || "desconhecido") +
                    " (código: " + (resData.code || '?') + "). " +
                    "Se 'unregistered': recarregue e clique 'Ativar Notificações'.",
                    "error"
                );
            }
        } catch (error) {
            console.error("Erro no teste:", error);
            window.utils.showToast("Erro: " + error.message, "error");
        }
    }
};

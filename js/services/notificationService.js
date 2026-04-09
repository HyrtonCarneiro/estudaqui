window.notificationService = {
    /**
     * Solicita permissão ao usuário e salva o token FCM no Firestore.
     * Reescrito com lógica robusta para funcionar em Chrome Android.
     */
    requestPermission: async function() {
        try {
            // 1. Verificação de suporte
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                window.utils.showToast("Seu navegador não suporta notificações Push.", "error");
                return;
            }

            // 2. Verificação de autenticação
            const state = window.store.getState();
            if (!state.isAuthenticated || !state.currentUser) {
                window.utils.showToast("Você precisa estar logado para ativar notificações.", "error");
                return;
            }

            // 3. Pedir permissão ao usuário
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                window.utils.showToast("Permissão para notificações foi negada.", "error");
                return;
            }

            // 4. Registrar o Service Worker (sem desregistrar os existentes!)
            //    Desregistrar causa o "no active Service Worker" porque o novo SW 
            //    ainda não está ativo quando getToken() tenta fazer subscribe().
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log("SW registrado:", registration.scope);

            // 5. Esperar o SW ficar REALMENTE ativo (critical step)
            await this._waitForSWActive(registration);
            console.log("SW ativo e pronto.");

            // 6. Obter o token FCM usando a chave VAPID
            const messaging = firebase.messaging();
            const currentToken = await messaging.getToken({ 
                serviceWorkerRegistration: registration,
                vapidKey: 'BHDkjfknKZxGgd6sRIQ7YemXZBzOjp9oyztTgGsho5DKH-PBQN_GUYQ6qy4ZiHU3XsNqx5kmSmxLSdIoHmLbB-s' 
            });
            
            if (currentToken) {
                // 7. Salvar no Firestore
                await window.db.collection('users').doc(state.currentUser).set({
                    fcmToken: currentToken,
                    ultimoAlertaAnki: null
                }, { merge: true });
                
                window.utils.showToast("Notificações ativadas com sucesso!", "success");
                
                // Esconde botão
                const btn = document.getElementById('btn-enable-notifications');
                if (btn) btn.style.display = 'none';
            } else {
                window.utils.showToast("Falha ao gerar token. Tente novamente.", "error");
            }

        } catch (error) {
            console.error("Erro completo:", error);
            
            let userMsg = error.message;
            if (userMsg.includes("push service")) {
                userMsg = "Limpe os dados deste site: toque no cadeado ao lado da URL > Redefinir permissões. Depois recarregue e tente novamente.";
            } else if (userMsg.includes("no active Service Worker")) {
                userMsg = "O Service Worker não carregou. Verifique sua conexão e recarregue a página.";
            }
            window.utils.showToast(userMsg, "error");
        }
    },

    /**
     * Aguarda o Service Worker ficar no estado 'activated'.
     * Resolve imediatamente se já estiver ativo.
     */
    _waitForSWActive: function(registration) {
        return new Promise((resolve, reject) => {
            // Já ativo? Resolver imediatamente.
            if (registration.active) {
                resolve();
                return;
            }

            // Pegar o worker que está em processo de ativação
            const sw = registration.installing || registration.waiting;
            if (!sw) {
                reject(new Error("Nenhum Service Worker encontrado após registro."));
                return;
            }

            sw.addEventListener('statechange', function() {
                if (this.state === 'activated') {
                    resolve();
                } else if (this.state === 'redundant') {
                    reject(new Error("Service Worker foi substituído antes de ativar."));
                }
            });

            // Timeout de segurança (10s)
            setTimeout(() => reject(new Error("Timeout esperando ativação do Service Worker.")), 10000);
        });
    },

    /**
     * Dispara uma notificação push via a Vercel Serverless Function.
     * @param {string} username 
     * @param {number} cardsCount 
     * @param {object} breakdown - { new, learn, review }
     */
    triggerMobilePush: async function(username, cardsCount, breakdown) {
        try {
            const userDoc = await window.db.collection('users').doc(username).get();
            if (!userDoc.exists) return false;
            
            const userData = userDoc.data();
            if (!userData.fcmToken) {
                console.log("Usuário não ativou notificações (sem token FCM).");
                return false;
            }
            
            const host = window.location.protocol === "file:" 
                ? "https://concursosti.vercel.app" 
                : window.location.origin;

            let bodyText = `Você tem ${cardsCount} cards pendentes no Anki para hoje!`;
            if (breakdown) {
                bodyText += `\nNovos: ${breakdown.new} | Aprender: ${breakdown.learn} | Revisar: ${breakdown.review}`;
            }

            const response = await fetch(`${host}/api/notify`, {
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
                throw new Error(errData.error || "Erro no envio pelo backend");
            }

            console.log("Push disparada com sucesso via Vercel!");
            return true;

        } catch (error) {
            console.error("Erro ao disparar push:", error);
            return false;
        }
    }
};

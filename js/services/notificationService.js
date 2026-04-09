window.notificationService = {
    /**
     * Solicita permissão ao usuário (no celular ou PC) e salva o token no Firestore.
     */
    requestPermission: async function() {
        try {
            // Verificação de suporte inicial
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
            if (permission === 'granted') {
                const messaging = firebase.messaging();
                
                // Registro explícito do Service Worker para evitar o erro "no active Service Worker"
                if ('serviceWorker' in navigator) {
                    try {
                        // LIMPEZA: Remove registros antigos para garantir que a versão mais nova rode
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let reg of registrations) {
                            await reg.unregister();
                            console.log("Service Worker antigo removido.");
                        }

                        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                        console.log("Service Worker registrado com sucesso:", registration.scope);
                        
                        // Espera ficar ativo de verdade
                        const readyReg = await navigator.serviceWorker.ready;
                        
                        // IMPORTANTE: Aqui usaremos a VAPID Key para uma solução definitiva
                        const currentToken = await messaging.getToken({ 
                            serviceWorkerRegistration: readyReg,
                            vapidKey: 'BHDkjfknKZxGgd6sRIQ7YemXZBzOjp9oyztTgGsho5DKH-PBQN_GUYQ6qy4ZiHU3XsNqx5kmSmxLSdIoHmLbB-s' 
                        });
                        
                        if (currentToken) {
                            // Salvar no Firestore usando currentUser
                            await window.db.collection('users').doc(state.currentUser).set({
                                fcmToken: currentToken,
                                ultimoAlertaAnki: null // reseta pra garantir o envio no teste
                            }, { merge: true });
                            
                            window.utils.showToast("Notificações ativadas com sucesso no seu dispositivo!", "success");
                            
                            // Esconde botão
                            const btn = document.getElementById('btn-enable-notifications');
                            if (btn) btn.style.display = 'none';

                        } else {
                            window.utils.showToast("Falha ao gerar o token de notificação. Tente novamente.", "error");
                        }
                    } catch (swError) {
                        console.error("Erro no Service Worker:", swError);
                        
                        let msg = swError.message;
                        if (msg.includes("push service error")) {
                            msg = "O Chrome do celular está travado. Clique no Cadeado (ao lado do link do site) > Configurações do Site > Limpar Dados e tente denovo.";
                        }
                        window.utils.showToast("Erro Técnico: " + msg, "error");
                    }
                } else {
                    window.utils.showToast("Seu navegador não suporta notificações em segundo plano.", "error");
                }
            } else {
                window.utils.showToast("Permissão para notificações foi negada.", "error");
            }
        } catch (error) {
            console.error("Erro ao ativar notificações:", error);
            window.utils.showToast("Erro ao pedir permissão: " + error.message, "error");
        }
    },

    /**
     * Acionado pelo dashboard no PC. Manda a requisição para a nossa Vercel Function.
     * @param {string} username - O usuario atual
     * @param {number} cardsCount - Numero de cards lidos do Anki 
     */
    triggerMobilePush: async function(username, cardsCount, breakdown) {
        try {
            // Busca o token do usuario pra ter certeza de mandar certo
            const userDoc = await window.db.collection('users').doc(username).get();
            if (!userDoc.exists) return false;
            
            const userData = userDoc.data();
            if (!userData.fcmToken) {
                console.log("Usuário não ativou as notificações (sem token FCM).");
                return false;
            }
            
            const host = window.location.protocol === "file:" ? "https://estudaqui-hyrtons-projects.vercel.app" : window.location.origin;

            let bodyText = `Você tem ${cardsCount} cards pendentes no Anki para hoje!`;
            if (breakdown) {
                bodyText += `\nNovos: ${breakdown.new} | Aprender: ${breakdown.learn} | Revisar: ${breakdown.review}`;
            }

            const response = await fetch(`${host}/api/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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

            console.log("Push Notification disparada com sucesso via Vercel!");
            return true;

        } catch (error) {
            console.error("Erro ao disparar push:", error);
            // Non-blocking
            return false;
        }
    }
};

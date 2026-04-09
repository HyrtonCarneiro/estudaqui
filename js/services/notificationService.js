window.notificationService = {
    /**
     * Solicita permissão ao usuário (no celular ou PC) e salva o token no Firestore.
     */
    requestPermission: async function() {
        try {
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
                        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                        console.log("Service Worker registrado com sucesso:", registration.scope);
                        
                        // Espera ficar ativo de verdade
                        const readyReg = await navigator.serviceWorker.ready;
                        
                        const currentToken = await messaging.getToken({ serviceWorkerRegistration: readyReg });
                        
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
                        window.utils.showToast("Erro Técnico: " + swError.message, "error");
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
    triggerMobilePush: async function(username, cardsCount) {
        try {
            // Busca o token do usuario pra ter certeza de mandar certo
            const userDoc = await window.db.collection('users').doc(username).get();
            if (!userDoc.exists) return false;
            
            const userData = userDoc.data();
            if (!userData.fcmToken) {
                console.log("Usuário não ativou as notificações (sem token FCM).");
                return false;
            }
            
            // Dispara para o nosso backend na vercel
            // Assumimos que o front está hospedado na Vercel e o /api/notify está rodando no mesmo origin.
            // Se o usuário abrir no file:// e o backend estiver na web, precisaria da URL completa oficial,
            // mas como é Vercel, faremos um fetch para a raiz do site, ou um hardcode toleravel.
            // Para "Zero build" universal, se rodar do file:// o /api/notify não existe localmente. 
            // Precisamos da URL de produção se rodando local:
            const host = window.location.protocol === "file:" ? "https://estudaqui-hyrtons-projects.vercel.app" : window.location.origin;

            const response = await fetch(`${host}/api/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: userData.fcmToken,
                    title: "Estudos Pendentes 📚",
                    body: `Você tem ${cardsCount} cards pendentes no Anki para revisar hoje!`
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

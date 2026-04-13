importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuração do Firebase para o Service Worker
const firebaseConfig = {
    apiKey: "AIzaSyCXcmf8vYBZtBWhLP3k1HWDEUAC-_MSkwo",
    authDomain: "estudaqui-be0f5.firebaseapp.com",
    projectId: "estudaqui-be0f5",
    storageBucket: "estudaqui-be0f5.firebasestorage.app",
    messagingSenderId: "271897096717",
    appId: "1:271897096717:web:263533ff30f243c99ddb44",
    measurementId: "G-KJS46W8WP1"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handler manual para garantir que a notificação apareça em segundo plano no Mobile
messaging.onBackgroundMessage((payload) => {
    console.log('Push: Recebido em segundo plano:', payload);

    const notificationTitle = payload.data?.title || payload.notification?.title || 'Estudaqui TI';
    const notificationOptions = {
        body: payload.data?.body || payload.notification?.body || 'Nova atualização disponível',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
            url: payload.data?.click_action || '/'
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Forçar atualização do Service Worker imediatamente após nova versão
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

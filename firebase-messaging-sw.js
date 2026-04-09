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

// Forçar atualização do Service Worker imediatamente após nova versão
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// NOTA: onBackgroundMessage removido para evitar duplicidade.
// O FCM já exibe notificações automaticamente quando o payload contém a propriedade 'notification'.

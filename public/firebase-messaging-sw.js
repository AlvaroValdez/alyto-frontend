// public/firebase-messaging-sw.js
// Service Worker para recibir push notifications en background

// Activar inmediatamente sin esperar que se cierren pestañas abiertas
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA7i-m4O9qVFcr2QjzNP9mzYQge75JLEFE",
    authDomain: "alyto-14283.firebaseapp.com",
    projectId: "alyto-14283",
    storageBucket: "alyto-14283.firebasestorage.app",
    messagingSenderId: "786578849025",
    appId: "1:786578849025:web:aeeb9211525363541eef00"
});

const messaging = firebase.messaging();

// Manejar notificaciones cuando la app está en BACKGROUND
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Push recibida en background:', payload);

    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    self.registration.showNotification(title || 'Alyto', {
        body: body || '',
        icon: '/logo192.png',
        badge: '/badge72.png',
        tag: data.type || 'default',           // evita duplicados del mismo tipo
        renotify: true,
        data: { url: data.url || '/' }
    });

    // Avisar a la app (si está abierta) para actualizar la campana de notificaciones
    try {
        const channel = new BroadcastChannel('fcm-background');
        channel.postMessage({ title, body, data });
        channel.close();
    } catch (e) {
        // BroadcastChannel puede no estar disponible en todos los contextos
    }
});

// Click en notificación → abrir la URL correspondiente
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una ventana abierta, enfocarla
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus().then(() => client.navigate(url));
                }
            }
            // Si no hay ventana, abrir nueva
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// src/hooks/usePushNotifications.js
import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '../config/firebase';
import { registerFcmToken, deleteFcmToken } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

/**
 * Hook que:
 * 1. Pide permiso de notificaciones al usuario
 * 2. Obtiene el FCM token del dispositivo
 * 3. Lo registra en el backend
 * 4. Escucha mensajes cuando la app está en FOREGROUND
 * 5. Escucha notificaciones de background via BroadcastChannel
 */
export const usePushNotifications = () => {
    const registered = useRef(false);
    const { addNotification } = useNotifications();
    const { token: authToken } = useAuth();

    // Escuchar notificaciones recibidas en background (via service worker)
    useEffect(() => {
        if (!authToken) return;
        if (!('BroadcastChannel' in window)) return;

        const channel = new BroadcastChannel('fcm-background');
        channel.onmessage = (event) => {
            const { title, body, data } = event.data || {};
            addNotification({ title, body, type: data?.type, link: data?.link });
        };

        return () => channel.close();
    }, [authToken, addNotification]);

    // Registrar FCM token y escuchar mensajes en foreground
    useEffect(() => {
        if (!authToken) return;
        if (registered.current) return;

        const setup = async () => {
            try {
                if (!('Notification' in window)) {
                    console.warn('[Push] Navegador no soporta notificaciones');
                    return;
                }

                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.warn('[Push] Permiso de notificaciones denegado');
                    return;
                }

                if (!('serviceWorker' in navigator)) {
                    console.warn('[Push] Navegador no soporta Service Worker');
                    return;
                }

                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                const messaging = await getFirebaseMessaging();
                if (!messaging) {
                    console.warn('[Push] Firebase Messaging no disponible');
                    return;
                }

                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (!token) {
                    console.warn('[Push] No se pudo obtener el FCM token');
                    return;
                }

                const response = await registerFcmToken(token);
                if (response?.ok) {
                    localStorage.setItem('fcmToken', token);
                    registered.current = true;
                    console.log('[Push] ✅ Token FCM registrado');
                } else {
                    console.warn('[Push] Backend no pudo guardar el FCM token');
                }

                // Escuchar mensajes en FOREGROUND (solo registrar el listener una vez)
                if (!window._fcmListenerRegistered) {
                    onMessage(messaging, (payload) => {
                        const { title, body } = payload.notification || {};
                        const data = payload.data || {};

                        addNotification({ title, body, type: data.type, link: data.link });

                        toast(title || 'Notificación', {
                            description: body,
                            icon: '🔔',
                            duration: 5000,
                        });
                    });
                    window._fcmListenerRegistered = true;
                }

            } catch (err) {
                console.warn('[Push] Error en setup:', err.message);
            }
        };

        setup();
    }, [authToken]); // eslint-disable-line react-hooks/exhaustive-deps
};

/**
 * Eliminar token FCM al hacer logout
 */
export const clearPushToken = async () => {
    try {
        await deleteFcmToken();
        localStorage.removeItem('fcmToken');
        window._fcmListenerRegistered = false;
        console.log('[Push] Token FCM eliminado');
    } catch (err) {
        console.warn('[Push] Error eliminando token:', err.message);
    }
};

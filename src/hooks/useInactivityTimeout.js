import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TIMEOUT_MS = Number(import.meta.env.VITE_SESSION_TIMEOUT_MS) || 30 * 60 * 1000; // 30 minutos
const WARNING_MS = Number(import.meta.env.VITE_SESSION_WARNING_MS) || 2 * 60 * 1000; // 2 minutos warning

/**
 * Hook personalizado para detectar inactividad y mostrar advertencia antes de cerrar sesión.
 * 
 * @returns {Object} Estado y métodos para manejar el timeout de sesión
 */
export const useInactivityTimeout = () => {
    const [showWarning, setShowWarning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_MS);
    const { logout, token } = useAuth();
    const navigate = useNavigate();

    const timeoutRef = useRef(null);
    const warningRef = useRef(null);
    const intervalRef = useRef(null);

    /**
     * Reinicia los timers de inactividad
     */
    const resetTimer = () => {
        // Limpiar timers existentes
        clearTimeout(timeoutRef.current);
        clearTimeout(warningRef.current);
        clearInterval(intervalRef.current);

        setShowWarning(false);
        setTimeRemaining(TIMEOUT_MS);

        // Timer de advertencia (se activa X minutos antes del timeout)
        warningRef.current = setTimeout(() => {
            setShowWarning(true);

            // Iniciar cuenta regresiva
            let remaining = WARNING_MS;
            setTimeRemaining(remaining);

            intervalRef.current = setInterval(() => {
                remaining -= 1000;
                setTimeRemaining(Math.max(0, remaining));

                if (remaining <= 0) {
                    clearInterval(intervalRef.current);
                }
            }, 1000);
        }, TIMEOUT_MS - WARNING_MS);

        // Timer de logout automático
        timeoutRef.current = setTimeout(() => {
            handleLogout();
        }, TIMEOUT_MS);
    };

    /**
     * Maneja el cierre de sesión por timeout
     */
    const handleLogout = async () => {
        clearTimeout(timeoutRef.current);
        clearTimeout(warningRef.current);
        clearInterval(intervalRef.current);

        logout();
        navigate('/login?session=expired', { replace: true });
    };

    /**
     * Extiende la sesión (reinicia timers)
     */
    const extendSession = () => {
        resetTimer();
        setShowWarning(false);
    };

    useEffect(() => {
        // Solo activar si hay sesión activa
        if (!token) {
            return;
        }

        // Eventos que indican actividad del usuario
        const activityEvents = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Registrar listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        // Resetear timer cuando el usuario vuelve al tab/app (e.g. desde file picker)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                resetTimer();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Iniciar timer
        resetTimer();

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, resetTimer, true);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(timeoutRef.current);
            clearTimeout(warningRef.current);
            clearInterval(intervalRef.current);
        };
    }, [token]); // Re-ejecutar si cambia el token

    return {
        showWarning,
        timeRemaining,
        extendSession,
        handleLogout
    };
};

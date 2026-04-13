import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLoopbackHost(hostname = '') {
    return LOOPBACK_HOSTS.has(hostname);
}

function getDefaultBackendOrigin() {
    if (typeof window === 'undefined') {
        return 'http://localhost:5000';
    }

    const { origin, protocol, hostname } = window.location;

    if (import.meta.env.DEV) {
        return `${protocol}//${hostname}:5000`;
    }

    return origin;
}

function resolveBackendUrl() {
    const fallbackOrigin = getDefaultBackendOrigin();
    const configuredUrl = import.meta.env.VITE_API_URL?.trim();

    if (!configuredUrl) {
        return fallbackOrigin;
    }

    try {
        const parsedUrl = new URL(configuredUrl, fallbackOrigin);

        if (typeof window !== 'undefined') {
            const currentHost = window.location.hostname;
            const configuredIsLoopback = isLoopbackHost(parsedUrl.hostname);
            const currentIsLoopback = isLoopbackHost(currentHost);

            // Prevent production/LAN builds from being pinned to localhost.
            if (configuredIsLoopback && !currentIsLoopback) {
                return fallbackOrigin;
            }
        }

        return parsedUrl.origin;
    } catch (error) {
        console.warn('[CollabSocket] Invalid VITE_API_URL, falling back to detected backend origin.', error);
        return fallbackOrigin;
    }
}

const BACKEND_URL = resolveBackendUrl();

export function useCollabSocket(documentId, userId) {
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!documentId) return;

        // Establish connection to the /collab namespace
        socketRef.current = io(`${BACKEND_URL}/collab`, {
            path: '/socket.io',
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['polling', 'websocket'], // Try polling first for stability, then upgrade
            autoConnect: true,
            auth: { userId: userId || 'Anonymous' }
        });

        const socket = socketRef.current;

        socket.on('connect_error', (err) => {
            console.error('[CollabSocket] Connection error:', {
                message: err.message,
                description: err.description || null,
                backendUrl: BACKEND_URL,
                pageUrl: typeof window !== 'undefined' ? window.location.href : null,
                documentId,
                userId: userId || 'Anonymous'
            });
        });

        socket.on('reconnect_attempt', (attempt) => {
            console.log(`[CollabSocket] Attempting to reconnect (attempt ${attempt})...`);
        });

        socket.on('connect', () => {
            setIsConnected(true);
            // Join specific document room
            socket.emit('join_document', { document_id: documentId, user_id: userId || 'Anonymous' });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('user_joined', (data) => {
            setActiveUsers(prev => [...prev.filter(u => u !== data.user_id), data.user_id]);
        });

        socket.on('user_left', (data) => {
            setActiveUsers(prev => prev.filter(u => u !== data.user_id));
        });

        return () => {
            socket.emit('leave_document', { document_id: documentId, user_id: userId || 'Anonymous' });
            socket.disconnect();
        };
    }, [documentId, userId]);

    const broadcastUpdate = (payload) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('document_update', {
                document_id: documentId,
                ...payload
            });
        }
    };

    const broadcastCursor = (payload) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('cursor_move', {
                document_id: documentId,
                ...payload
            });
        }
    }

    return { isConnected, activeUsers, broadcastUpdate, broadcastCursor, socket: socketRef.current };
}

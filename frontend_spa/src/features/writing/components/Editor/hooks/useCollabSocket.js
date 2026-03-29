import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useCollabSocket(documentId, userId) {
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!documentId) return;

        // Establish connection to the /collab namespace
        socketRef.current = io(`${BACKEND_URL}/collab`, {
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
            console.error('[CollabSocket] Connection error:', err.message, err.description);
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

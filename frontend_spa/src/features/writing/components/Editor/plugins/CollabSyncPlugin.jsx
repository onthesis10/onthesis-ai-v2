import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCollabSocket } from '../hooks/useCollabSocket';

export default function CollabSyncPlugin({ documentId }) {
    const [editor] = useLexicalComposerContext();

    // In a real app we would get the user ID from Auth context
    // For now we use a random ID or anonymous
    const [userId] = useState(() => `User_${Math.floor(Math.random() * 1000)}`);

    const { isConnected, activeUsers, socket } = useCollabSocket(documentId, userId);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleUpdate = () => {};

        socket.on('document_updated', handleUpdate);

        return () => {
            socket.off('document_updated', handleUpdate);
        };
    }, [socket, isConnected, editor]);

    return null;
}

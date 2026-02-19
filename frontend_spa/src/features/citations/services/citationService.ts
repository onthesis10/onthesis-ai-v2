import { db, auth } from '@/lib/firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    writeBatch,
    orderBy,
    serverTimestamp,
    DocumentData
} from 'firebase/firestore';

export interface Project {
    id: string;
    title: string;
    userId: string;
    createdAt: any;
}

export interface Citation {
    id: string;
    projectId: string;
    userId: string;
    type?: string;
    title: string;
    author: string;
    year: string;
    journal?: string;
    publisher?: string;
    url?: string;
    doi?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    notes?: string;
    pdfUrl?: string;
    createdAt: any;
}

const COLLECTIONS = {
    PROJECTS: 'projects',
    CITATIONS: 'citations'
};

export const citationService = {
    // Projects
    subscribeToProjects: (callback: (projects: Project[]) => void) => {
        // Return unsubscribe function
        let unsubscribeSnapshot: (() => void) | undefined;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();

            if (!user) {
                callback([]);
                return;
            }

            const q = query(
                collection(db, COLLECTIONS.PROJECTS),
                where('userId', '==', user.uid)
            );

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const projects = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Project[];

                projects.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                callback(projects);
            });
        });

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            unsubscribeAuth();
        };
    },

    createProject: async (title: string) => {
        const user = auth?.currentUser;
        if (!user) throw new Error('User not authenticated');

        return addDoc(collection(db, COLLECTIONS.PROJECTS), {
            title,
            userId: user.uid,
            createdAt: serverTimestamp()
        });
    },

    deleteProject: async (projectId: string) => {
        // Delete project and all its citations in a batch
        const batch = writeBatch(db);

        // delete project
        const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
        batch.delete(projectRef);

        // find citations
        const q = query(collection(db, COLLECTIONS.CITATIONS), where('projectId', '==', projectId));

        // Importing getDocs dynamically to avoid build issues if not used elsewhere
        const { getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    },

    // Citations
    subscribeToAllUserCitations: (callback: (citations: Citation[]) => void) => {
        let unsubscribeSnapshot: (() => void) | undefined;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();

            if (!user) {
                callback([]);
                return;
            }

            const q = query(
                collection(db, COLLECTIONS.CITATIONS),
                where('userId', '==', user.uid)
            );

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const citations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Citation[];

                citations.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                callback(citations);
            });
        });

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            unsubscribeAuth();
        };
    },

    addCitation: async (citation: Omit<Citation, 'id' | 'createdAt' | 'userId'>) => {
        const user = auth?.currentUser;
        if (!user) throw new Error('User not authenticated');

        return addDoc(collection(db, COLLECTIONS.CITATIONS), {
            ...citation,
            userId: user.uid,
            createdAt: serverTimestamp()
        });
    },

    deleteCitation: async (citationId: string) => {
        return deleteDoc(doc(db, COLLECTIONS.CITATIONS, citationId));
    },

    // API Search
    searchReferences: async (queryStr: string, sources: string[], year: string) => {
        const response = await fetch('/api/unified-search-references', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: queryStr, sources, year })
        });
        if (!response.ok) throw new Error('Search failed');
        return response.json();
    },

    // PDF Upload
    uploadPdf: async (file: File) => {
        const formData = new FormData();
        formData.append('document', file);

        const response = await fetch('/api/analyze-document', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    }
};

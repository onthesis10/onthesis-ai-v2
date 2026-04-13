import { auth } from '@/lib/firebase';

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

const POLL_INTERVAL_MS = 15000;

const toMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'number') return value;
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    return 0;
};

const fetchJson = async (input: string, init?: RequestInit) => {
    const response = await fetch(input, {
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        ...init,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Request failed');
    }
    return payload;
};

const startBackendSubscription = <T>(
    endpoint: string,
    extractor: (payload: any) => T[],
    callback: (items: T[]) => void,
) => {
    let intervalId: number | null = null;

    const stopPolling = () => {
        if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
        }
    };

    const run = async () => {
        try {
            const payload = await fetchJson(endpoint, { method: 'GET' });
            callback(extractor(payload));
        } catch (error) {
            console.error(`Failed to fetch ${endpoint}:`, error);
            callback([]);
        }
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        stopPolling();

        if (!user) {
            callback([]);
            return;
        }

        void run();
        intervalId = window.setInterval(() => {
            void run();
        }, POLL_INTERVAL_MS);
    });

    return () => {
        stopPolling();
        unsubscribeAuth();
    };
};

export const citationService = {
    subscribeToProjects: (callback: (projects: Project[]) => void) => {
        return startBackendSubscription<Project>(
            '/api/projects',
            (payload) => {
                const projects = (payload.projects || []) as Project[];
                return [...projects].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
            },
            callback,
        );
    },

    createProject: async (title: string) => {
        return fetchJson('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ title }),
        });
    },

    deleteProject: async (projectId: string) => {
        return fetchJson(`/api/projects/${projectId}`, {
            method: 'DELETE',
        });
    },

    subscribeToAllUserCitations: (callback: (citations: Citation[]) => void) => {
        return startBackendSubscription<Citation>(
            '/api/citations',
            (payload) => {
                const citations = (payload.citations || []) as Citation[];
                return [...citations].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
            },
            callback,
        );
    },

    addCitation: async (citation: Omit<Citation, 'id' | 'createdAt' | 'userId'>) => {
        return fetchJson('/api/citations', {
            method: 'POST',
            body: JSON.stringify(citation),
        });
    },

    deleteCitation: async (citationId: string) => {
        return fetchJson(`/api/citations/${citationId}`, {
            method: 'DELETE',
        });
    },

    searchReferences: async (queryStr: string, sources: string[], year: string) => {
        return fetchJson('/api/unified-search-references', {
            method: 'POST',
            body: JSON.stringify({ query: queryStr, sources, year }),
        });
    },

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

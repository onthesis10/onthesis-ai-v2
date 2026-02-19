export interface Project {
    id: string;
    userId: string;
    title: string;
    description: string;
    status: 'DRAFT' | 'ON GOING' | 'REVISI' | 'SELESAI';
    progress: number;
    endDate: any; // Firestore Timestamp
    createdAt: any;
    lastUpdated: any;
}

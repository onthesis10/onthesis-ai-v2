export type ExportSectionType = 'heading' | 'paragraph' | 'table' | 'figure';

export interface AnalysisExportSchema {
    meta: {
        title: string;
        author: string;
        institution?: string;
        date: string;
        style: 'APA';
    };
    sections: ExportSection[];
}

export interface ExportSection {
    type: ExportSectionType;
    level?: 1 | 2 | 3; // For headings
    content: any;
    caption?: string; // For tables/figures
    source?: 'AI' | 'Manual'; // To visually distinguish AI content
    id?: string;
}

export interface TableContent {
    headers: string[];
    rows: (string | number)[][];
}

export interface FigureContent {
    image: string; // Base64
    width?: string | number;
    height?: string | number;
}

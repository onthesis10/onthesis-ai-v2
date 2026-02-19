
export type VisualizationMode = 'academic' | 'dashboard';

export type ChartType = 'bar' | 'line' | 'scatter' | 'heatmap' | 'histogram' | 'boxplot' | 'qqplot' | 'composed';

export interface ChartTheme {
    background: string;
    primary: string;
    secondary: string; // unlikely used in strict academic, but good for multi-series
    gridColor: string;
    text: string;
    subtext: string;
    fontFamily: string;
    fontSizeTitle: number;
    fontSizeLabel: number;
    isDark: boolean;
    colors?: string[];
}

export interface ChartData {
    title: string;
    subtext?: string; // Optional, but usually required for 'n='
    xLabel: string;
    yLabel: string;
    categories: string[];
    values: number[] | number[][] | any[]; // Supports [1,2,3] or [[1,2], [3,4]] for scatter
    series?: { name: string, data: number[] | number[][] | any[], type?: ChartType }[]; // Support multi-series
    n?: number; // Sample size
    type?: ChartType; // Explicit type override
    imageBase64?: string; // Support for static image charts (e.g. from Python matplotlib)
}

export interface NormalizedData extends ChartData {
    dataType: 'categorical' | 'numeric' | 'time';
}

export interface ChartConfig {
    mode: VisualizationMode;
    width?: number | string;
    height?: number | string;
}

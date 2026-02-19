import type { ChartType, NormalizedData } from '../types';

export const validateChartRequest = (type: string, data: NormalizedData) => {
    // RULE 1: No Pie Charts for Academic Use (unless strictly requested, but even then...)
    if (type === 'pie') {
        throw new Error("Academic Standards Violation: Pie charts are discouraged. Use Bar charts or Stacked Bar charts instead for better comparison.");
    }

    // RULE 2: Data must have categories for Bar charts
    if (type === 'bar' && (!data.categories || data.categories.length === 0)) {
        throw new Error("Data Error: Bar layout requires categories.");
    }

    // RULE 3: Sample size 'n' must be present
    if (!data.n && data.values.length > 0) {
        console.warn("Academic Warning: Sample size 'n' is missing. It will be auto-calculated from values, but explicit 'n' is preferred.");
    }

    return true;
};

export const resolveChartType = (dataType: NormalizedData['dataType']): ChartType => {
    if (dataType === 'categorical') return 'bar';
    if (dataType === 'numeric') return 'bar'; // Histogram is essentially a bar chart
    if (dataType === 'time') return 'line';

    return 'bar'; // Default to bar
};

import type { NormalizedData } from '../types';

export const normalizeData = (rawData: any): NormalizedData => {
    // 1. Basic Validation
    if (!rawData || !Array.isArray(rawData.values)) {
        throw new Error("Invalid Data: 'values' array is missing.");
    }

    // 2. Calculate n if missing
    let n = rawData.n;
    if (n === undefined || n === null) {
        // Sum of values (assuming frequency count)
        n = rawData.values.reduce((a: number, b: number) => a + b, 0);
    }

    // 3. Determine Data Type
    let dataType: NormalizedData['dataType'] = 'categorical';
    // Simple heuristic: if x-axis categories are numbers, might be numeric (histogram)
    // But usually backend tells us. For now default to categorical.

    return {
        title: rawData.title || 'Untitled Chart',
        subtext: rawData.subtext,
        xLabel: rawData.xLabel || 'Category',
        yLabel: rawData.yLabel || 'Frequency',
        categories: rawData.categories || [],
        values: rawData.values,
        n: n,
        dataType
    };
};

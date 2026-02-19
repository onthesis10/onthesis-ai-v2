import type { NormalizedData } from '../types';

export const transformArtifactToNormalizedData = (artifact: any): NormalizedData => {
    // Handle Image Artifacts (Agent)
    if (artifact.type === 'image_base64') {
        return {
            title: artifact.title || 'Chart',
            categories: [],
            values: [],
            xLabel: '',
            yLabel: '',
            dataType: 'numeric',
            imageBase64: artifact.data // Based on backend structure
        };
    }

    // Artifact structure from AIAssistantView (Legacy Chart):
    // artifact.data.option = { title: { text: ... }, xAxis: { data: ... }, series: [{ data: ... }] }

    const option = artifact.data?.option;
    if (!option) {
        throw new Error("Invalid artifact format: missing 'option'");
    }

    const title = option.title?.text || artifact.title || 'Untitled Chart';
    const subtext = option.title?.subtext;

    // Categories (X Axis)
    let categories: string[] = [];
    if (option.xAxis && option.xAxis.data) {
        categories = option.xAxis.data;
    } else if (Array.isArray(option.xAxis)) {
        categories = option.xAxis[0]?.data || [];
    }

    // Values (Series)
    let values: number[] = [];
    if (option.series && option.series.length > 0) {
        const series = option.series[0];
        if (series.data) {
            values = series.data.map((d: any) => (typeof d === 'object' ? d.value : d));
        }
    }

    // Try to extract 'n' from subtext if possible
    let n: number | undefined = undefined;
    if (subtext) {
        const match = subtext.match(/n\s*=\s*(\d+)/i);
        if (match) {
            n = parseInt(match[1]);
        }
    }

    // Fallback n calculation
    if (!n && values.length > 0) {
        n = values.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    }

    return {
        title,
        subtext,
        xLabel: option.xAxis?.name || 'Category',
        yLabel: option.yAxis?.name || 'Value',
        categories,
        values,
        n,
        dataType: 'categorical'
    };
};

import type { NormalizedData, ChartType } from '../types';

export const transformAnalysisChartToNormalizedData = (chartData: any): NormalizedData => {
    const baseData: NormalizedData = {
        title: chartData.title || 'Untitled Chart',
        xLabel: chartData.xLabel || '',
        yLabel: chartData.yLabel || '',
        categories: [] as string[],
        values: [] as any[],
        series: [] as any[],
        type: 'bar' as ChartType,
        dataType: 'categorical', // Default
        n: 0
    };

    // 1. HISTOGRAM + NORMALITY
    if (chartData.type === 'histogram_combined' || chartData.type === 'normality_hist') {
        baseData.type = 'composed';
        const hist = chartData.data.histogram || [];
        baseData.xLabel = 'Value Range';
        baseData.yLabel = 'Frequency';
        baseData.categories = hist.map((d: any) => d.name);

        baseData.series = [
            {
                name: 'Frequency',
                type: 'bar',
                data: hist.map((d: any) => d.count)
            },
            // Add normal curve if available or approximated
            // For now, we reuse counts as a placeholder line like the original code did
            {
                name: 'Distribution',
                type: 'line',
                data: hist.map((d: any) => d.count)
            }
        ];
        return baseData as NormalizedData;
    }

    // 2. BOXPLOT
    if (chartData.type === 'boxplot') {
        baseData.type = 'boxplot';
        const { categories, values, outliers } = chartData.data;
        baseData.categories = categories;
        baseData.series = [
            {
                name: 'Boxplot',
                type: 'boxplot',
                data: values
            },
            {
                name: 'Outliers',
                type: 'scatter',
                data: outliers ? outliers.map((o: any) => [categories.indexOf(o[0]), o[1]]) : []
            }
        ];
        return baseData as NormalizedData;
    }

    // 3. SCATTER + REGRESSION
    if (chartData.type === 'scatter_regression') {
        baseData.type = 'composed';
        const { scatter, line, equation, r_squared } = chartData.data;
        baseData.subtext = `${equation} (R² = ${r_squared?.toFixed(3)})`;
        baseData.series = [
            {
                name: 'Data',
                type: 'scatter',
                data: scatter.map((d: any) => [d.x, d.y])
            },
            {
                name: 'Regression',
                type: 'line',
                data: line.map((d: any) => [d.x, d.y])
            }
        ];
        return baseData as NormalizedData;
    }

    // 4. QQ PLOT
    if (chartData.type === 'qq_plot') {
        baseData.type = 'qqplot';
        baseData.xLabel = 'Theoretical Quantiles';
        baseData.yLabel = 'Sample Quantiles';
        baseData.series = [
            {
                name: 'QQ Plot',
                type: 'scatter',
                data: chartData.data.map((d: any) => [d.x, d.y])
            },
            // Diagonal reference line is handled in ChartFactory special case
            {
                name: 'Reference',
                type: 'line',
                data: [] // Factory adds markLine
            }
        ];
        return baseData as NormalizedData;
    }

    // 5. SIMPLE BAR
    if (chartData.type === 'bar' || chartData.type === 'bar_categorical') {
        baseData.type = 'bar';
        baseData.categories = chartData.data.map((d: any) => d.name);
        baseData.values = chartData.data.map((d: any) => d.count || d.value);
        // Calculate n
        baseData.n = baseData.values.reduce((a: number, b: number) => a + b, 0);
        return baseData as NormalizedData;
    }

    // 6. SIMPLE SCATTER
    if (chartData.type === 'scatter') {
        baseData.type = 'scatter';
        baseData.values = chartData.data.map((d: any) => [d.x, d.y]);
        return baseData as NormalizedData;
    }

    // Default
    return baseData as NormalizedData;
};

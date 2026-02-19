import type { ChartData, ChartTheme, VisualizationMode } from '../types';
import { getExportConfig } from '../utils/ExportManager';

export const createChartOptions = (data: ChartData, theme: ChartTheme, mode: VisualizationMode) => {
    const isAcademic = mode === 'academic';

    // 1. Base Structure
    const options: any = {
        backgroundColor: mode === 'academic' ? theme.background : 'transparent',
        animation: !isAcademic, // No animation for strict academic checks
        textStyle: {
            fontFamily: theme.fontFamily
        },
        title: {
            show: !isAcademic, // Hide internal title in academic mode
            text: data.title,
            subtext: data.n ? `n = ${data.n}` : data.subtext,
            left: 'center',
            textStyle: {
                fontSize: theme.fontSizeTitle,
                fontWeight: 600,
                color: theme.text
            },
            subtextStyle: {
                fontSize: theme.fontSizeLabel,
                color: theme.subtext
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%', // Minimal bottom, relying on containLabel
            top: isAcademic ? 30 : 50, // Reduced from 60
            containLabel: true,
            show: isAcademic,
            borderWidth: 0,
            backgroundColor: 'transparent',
            borderColor: theme.gridColor
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }, // 'line' | 'shadow'
            formatter: (params: any) => {
                // Simple tooltip
                // Use default formatter if complex types, or custom
                return params.length > 1
                    ? params.map((p: any) => `${p.seriesName}: ${p.value}`).join('<br/>')
                    : `${params[0].name}<br/>${params[0].marker} ${params[0].seriesName}: <b>${params[0].value}</b>`;
            }
        },
        xAxis: {
            type: 'category',
            name: data.xLabel,
            nameLocation: 'middle',
            nameGap: 30, // Reduced gap
            data: data.categories,
            axisTick: { show: false },
            axisLine: {
                lineStyle: { color: theme.text } // Ensure axis line is visible
            },
            axisLabel: {
                fontSize: theme.fontSizeLabel,
                color: theme.text,
                interval: isAcademic ? 0 : 'auto', // Force all labels in academic
                rotate: 0, // Reset rotation, handle with width/overflow
                hideOverlap: true,
                fontFamily: theme.fontFamily,
                width: 80, // Narrower width to force wrap or truncate
                overflow: 'truncate', // Truncate instead of break to save vertical space
                formatter: (value: string) => {
                    return value.length > 15 ? value.substring(0, 15) + '...' : value;
                }
            }
        },
        yAxis: {
            type: 'value',
            name: data.yLabel,
            nameLocation: 'middle',
            nameGap: 50,
            minInterval: data.type === 'bar' ? 1 : undefined, // Integer only for counts
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
                lineStyle: {
                    color: theme.gridColor,
                    type: 'dashed'
                }
            }
        },
        series: generateSeries(data, theme, mode),
        toolbox: getExportConfig(mode)
    };

    // Type-specific overrides
    if (data.type === 'scatter' || data.type === 'qqplot' || data.type === 'composed' || data.values && Array.isArray(data.values[0])) {
        options.xAxis.type = 'value';
        options.xAxis.nameLocation = 'middle';
    }

    // Boxplot specific overrides
    if (data.type === 'boxplot') {
        options.tooltip.trigger = 'item';
        options.xAxis.axisLabel.interval = 0;
    }

    return options;
};

// --- Helper Functions ---

function generateSeries(data: ChartData, theme: ChartTheme, mode: VisualizationMode): any[] {
    const isAcademic = mode === 'academic';

    // 1. Explicit Series Provided (e.g. from complex adapters)
    if (data.series && data.series.length > 0) {
        return data.series.map((s, i) => ({
            name: s.name,
            type: s.type || 'bar', // Default to bar if not specified
            data: s.data,
            itemStyle: {
                color: theme.colors ? theme.colors[i % theme.colors.length] : (s.type === 'line' ? '#F43F5E' : theme.primary),
                borderColor: s.type === 'boxplot' ? theme.primary : undefined,
                borderWidth: s.type === 'boxplot' ? 1.5 : undefined,
                opacity: isAcademic ? 0.9 : 1 // Slightly solid for academic
            },
            // Specific overrides for types
            smooth: s.type === 'line',
            showSymbol: s.type === 'line' ? false : true,
            markLine: data.type === 'qqplot' && s.type === 'line' ? {
                animation: false,
                lineStyle: { type: 'dashed', color: theme.secondary },
                data: [[{ coord: [-3, -3], symbol: 'none' }, { coord: [3, 3], symbol: 'none' }]]
            } : undefined
        }));
    }

    // 2. Auto-detect from 'values' (Legacy / Simple)
    const chartType = determineChartType(data);

    return [{
        type: chartType,
        data: data.values,
        barWidth: chartType === 'bar' ? '45%' : undefined,
        symbolSize: chartType === 'scatter' ? 8 : undefined,
        itemStyle: {
            color: theme.primary
        },
        label: {
            show: isAcademic && chartType === 'bar',
            position: 'top',
            fontSize: theme.fontSizeLabel,
            color: theme.text,
            formatter: (p: any) => p.value?.toString()
        }
    }];
}

function determineChartType(data: ChartData): string {
    if (data.type) return data.type;
    if (data.values && data.values.length > 0 && Array.isArray(data.values[0])) return 'scatter';
    return 'bar';
}

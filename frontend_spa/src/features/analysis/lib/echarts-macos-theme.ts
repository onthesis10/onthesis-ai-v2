import * as echarts from 'echarts';

/**
 * MACOS / APPLE STYLE ECHARTS THEME
 * Designed for premium SaaS analytics
 */

// --- 1. Typography & Tokens ---
const FONTS = {
    primary: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
};

const COLORS = {
    // macOS Inspired Palette
    blue: '#007AFF',
    indigo: '#5856D6',
    teal: '#5AC8FA',
    green: '#34C759',
    orange: '#FF9500',
    red: '#FF3B30',
    purple: '#AF52DE',
    pink: '#FF2D55',
    grayTextLight: '#8E8E93', // Text for Light Mode
    grayTextDark: '#98989D',  // Text for Dark Mode
    gridLight: 'rgba(0,0,0,0.06)',
    gridDark: 'rgba(255,255,255,0.08)'
};

const SERIES_COLORS = [
    COLORS.blue,
    COLORS.green,
    COLORS.orange,
    COLORS.purple,
    COLORS.red,
    COLORS.teal,
    COLORS.indigo,
    COLORS.pink
];

// --- 2. Register Themes ---

export const registerMacOSThemes = () => {
    // --- LIGHT THEME ---
    echarts.registerTheme('macos-light', {
        color: SERIES_COLORS,
        backgroundColor: 'transparent',
        textStyle: {
            fontFamily: FONTS.primary,
            fontSize: 12
        },
        title: {
            textStyle: {
                color: '#1C1C1E',
                fontWeight: 600,
                fontSize: 16
            },
            subtextStyle: {
                color: '#8E8E93'
            }
        },
        line: {
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { width: 3 }
        },
        bar: {
            itemStyle: {
                borderRadius: [6, 6, 0, 0] // Rounded top
            },
            barMaxWidth: 40
        },
        grid: {
            left: 20,
            right: 20,
            top: 40,
            bottom: 20,
            containLabel: true,
            show: false,
            borderColor: 'transparent'
        },
        categoryAxis: {
            axisLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.1)' } },
            axisTick: { show: false },
            axisLabel: {
                color: '#6B7280', // Slate 500
                fontSize: 11,
                fontFamily: FONTS.primary
            },
            splitLine: { show: false }
        },
        valueAxis: {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#9CA3AF', // Slate 400
                fontSize: 11,
                fontFamily: FONTS.primary
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: COLORS.gridLight,
                    type: 'dashed'
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: 'rgba(0,0,0,0.05)',
            borderWidth: 1,
            padding: [8, 12],
            textStyle: { color: '#1F2937', fontSize: 13 },
            extraCssText: 'backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); border-radius: 12px;'
        },
        legend: {
            textStyle: { color: '#374151' },
            itemGap: 16,
            icon: 'circle'
        }
    });

    // --- DARK THEME ---
    echarts.registerTheme('macos-dark', {
        color: SERIES_COLORS,
        backgroundColor: 'transparent',
        textStyle: {
            fontFamily: FONTS.primary,
            fontSize: 12
        },
        title: {
            textStyle: {
                color: '#F2F2F7',
                fontWeight: 600,
                fontSize: 16
            },
            subtextStyle: {
                color: '#98989D'
            }
        },
        line: {
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { width: 3 }
        },
        bar: {
            itemStyle: {
                borderRadius: [6, 6, 0, 0]
            },
            barMaxWidth: 40
        },
        grid: {
            left: 20,
            right: 20,
            top: 40,
            bottom: 20,
            containLabel: true,
            show: false,
            borderColor: 'transparent'
        },
        categoryAxis: {
            axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisTick: { show: false },
            axisLabel: {
                color: '#9CA3AF', // Slate 400
                fontSize: 11
            },
            splitLine: { show: false }
        },
        valueAxis: {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#6B7280', // Slate 500
                fontSize: 11
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: COLORS.gridDark,
                    type: 'dashed'
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(28, 28, 30, 0.75)', // macOS Dark system gray
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: [8, 12],
            textStyle: { color: '#F2F2F7', fontSize: 13 },
            extraCssText: 'backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border-radius: 12px;'
        },
        legend: {
            textStyle: { color: '#D1D5DB' },
            itemGap: 16,
            icon: 'circle'
        }
    });
};

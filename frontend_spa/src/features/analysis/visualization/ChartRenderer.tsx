import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { NormalizedData, VisualizationMode } from './types';
import { AcademicTheme } from './theme/academicTheme';
import { DashboardTheme } from './theme/dashboardTheme';
import { createChartOptions } from './factory/ChartFactory';

interface ChartRendererProps {
    data: NormalizedData;
    mode?: VisualizationMode;
    height?: string;
    caption?: string; // Academic caption
    className?: string;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
    data,
    mode = 'dashboard',
    height = '400px',
    caption,
    className
}) => {

    const theme = mode === 'academic' ? AcademicTheme : DashboardTheme;

    // Generate options using the factory (only if not an image)
    const options = useMemo(() => {
        if (data.imageBase64) return null;
        return createChartOptions(data, theme, mode);
    }, [data, theme, mode]);

    // Container style
    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: height,
        backgroundColor: mode === 'academic' ? theme.background : 'transparent', // Transparent for dashboard glassmorphism
        padding: mode === 'academic' ? '20px' : '0', // Add padding for academic export
        border: mode === 'academic' ? '1px solid #e5e7eb' : 'none', // Subtle border for academic preview
        borderRadius: mode === 'dashboard' ? '8px' : '0',
        display: 'flex',       // Center content
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    };

    const CaptionBlock = () => {
        if (!caption && mode === 'academic') {
            return (
                <figcaption style={{
                    marginTop: '10px',
                    textAlign: 'center',
                    fontFamily: theme.fontFamily,
                    fontSize: '14px',
                    color: '#374151',
                    fontStyle: 'italic'
                }}>
                    Figure: {data.title}
                </figcaption>
            );
        }
        if (caption) {
            return (
                <figcaption style={{
                    marginTop: '10px',
                    textAlign: 'center',
                    fontFamily: theme.fontFamily,
                    fontSize: '14px',
                    color: mode === 'academic' ? '#374151' : '#9CA3AF',
                }}>
                    {caption}
                </figcaption>
            );
        }
        return null;
    };

    return (
        <figure className={className} style={{ margin: 0, width: '100%', height: className?.includes('h-') ? undefined : 'auto' }}>
            <div style={containerStyle}>
                {data.imageBase64 ? (
                    <img
                        src={`data:image/png;base64,${data.imageBase64}`}
                        alt={data.title}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <ReactECharts
                        option={options}
                        style={{ height: '100%', width: '100%' }}
                    />
                )}
            </div>
            <CaptionBlock />
        </figure>
    );
};

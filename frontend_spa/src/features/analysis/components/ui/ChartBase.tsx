import { useEffect, useState, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { registerMacOSThemes } from '../../lib/echarts-macos-theme';

// Ensure themes are registered once globally (or at least before render)
let isThemeRegistered = false;

interface ChartBaseProps {
    option: any;
    height?: string | number;
    className?: string;
    style?: React.CSSProperties;
    onEvents?: Record<string, Function>;
}

export const ChartBase = forwardRef<ReactECharts, ChartBaseProps>(({
    option,
    height = 320,
    className = "",
    style = {},
    onEvents
}, ref) => {

    const [currentTheme, setCurrentTheme] = useState<'macos-light' | 'macos-dark'>('macos-light');

    // 1. One-time Registration
    useEffect(() => {
        if (!isThemeRegistered) {
            registerMacOSThemes();
            isThemeRegistered = true;
        }
    }, []);

    // 2. Theme Switching Logic
    useEffect(() => {
        // Initial detection
        const updateTheme = () => {
            const isDark = document.documentElement.classList.contains('dark');
            const newTheme = isDark ? 'macos-dark' : 'macos-light';
            // console.log("ChartBase: Switching Theme to", newTheme);
            setCurrentTheme(newTheme);
        };

        updateTheme();

        // Observer for class changes on <html> (for dark mode toggle)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTheme();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <ReactECharts
            ref={ref}
            option={option}
            theme={currentTheme}
            style={{ height, ...style }}
            className={className}
            onEvents={onEvents}
            notMerge={true} // Ensure clean updates
            lazyUpdate={true} // Performance
        />
    );
});

ChartBase.displayName = "ChartBase";

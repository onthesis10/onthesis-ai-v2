
import type { VisualizationMode } from '../types';

export const getExportConfig = (mode: VisualizationMode) => {
    if (mode === 'academic') {
        return {
            show: true,
            feature: {
                saveAsImage: {
                    type: 'png',
                    title: 'Save as PNG (Transparent)',
                    backgroundColor: 'transparent', // Transparent background for high-quality usage
                    pixelRatio: 3 // Higher resolution
                }
            }
        };
    } else {
        return {
            show: true,
            feature: {
                saveAsImage: {
                    type: 'png',
                    title: 'Save as PNG (Transparent)',
                    backgroundColor: 'transparent',
                    pixelRatio: 3
                }
            }
        };
    }
};

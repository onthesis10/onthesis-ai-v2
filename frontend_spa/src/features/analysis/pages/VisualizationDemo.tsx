import { useState } from 'react';
import { ChartRenderer } from '../visualization/ChartRenderer';
import { normalizeData } from '../visualization/utils/normalizeData';
import type { VisualizationMode } from '../visualization/types';

const VisualizationDemo = () => {
    const [mode, setMode] = useState<VisualizationMode>('dashboard');

    const rawData1 = {
        title: 'Stress Level Distribution',
        subtext: 'n = 120 respondents',
        xLabel: 'Stress Category',
        yLabel: 'Number of Students',
        categories: ['Low', 'Moderate', 'High', 'Very High'],
        values: [45, 30, 25, 20],
        n: 120
    };

    const rawData2 = {
        title: 'Weekly Study Hours',
        xLabel: 'Hours per Week',
        yLabel: 'Frequency',
        categories: ['0-5', '6-10', '11-15', '16-20', '20+'],
        values: [10, 25, 40, 30, 15]
    };

    const data1 = normalizeData(rawData1);
    const data2 = normalizeData(rawData2);

    return (
        <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
            <h1 className="text-2xl font-bold mb-4">Visualization Architecture Demo</h1>

            <div className="mb-4">
                <button
                    onClick={() => setMode('dashboard')}
                    className={`px-4 py-2 mr-2 rounded ${mode === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                    Dashboard Mode
                </button>
                <button
                    onClick={() => setMode('academic')}
                    className={`px-4 py-2 rounded ${mode === 'academic' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                    Academic Mode
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Chart 1 */}
                <div>
                    <h2 className="text-lg font-semibold mb-2">Scenario 1: Categorical Data</h2>
                    <ChartRenderer
                        data={data1}
                        mode={mode}
                        height="400px"
                        caption="Figure 1. Distribution of student stress levels based on DASS-21."
                    />
                </div>

                {/* Chart 2 */}
                <div>
                    <h2 className="text-lg font-semibold mb-2">Scenario 2: Histogram (Missing 'n')</h2>
                    <ChartRenderer
                        data={data2}
                        mode={mode}
                        height="400px"
                        caption="Figure 2. Frequency of weekly study hours among participants."
                    />
                </div>
            </div>
        </div>
    );
};

export default VisualizationDemo;

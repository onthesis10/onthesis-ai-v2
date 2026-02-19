import React from 'react';
import { cn } from '@/lib/utils';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';

interface WeeklyHeatmapProps {
    data: { date: string; count: number }[];
}

export function WeeklyHeatmap({ data }: WeeklyHeatmapProps) {
    // Transformation for heatmap (if needed, currently it expects standard format)
    // We might want to limit to last 3 months or so to fit nicely

    return (
        <div className="p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Writing Consistency</h4>
            <div className="w-full overflow-x-auto">
                <CalendarHeatmap
                    startDate={new Date(new Date().setMonth(new Date().getMonth() - 3))}
                    endDate={new Date()}
                    values={data}
                    classForValue={(value) => {
                        if (!value) {
                            return 'color-empty fill-slate-100 dark:fill-slate-800';
                        }
                        if (value.count < 30) return 'text-blue-200 fill-blue-200';
                        if (value.count < 60) return 'text-blue-400 fill-blue-400';
                        if (value.count < 120) return 'text-blue-600 fill-blue-600';
                        return 'text-blue-800 fill-blue-800';
                    }}
                    tooltipDataAttrs={(value: any) => {
                        return {
                            'data-tooltip-id': 'heatmap-tooltip',
                            'data-tooltip-content': value && value.date ? `${value.date}: ${value.count} mins` : 'No data',
                        } as any;
                    }}
                    showWeekdayLabels={true}
                />
                <Tooltip id="heatmap-tooltip" />
            </div>
        </div>
    );
}

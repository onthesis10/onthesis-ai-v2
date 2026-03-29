import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { format, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import { id } from "date-fns/locale";

interface HeatmapDataPoint {
    date: string;
    count: number;
}

export function ProductivityChart({ chartData }: { chartData?: { labels: string[], data: number[] } }) {
    const { theme } = useThemeStore();
    const [hoveredDay, setHoveredDay] = useState<{ date: Date; count: number; x: number; y: number } | null>(null);

    // 1. Process Data
    const heatmapData = useMemo(() => {
        if (!chartData?.labels) return [];
        return chartData.labels.map((label, i) => ({
            date: label,
            count: chartData.data[i] || 0
        }));
    }, [chartData]);

    // 2. Generate Grid (Last 12 Months)
    const { weeks, monthLabels } = useMemo(() => {
        const end = new Date();
        const start = subMonths(end, 12);
        
        // Start on Monday (weekStartsOn: 1)
        const startDate = startOfWeek(start, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: startDate, end });

        const weeksArr: Date[][] = [];
        let currentWeek: Date[] = [];

        days.forEach((day, i) => {
            currentWeek.push(day);
            if (currentWeek.length === 7 || i === days.length - 1) {
                weeksArr.push(currentWeek);
                currentWeek = [];
            }
        });

        // Generate Month Labels
        const labels: { label: string; x: number }[] = [];
        let lastMonth = -1;
        weeksArr.forEach((week, weekIdx) => {
            const firstDayOfWeek = week[0];
            const month = firstDayOfWeek.getMonth();
            if (month !== lastMonth) {
                labels.push({
                    label: format(firstDayOfWeek, 'MMM', { locale: id }),
                    x: weekIdx * 15
                });
                lastMonth = month;
            }
        });

        return { weeks: weeksArr, monthLabels: labels };
    }, []);

    // 3. Color Intensity Logic
    const getColor = (count: number) => {
        if (count === 0) return theme === 'dark' ? '#161b22' : '#ebedf0';
        if (count <= 30) return '#0e4429';
        if (count <= 60) return '#006d32';
        if (count <= 120) return '#26a641';
        return '#39d353';
    };

    const config = {
        light: { cardClass: "card-scholar", titleClass: "text-[#0E5E9C]" },
        dark: { cardClass: "card-research", titleClass: "text-[#00C2FF] glow-text" },
        happy: { cardClass: "card-creative", titleClass: "text-[#0E5E9C]" }
    }[theme];

    return (
        <div className={cn("p-6 h-full flex flex-col relative", config.cardClass)}>
            <div className="flex items-center justify-between mb-6">
                <h3 className={cn("text-lg font-bold tracking-tight", config.titleClass)}>
                    Productivity Flow
                </h3>
                <div className="flex gap-2 items-center text-[10px] text-muted-foreground uppercase tracking-widest">
                    <span>Less</span>
                    <div className="flex gap-1">
                        {[0, 20, 50, 90, 150].map(v => (
                            <div key={v} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: getColor(v) }} />
                        ))}
                    </div>
                    <span>More</span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center justify-center">
                <div className="inline-block relative">
                    <svg width={weeks.length * 15 + 30} height={130} className="overflow-visible">
                        {/* Days Label */}
                        <g transform="translate(0, 20)" className="text-[9px] fill-muted-foreground font-medium">
                            <text y={10}>Sen</text>
                            <text y={24}>Sel</text>
                            <text y={38}>Rab</text>
                            <text y={52}>Kam</text>
                            <text y={66}>Jum</text>
                            <text y={80}>Sab</text>
                            <text y={94}>Min</text>
                        </g>

                        {/* Month Labels */}
                        <g transform="translate(30, 12)" className="text-[10px] fill-muted-foreground font-medium">
                            {monthLabels.map((m, i) => (
                                <text key={i} x={m.x}>{m.label}</text>
                            ))}
                        </g>

                        {/* The Grid */}
                        <g transform="translate(30, 20)">
                            {weeks.map((week, weekIdx) => (
                                <g key={weekIdx} transform={`translate(${weekIdx * 15}, 0)`}>
                                    {week.map((day, dayIdx) => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const dataPoint = heatmapData.find(d => d.date === dateStr);
                                        const count = dataPoint?.count || 0;
                                        
                                        return (
                                            <rect
                                                key={dayIdx}
                                                y={dayIdx * 14}
                                                width={12}
                                                height={12}
                                                rx={2}
                                                fill={getColor(count)}
                                                className="transition-colors duration-200 cursor-pointer hover:stroke-primary hover:stroke-2"
                                                onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoveredDay({ date: day, count, x: rect.left, y: rect.top });
                                                }}
                                                onMouseLeave={() => setHoveredDay(null)}
                                            />
                                        );
                                    })}
                                </g>
                            ))}
                        </g>
                    </svg>
                </div>
            </div>

            {/* Custom Tooltip */}
            {hoveredDay && (
                <div 
                    className="fixed z-50 pointer-events-none bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-xl border border-border text-xs animate-in fade-in zoom-in-95 duration-200"
                    style={{ 
                        left: hoveredDay.x + 15, 
                        top: hoveredDay.y - 40 
                    }}
                >
                    <p className="font-bold">{format(hoveredDay.date, 'eeee, d MMMM yyyy', { locale: id })}</p>
                    <p className="opacity-80">{hoveredDay.count} menit menulis</p>
                </div>
            )}
        </div>
    );
}

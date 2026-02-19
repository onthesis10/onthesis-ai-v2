import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, Area, AreaChart } from "recharts";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";

const data = [
    { day: "Mon", words: 400 },
    { day: "Tue", words: 300 },
    { day: "Wed", words: 750 },
    { day: "Thu", words: 500 },
    { day: "Fri", words: 900 },
    { day: "Sat", words: 200 },
    { day: "Sun", words: 600 },
];

export function ProductivityChart() {
    const { theme } = useThemeStore();

    // Mode-specific configurations
    const config = {
        light: {
            stroke: "#0E5E9C",
            fill: "url(#colorLight)",
            cardClass: "card-scholar",
            titleClass: "text-[#0E5E9C]"
        },
        dark: {
            stroke: "#00C2FF",
            fill: "url(#colorDark)",
            cardClass: "card-research",
            titleClass: "text-[#00C2FF] glow-text"
        },
        happy: {
            stroke: "#2EC4B6",
            fill: "url(#colorHappy)",
            cardClass: "card-creative",
            titleClass: "text-[#0E5E9C]"
        }
    }[theme];

    return (
        <div className={cn("p-6 h-full flex flex-col", config.cardClass)}>
            <div className="flex items-center justify-between mb-6">
                <h3 className={cn("text-lg font-bold tracking-tight", config.titleClass)}>
                    Productivity Flow
                </h3>
                <div className="flex gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-primary/10 text-primary">
                        +12% vs last week
                    </span>
                </div>
            </div>

            <div className="flex-1 w-full h-[250px] min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0E5E9C" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#0E5E9C" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorHappy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2EC4B6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#2EC4B6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="day"
                            stroke={theme === 'dark' ? '#475569' : '#94a3b8'}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: theme === 'dark' ? '#0F172A' : '#ffffff',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}
                            cursor={{ stroke: config.stroke, strokeWidth: 2, strokeDasharray: '5 5' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="words"
                            stroke={config.stroke}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={config.fill}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

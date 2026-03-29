import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { FileDown, Target, Brain, PenTool, Type, Loader2 } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useProject } from '../writing/context/ProjectContext.jsx';
import html2canvas from 'html2canvas';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e'];

export default function AnalyticsPage() {
    const { theme } = useThemeStore();
    const { project, chapters } = useProject();
    const [isExporting, setIsExporting] = useState(false);

    // ── Real data from API ──
    const [productivityStats, setProductivityStats] = useState(null);
    const [heatmapData, setHeatmapData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const isDark = theme === 'dark';

    // Fetch real productivity data from API
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [statsRes, heatmapRes] = await Promise.all([
                    fetch('/api/productivity/stats').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('/api/productivity/heatmap').then(r => r.ok ? r.json() : []).catch(() => []),
                ]);
                setProductivityStats(statsRes);
                setHeatmapData(Array.isArray(heatmapRes) ? heatmapRes : []);
            } catch (err) {
                console.error('[AnalyticsPage] Failed to load data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Process chapter word counts from REAL chapter data
    const calculateApproximateWords = (html) => {
        if (!html) return 0;
        const text = html.replace(/<[^>]+>/g, ' ');
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    const chapterWordCounts = chapters?.map((ch, idx) => ({
        name: `Bab ${idx + 1}`,
        title: ch.title,
        words: calculateApproximateWords(ch.content || ch.html || ''),
    })) || [];

    const totalWords = chapterWordCounts.reduce((acc, ch) => acc + ch.words, 0);
    const progressPerc = Math.min(100, Math.round((totalWords / 15000) * 100)); // Assume 15k goal

    // Build velocity data from heatmap (daily word count proxy)
    const velocityData = heatmapData.length > 0
        ? heatmapData.slice(-7).map(entry => ({
            date: new Date(entry.date || entry.day).toLocaleDateString('id-ID', { weekday: 'short' }),
            words: entry.words || Math.round((entry.duration || entry.seconds || 0) * 8), // ~8 words/min
        }))
        : [];

    // Stats from API
    const totalSeconds = productivityStats?.total_seconds || 0;
    const avgVelocity = velocityData.length > 0
        ? Math.round(velocityData.reduce((a, b) => a + b.words, 0) / velocityData.length)
        : 0;

    const streak = productivityStats?.streak?.current_streak || 0;

    // --- EXPORT PDF ---
    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const el = document.getElementById('analytics-report');
            const canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: isDark ? '#0F172A' : '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = `Analytics-Report-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = imgData;
            link.click();
        } catch (err) {
            console.error("Failed to export PDF:", err);
            alert("Gagal melakukan export laporan.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`h-full w-full flex items-center justify-center ${isDark ? 'bg-[#0B1120]' : 'bg-[#FAFAFA]'}`}>
                <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            </div>
        );
    }

    return (
        <div className={`h-full w-full overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#0B1120] text-slate-200' : 'bg-[#FAFAFA] text-slate-800'}`}>
            <div className="max-w-6xl mx-auto p-8 font-sans space-y-8" id="analytics-report">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Advanced Analytics</h1>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Lacak produktivitas, velocity penulisan, dan progress naskah Anda.
                        </p>
                    </div>
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        Export Laporan
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-sky-500/10 text-sky-500 rounded-md"><PenTool size={16} /></div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Kata</span>
                        </div>
                        <h3 className="text-3xl font-bold">{totalWords.toLocaleString()}</h3>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>dari {chapters?.length || 0} bab</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-md"><Type size={16} /></div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Avg Velocity</span>
                        </div>
                        <h3 className="text-3xl font-bold">{avgVelocity} <span className="text-base font-normal opacity-50">w/day</span></h3>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-md"><Brain size={16} /></div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Streak</span>
                        </div>
                        <h3 className="text-3xl font-bold">{streak}<span className="text-base font-normal opacity-50"> hari</span></h3>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md"><Target size={16} /></div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Target Penulisan</span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{progressPerc}%</span>
                            <span className="text-xs opacity-50">15.000 Kata</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPerc}%` }} />
                        </div>
                    </div>
                </div>

                {/* Primary Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Writing Velocity Chart */}
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <h3 className="text-sm font-semibold mb-4">Writing Velocity (7 Hari Terakhir)</h3>
                        <div className="h-64">
                            {velocityData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={velocityData}>
                                        <defs>
                                            <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} dx={-10} />
                                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="words" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorWords)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Belum ada data velocity. Mulai menulis untuk melihat grafik.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Word Count per Chapter */}
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <h3 className="text-sm font-semibold mb-4">Distribusi Kata per Bab</h3>
                        <div className="h-64 flex items-center justify-center">
                            {chapterWordCounts.length > 0 && totalWords > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chapterWordCounts}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="words"
                                        >
                                            {chapterWordCounts.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => `${value} kata`}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Belum ada data bab.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sessions / Activity chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Total Time Card */}
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <h3 className="text-sm font-semibold mb-4">Total Waktu Menulis</h3>
                        <div className="h-64 flex flex-col items-center justify-center">
                            <div className="text-6xl font-bold tabular-nums">
                                {Math.floor(totalSeconds / 3600)}<span className="text-2xl opacity-50 font-normal">h</span>
                                {' '}
                                {Math.floor((totalSeconds % 3600) / 60)}<span className="text-2xl opacity-50 font-normal">m</span>
                            </div>
                            <p className={`text-sm mt-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                Level: {productivityStats?.level?.current_level || '-'} {productivityStats?.level?.icon || ''}
                            </p>
                        </div>
                    </div>

                    {/* Chapter bar chart */}
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <h3 className="text-sm font-semibold mb-4">Kata per Bab (Bar Chart)</h3>
                        <div className="h-64">
                            {chapterWordCounts.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chapterWordCounts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: isDark ? '#ffffff05' : '#00000005' }}
                                            formatter={(value) => `${value} kata`}
                                        />
                                        <Bar dataKey="words" name="Kata" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Belum ada data bab.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

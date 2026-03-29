// ─── PluginManager — Phase 4: Plugin Settings UI ───
// Shows installed plugins with toggle switches, displayed inside ProjectSettingsModal.

import React, { useState, useEffect } from 'react';
import { Puzzle, Check, X, Zap, BookOpen, PenTool, Brain } from 'lucide-react';
import { pluginRegistry } from '../core/PluginRegistry.js';
import { useThemeStore } from '@/store/themeStore';

const categoryIcons = {
    'AI': Zap,
    'Writing': PenTool,
    'Academic': BookOpen,
};

export default function PluginManager() {
    const { theme } = useThemeStore();
    const [plugins, setPlugins] = useState(pluginRegistry.getAll());
    const isDark = theme === 'dark';

    useEffect(() => {
        const unsub = pluginRegistry.subscribe((all) => setPlugins(all));
        return unsub;
    }, []);

    const handleToggle = (pluginId, isActive) => {
        if (isActive) {
            pluginRegistry.deactivate(pluginId);
        } else {
            pluginRegistry.activate(pluginId);
        }
    };

    // Group by category
    const grouped = plugins.reduce((acc, p) => {
        const cat = p.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <Puzzle size={18} className="text-sky-500" />
                <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Extension Manager
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-500' : 'bg-gray-100 text-gray-500'}`}>
                    {plugins.length} plugins
                </span>
            </div>

            {/* Categories */}
            {Object.entries(grouped).map(([category, categoryPlugins]) => {
                const CatIcon = categoryIcons[category] || Brain;
                return (
                    <div key={category}>
                        {/* Category header */}
                        <div className="flex items-center gap-2 mb-2">
                            <CatIcon size={13} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {category}
                            </span>
                        </div>

                        {/* Plugin cards */}
                        <div className="space-y-1.5">
                            {categoryPlugins.map(plugin => (
                                <div
                                    key={plugin.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${plugin.isActive
                                            ? isDark ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50/50 border-sky-200/50'
                                            : isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50/50 border-gray-100'
                                        }`}
                                >
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[12px] font-medium ${plugin.isActive
                                                    ? isDark ? 'text-slate-200' : 'text-slate-700'
                                                    : isDark ? 'text-slate-400' : 'text-gray-500'
                                                }`}>
                                                {plugin.name}
                                            </span>
                                            <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>
                                                v{plugin.version}
                                            </span>
                                        </div>
                                        <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                            {plugin.description}
                                        </p>
                                    </div>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggle(plugin.id, plugin.isActive)}
                                        className={`w-9 h-5 rounded-full flex items-center transition-all duration-200 shrink-0 ${plugin.isActive
                                                ? 'bg-sky-500 justify-end'
                                                : isDark ? 'bg-white/10 justify-start' : 'bg-gray-200 justify-start'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 mx-0.5 rounded-full flex items-center justify-center transition-all ${plugin.isActive ? 'bg-white' : isDark ? 'bg-slate-600' : 'bg-white shadow-sm'
                                            }`}>
                                            {plugin.isActive
                                                ? <Check size={8} className="text-sky-500" />
                                                : <X size={8} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
                                            }
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

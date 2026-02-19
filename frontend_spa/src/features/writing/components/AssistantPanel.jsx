// FILE: src/components/AssistantPanel.jsx

import React, { useState } from 'react';
import {
    Sparkles, MessageSquare, BookOpen,
    BarChart2, ShieldCheck, GraduationCap,
    Cpu, Layers
} from 'lucide-react';

import GeneratorTab from './Assistant/GeneratorTab';
// import ChatInterface from './Assistant/ChatInterface'; // DEPRECATED
import { OrchestratorChat } from '../../orchestrator/components/OrchestratorChat';
import ToolsTab from './Assistant/ToolsTab';
import AnalysisTab from './Assistant/AnalysisTab';
import DefenseTab from './Assistant/DefenseTab';
import LogicTab from './Assistant/LogicTab';

export default function AssistantPanel(props) {
    const { activeTab, setActiveTab } = props;
    const [mode, setMode] = useState('write');

    const tabs = {
        write: [
            { id: 'generator', icon: Sparkles, label: 'Draft' },
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'tools', icon: BookOpen, label: 'Tools' },
        ],
        review: [
            { id: 'analysis', icon: BarChart2, label: 'Data' },
            { id: 'logic', icon: ShieldCheck, label: 'Audit' },
            { id: 'defense', icon: GraduationCap, label: 'Sidang' }
        ]
    };

    return (
        // PANEL CONTAINER
        <div className="flex flex-col h-full bg-transparent text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors duration-300">

            {/* 1. TOP HEADER: MODE SWITCHER (Mac Segmented Control - Neutral) */}
            <div className="pt-4 pb-2 px-3 shrink-0">
                <div className="flex w-full bg-gray-200/60 dark:bg-black/20 p-0.5 rounded-lg">
                    <ModeBtn
                        isActive={mode === 'write'}
                        onClick={() => { setMode('write'); setActiveTab('generator'); }}
                        icon={Cpu} label="WRITER"
                    />
                    <ModeBtn
                        isActive={mode === 'review'}
                        onClick={() => { setMode('review'); setActiveTab('analysis'); }}
                        icon={Layers} label="REVIEWER"
                    />
                </div>
            </div>

            {/* 2. SUB-NAVIGATION (Compact Rectangular + Ocean Blue Icons) */}
            <div className="px-3 pb-3 shrink-0">
                <div className="grid grid-cols-3 gap-1">
                    {tabs[mode].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                // LAYOUT: Horizontal Compact (Persegi Panjang)
                                className={`flex items-center justify-center gap-2 py-1.5 px-1 rounded-md transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                            >
                                {/* Active Indicator Bar (Subtle Blue Bottom Border) */}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-cyan-500" />
                                )}

                                {/* ICON: OCEAN BLUE saat Aktif */}
                                <Icon
                                    size={14}
                                    strokeWidth={2}
                                    className={`transition-colors ${isActive
                                        ? 'text-blue-600 dark:text-cyan-400 drop-shadow-sm' // Ocean Blue Active
                                        : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-cyan-400' // Gray Inactive -> Blue Hover
                                        }`}
                                />

                                {/* TEXT */}
                                <span className={`text-[10px] font-bold tracking-wide uppercase truncate ${isActive
                                    ? 'text-gray-800 dark:text-gray-100'
                                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                                    }`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Separator */}
            <div className="h-[1px] w-full bg-gray-200/50 dark:bg-white/10 mb-1"></div>

            {/* 3. DYNAMIC CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-transparent px-1">
                <div className="h-full w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
                    {activeTab === 'generator' && <GeneratorTab {...props} />}
                    {activeTab === 'chat' && (
                        <OrchestratorChat
                            projectId={props.projectData?.id}
                            projectTitle={props.projectData?.title}
                            isPro={props.isPro}
                            projectData={props.projectData} // Pass full context
                        />
                    )}
                    {activeTab === 'tools' && <ToolsTab {...props} />}

                    {activeTab === 'analysis' && <AnalysisTab projectId={props.projectData?.id} onInsert={props.onInsert} />}
                    {activeTab === 'logic' && <LogicTab projectData={props.projectData} />}
                    {activeTab === 'defense' && <DefenseTab projectData={props.projectData} />}
                </div>
            </div>
        </div>
    );
}

// Mode Button (Tetap Neutral Mac Style)
function ModeBtn({ isActive, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-[10px] font-bold tracking-wide transition-all duration-200 ${isActive
                ? 'bg-white dark:bg-[#636366] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
        >
            <Icon size={14} strokeWidth={2} />
            {label}
        </button>
    );
}
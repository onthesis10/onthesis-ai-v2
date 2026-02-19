// FILE: src/components/ProjectSettingsModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, User, Target, BookOpen, Settings, 
    Save, CheckCircle2, ChevronRight, LayoutGrid, Check, ChevronDown, Loader2 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.jsx';

// --- 1. CUSTOM SELECT COMPONENT (Safe Mode) ---
const CustomSelect = ({ label, name, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fallback safe jika value undefined
    const safeValue = value || options[0]?.value; 
    const selectedOption = options.find(opt => opt.value === safeValue) || options[0];

    const handleSelect = (optionValue) => {
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1 mb-1.5 block">{label}</label>}
            
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-full flex items-center justify-between bg-white dark:bg-white/5 border text-gray-800 dark:text-gray-100 text-[13px] p-2.5 rounded-lg outline-none transition-all cursor-pointer ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
            >
                <span className="truncate">{selectedOption?.label || "Pilih..."}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#252525] border border-gray-100 dark:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[200px] overflow-y-auto custom-scrollbar">
                    <div className="p-1">
                        {options.map((option) => (
                            <div 
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`px-3 py-2 rounded-md text-[13px] cursor-pointer flex items-center justify-between transition-colors ${
                                    safeValue === option.value 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            >
                                {option.label}
                                {safeValue === option.value && <Check size={14} className="opacity-70"/>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 2. MAIN MODAL ---
export default function ProjectSettingsModal({ isOpen, onClose }) {
    const { project, updateProjectMeta, isSaving } = useProject();
    const [activeTab, setActiveTab] = useState('identity');

    // INISIALISASI STATE YANG AMAN (Biar gak crash Uncontrolled Input)
    const [formData, setFormData] = useState({
        student_name: '', university: '', degree_level: 'S1', title: '',
        problem_statement: '', research_objectives: '', significance: '',
        theoretical_framework: '', variables_indicators: '',
        methodology: 'quantitative', population_sample: '', data_analysis: ''
    });

    // SYNC DATA SAAT MODAL DIBUKA
    useEffect(() => {
        if (isOpen && project) {
            setFormData({
                student_name: project.student_name || '',
                university: project.university || '',
                degree_level: project.degree_level || 'S1',
                title: project.title || '',
                problem_statement: project.problem_statement || '',
                research_objectives: project.research_objectives || '',
                significance: project.significance || '',
                theoretical_framework: project.theoretical_framework || '',
                variables_indicators: project.variables_indicators || '',
                methodology: project.methodology || 'quantitative',
                population_sample: project.population_sample || '',
                data_analysis: project.data_analysis || ''
            });
        }
    }, [isOpen, project]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        updateProjectMeta(formData);
        onClose();
    };

    const tabs = [
        { id: 'identity', label: 'Identitas & Judul', icon: User },
        { id: 'problem', label: 'Masalah & Tujuan', icon: Target },
        { id: 'theory', label: 'Landasan Teori', icon: BookOpen },
        { id: 'method', label: 'Metodologi', icon: LayoutGrid },
    ];

    const inputClass = "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 text-[13px] p-2.5 rounded-lg outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400";
    const labelClass = "text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1 mb-1.5 block";
    const textAreaClass = `${inputClass} resize-none custom-scrollbar`;

    const degreeOptions = [
        { value: 'S1', label: 'S1 - Sarjana' },
        { value: 'S2', label: 'S2 - Magister' },
        { value: 'S3', label: 'S3 - Doktoral' }
    ];

    const methodOptions = [
        { value: 'quantitative', label: 'Kuantitatif (Statistik)' },
        { value: 'qualitative', label: 'Kualitatif (Deskriptif)' },
        { value: 'mix_method', label: 'Mixed Method (Campuran)' },
        { value: 'rnd', label: 'R&D (Pengembangan)' },
        { value: 'slr', label: 'Systematic Literature Review' }
    ];

    // Gunakan Portal agar Z-Index tidak tertutup Sidebar
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
            
            <div className="w-full max-w-4xl h-[80vh] bg-[#F5F5F7] dark:bg-[#1E1E1E] border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                
                {/* A. SIDEBAR MENU */}
                <div className="w-64 bg-[#F5F5F7] dark:bg-[#252525] border-r border-gray-200 dark:border-black/20 flex flex-col shrink-0">
                    <div className="h-14 px-5 flex items-center border-b border-gray-200/50 dark:border-white/5 shrink-0">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Settings size={16} className="text-gray-500" />
                            Pengaturan
                        </span>
                    </div>

                    <div className="p-3 space-y-1 overflow-y-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                                    <span className="text-xs font-medium flex-1">{tab.label}</span>
                                    {isActive && <ChevronRight size={14} className="opacity-50" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* B. CONTENT AREA */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1C1C1E] min-w-0">
                    
                    {/* Header */}
                    <div className="h-14 px-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/50 dark:bg-white/5 backdrop-blur-xl">
                        <h2 className="text-base font-bold text-gray-800 dark:text-white truncate">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <div className="flex items-center gap-3">
                            {isSaving && (
                                <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1 animate-pulse">
                                    <Loader2 size={12} className="animate-spin" /> Menyimpan...
                                </span>
                            )}
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <div className="max-w-2xl mx-auto space-y-8">
                            
                            {/* PENTING: Tambahkan || '' di setiap value agar tidak crash uncontrolled */}
                            
                            {activeTab === 'identity' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className={labelClass}>Nama Mahasiswa</label>
                                            <input className={inputClass} name="student_name" value={formData.student_name || ''} onChange={handleChange} placeholder="Nama Lengkap..." />
                                        </div>
                                        <div>
                                            <CustomSelect label="Jenjang Studi" name="degree_level" value={formData.degree_level} options={degreeOptions} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Universitas / Instansi</label>
                                        <input className={inputClass} name="university" value={formData.university || ''} onChange={handleChange} placeholder="Nama Universitas..." />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Judul Penelitian</label>
                                        <textarea className={`${textAreaClass} min-h-[100px]`} name="title" value={formData.title || ''} onChange={handleChange} placeholder="Tulis judul lengkap skripsi/tesis..." />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'problem' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className={labelClass}>Rumusan Masalah</label>
                                        <textarea className={`${textAreaClass} min-h-[120px]`} name="problem_statement" value={formData.problem_statement || ''} onChange={handleChange} placeholder="Daftar pertanyaan penelitian..." />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Tujuan Penelitian</label>
                                        <textarea className={`${textAreaClass} min-h-[100px]`} name="research_objectives" value={formData.research_objectives || ''} onChange={handleChange} placeholder="Tujuan yang ingin dicapai..." />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Signifikansi / Manfaat</label>
                                        <textarea className={`${textAreaClass} min-h-[80px]`} name="significance" value={formData.significance || ''} onChange={handleChange} placeholder="Manfaat teoritis & praktis..." />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'theory' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <label className={labelClass}>Grand Theory</label>
                                        <textarea className={`${textAreaClass} min-h-[100px]`} name="theoretical_framework" value={formData.theoretical_framework || ''} onChange={handleChange} placeholder="Teori utama yang digunakan..." />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Variabel & Indikator</label>
                                        <textarea className={`${textAreaClass} min-h-[120px]`} name="variables_indicators" value={formData.variables_indicators || ''} onChange={handleChange} placeholder="Definisi operasional variabel..." />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'method' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div>
                                        <CustomSelect label="Pendekatan Penelitian" name="methodology" value={formData.methodology} options={methodOptions} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Populasi & Sampel</label>
                                        <textarea className={`${textAreaClass} min-h-[80px]`} name="population_sample" value={formData.population_sample || ''} onChange={handleChange} placeholder="Detail populasi dan teknik sampling..." />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Teknik Analisis Data</label>
                                        <textarea className={`${textAreaClass} min-h-[80px]`} name="data_analysis" value={formData.data_analysis || ''} onChange={handleChange} placeholder="Teknik analisis yang dipakai..." />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#252525] flex justify-end gap-3 shrink-0">
                        <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg">
                            Batal
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 transform">
                            <Save size={14} /> Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
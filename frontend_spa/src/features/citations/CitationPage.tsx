import React, { useEffect, useState, useRef } from 'react';
import { citationService, Project, Citation } from './services/citationService';
import { ReferenceList } from './components/ReferenceList';
import { SearchModal } from './components/SearchModal';
import { ReferenceModal } from './components/ReferenceModal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Search, Globe, Plus, FileUp, Download, ChevronDown, Folder, Trash2, LayoutGrid, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

function CitationPageContent() {
    const { success, error, info } = useToast();
    const { theme } = useThemeStore();
    const isHappy = theme === 'happy';

    // --- STATE MANAGEMENT ---
    const [projects, setProjects] = useState<Project[]>([]);
    const [citations, setCitations] = useState<Citation[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [citationStyle, setCitationStyle] = useState('apa');

    // UI State
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isRefModalOpen, setIsRefModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // --- DATA FETCHING ---
    useEffect(() => {
        const unsubscribe = citationService.subscribeToProjects((data) => {
            setProjects(data);
            if (!activeProjectId && data.length > 0) setActiveProjectId(data[0].id);
            if (activeProjectId && !data.find(p => p.id === activeProjectId)) setActiveProjectId(null);
        });
        return () => unsubscribe();
    }, [activeProjectId]);

    useEffect(() => {
        const unsubscribe = citationService.subscribeToAllUserCitations(setCitations);
        return () => unsubscribe();
    }, []);

    // Close Dropdown Outside Click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- HANDLERS ---
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await citationService.createProject(newProjectTitle); setNewProjectTitle(''); setIsProjectModalOpen(false); success('Project created'); } catch (err) { error('Failed'); }
    };
    const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Delete project?')) { await citationService.deleteProject(id); if (activeProjectId === id) setActiveProjectId(null); success('Deleted'); }
    };
    const handleAddReference = async (data: any) => {
        if (!activeProjectId) return error('Select project');
        await citationService.addCitation({ ...data, projectId: activeProjectId }); success('Added');
    };
    const handleDeleteReference = async (id: string) => { if (window.confirm('Delete?')) await citationService.deleteCitation(id); };
    const handleCopyReference = (ref: Citation) => { navigator.clipboard.writeText(`${ref.author} (${ref.year}). ${ref.title}.`); success('Copied'); };
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) info('Processing PDF...'); };

    // 🔥 LOGIC EXPORT YANG BENAR 🔥
    const handleExport = () => {
        const citationsToExport = activeProjectId ? citations.filter(c => c.projectId === activeProjectId) : [];
        if (!citationsToExport.length) return error('No citations to export');

        let ris = "";
        citationsToExport.forEach(r => { ris += `TY  - JOUR\nTI  - ${r.title}\nAU  - ${r.author}\nPY  - ${r.year}\nJO  - ${r.journal}\nAB  - ${r.notes}\nER  - \n\n`; });

        const blob = new Blob([ris], { type: "application/x-research-info-systems" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "references.ris";
        a.click();
        success('Exported to RIS');
    };

    // --- FILTERING ---
    const projectCitations = activeProjectId ? citations.filter(c => c.projectId === activeProjectId) : [];
    const filteredCitations = projectCitations.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const activeProject = projects.find(p => p.id === activeProjectId);

    // --- ✨ ANIMATION & THEME CONFIG (NEW) ✨ ---
    const animationStyles = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob {
        animation: blob 10s infinite;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
    `;

    const activeTheme = theme as 'light' | 'dark' | 'happy' || 'light';
    const themeConfig = {
        light: {
            blob1: "bg-blue-300/40 mix-blend-multiply",
            blob2: "bg-purple-300/40 mix-blend-multiply",
            blob3: "bg-pink-300/40 mix-blend-multiply",
        },
        dark: {
            blob1: "bg-indigo-600/20",
            blob2: "bg-blue-600/20",
            blob3: "bg-violet-600/20",
        },
        happy: {
            blob1: "bg-orange-300/40 mix-blend-multiply",
            blob2: "bg-yellow-300/40 mix-blend-multiply",
            blob3: "bg-rose-300/40 mix-blend-multiply",
        }
    }[activeTheme];

    return (
        <div className={`flex h-screen w-full transition-colors duration-700 ease-in-out overflow-hidden relative font-sans selection:bg-primary/20 ${isHappy ? 'bg-[#FFFCF5] text-stone-800' : 'bg-background text-foreground'}`}>

            {/* Inject Animation Styles */}
            <style>{animationStyles}</style>

            {/* === ✨ DYNAMIC AMBIENT BACKGROUND (UPDATED) ✨ === */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Blob 1 (Top Left) */}
                <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[100px] animate-blob filter opacity-70 transition-colors duration-700 ${themeConfig.blob1}`} />

                {/* Blob 2 (Top Right - Delayed) */}
                <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[100px] animate-blob animation-delay-2000 filter opacity-70 transition-colors duration-700 ${themeConfig.blob2}`} />

                {/* Blob 3 (Bottom Left - Delayed More) */}
                <div className={`absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] animate-blob animation-delay-4000 filter opacity-70 transition-colors duration-700 ${themeConfig.blob3}`} />

                {/* Noise Overlay (Optional Texture for premium feel) */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
            </div>

            <main className="flex-1 flex flex-col min-w-0 relative z-10 h-full">

                {/* === FLOATING DOCK HEADER (Dead Center & macOS Style) === */}
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 pointer-events-none">
                    <div className={`pointer-events-auto w-full h-16 rounded-full glass-card flex items-center justify-between px-3 shadow-2xl shadow-black/10 border backdrop-blur-3xl transition-all hover:scale-[1.005] ${isHappy ? 'bg-white/60 border-orange-100/50' : 'bg-background/60 border-white/20 dark:border-white/10'}`}>

                        {/* LEFT: Project Dropdown (Pill Style) */}
                        <div className="relative shrink-0" ref={dropdownRef}>
                            <button
                                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                                className={`
                                    flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full transition-all duration-300 border
                                    ${isProjectMenuOpen
                                        ? (isHappy ? 'bg-orange-50 border-orange-200 text-stone-800' : 'bg-primary/10 border-primary/20 text-foreground')
                                        : 'bg-transparent border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}
                                `}
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${theme === 'happy' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-secondary text-foreground'}`}>
                                    <LayoutGrid className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col items-start text-left min-w-[80px]">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest opacity-50 leading-none mb-0.5 ${isHappy ? 'text-stone-500' : ''}`}>Project</span>
                                    <span className="text-xs font-bold truncate max-w-[100px] md:max-w-[140px]">
                                        {activeProject ? activeProject.title : 'Select...'}
                                    </span>
                                </div>
                                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu - Super Compact */}
                            {isProjectMenuOpen && (
                                <div className={`absolute top-full left-2 mt-4 w-60 p-1.5 rounded-2xl glass-card border shadow-xl animate-in fade-in slide-in-from-top-2 z-50 flex flex-col backdrop-blur-3xl ${isHappy ? 'bg-white/95 border-orange-100' : 'bg-background/80 border-white/20'}`}>
                                    <div className="max-h-[250px] overflow-y-auto custom-scroll flex flex-col gap-0.5">
                                        {projects.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => { setActiveProjectId(p.id); setIsProjectMenuOpen(false); }}
                                                className={`
                                                    group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all text-xs font-medium
                                                    ${activeProjectId === p.id
                                                        ? (isHappy ? 'bg-orange-50 text-orange-600 font-bold' : 'bg-primary/10 text-primary')
                                                        : (isHappy ? 'hover:bg-orange-50/50 text-stone-600' : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground')}
                                                `}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <Folder className={`w-3.5 h-3.5 ${isHappy ? 'opacity-50' : 'opacity-70'}`} />
                                                    <span className="truncate">{p.title}</span>
                                                </div>
                                                {activeProjectId !== p.id && (
                                                    <button onClick={(e) => handleDeleteProject(e, p.id)} className={`opacity-0 group-hover:opacity-100 p-1 transition-opacity ${isHappy ? 'hover:text-rose-500' : 'hover:text-red-500'}`}><Trash2 className="w-3 h-3" /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`h-px my-1.5 ${isHappy ? 'bg-orange-100' : 'bg-border/20'}`} />
                                    <button onClick={() => { setIsProjectMenuOpen(false); setIsProjectModalOpen(true); }} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isHappy ? 'text-orange-600 hover:bg-orange-50' : 'text-primary hover:bg-primary/5'}`}>
                                        <Plus className="w-3.5 h-3.5" /> New Project
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CENTER: Search Bar (Invisible Input Style) */}
                        <div className="flex-1 max-w-md mx-4 hidden md:block">
                            <div className={`relative group h-10 rounded-full transition-all duration-300 flex items-center border ${isHappy ? 'bg-white/50 hover:bg-white/80 border-transparent focus-within:border-orange-200 focus-within:shadow-orange-500/10' : 'bg-secondary/30 hover:bg-secondary/50 border-transparent focus-within:border-primary/20 focus-within:bg-background/80'}`}>
                                <Search className={`ml-3.5 w-4 h-4 transition-colors ${isHappy ? 'text-stone-400 group-focus-within:text-orange-500' : 'text-muted-foreground/50 group-focus-within:text-primary'}`} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search references..."
                                    className={`w-full bg-transparent border-none px-3 text-sm outline-none h-full rounded-full ${isHappy ? 'placeholder:text-stone-400 text-stone-700' : 'placeholder:text-muted-foreground/40'}`}
                                />
                            </div>
                        </div>

                        {/* RIGHT: Actions (Icon Only for cleaner look) */}
                        <div className="flex items-center gap-1.5 pr-1">
                            <button onClick={() => setIsSearchModalOpen(true)} className={`hidden sm:flex h-10 px-5 rounded-full shadow-lg items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform ${isHappy ? 'bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-orange-500/20' : 'btn-primary shadow-primary/20'}`}>
                                <Globe className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Discover</span>
                            </button>

                            <div className={`w-px h-6 mx-1 hidden sm:block ${isHappy ? 'bg-stone-200' : 'bg-border/30'}`} />

                            <button onClick={() => setIsRefModalOpen(true)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isHappy ? 'text-stone-400 hover:bg-white hover:text-orange-600' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`} title="Manual Add">
                                <Plus className="w-5 h-5" />
                            </button>
                            <button className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isHappy ? 'text-stone-400 hover:bg-white hover:text-orange-600' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`} title="Upload PDF">
                                <div className="relative">
                                    <FileUp className="w-5 h-5" />
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx" onChange={handleFileUpload} />
                                </div>
                            </button>

                            {/* TOMBOL EXPORT RIS (Dikembalikan ke Toolbar) */}
                            <button onClick={handleExport} disabled={!activeProjectId || filteredCitations.length === 0} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-30 ${isHappy ? 'text-stone-400 hover:bg-white hover:text-rose-500' : 'text-muted-foreground hover:bg-secondary hover:text-primary'}`} title="Export RIS">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>

                    </div>
                </div>

                {/* === CONTENT BODY === */}
                <div className="flex-1 overflow-y-auto custom-scroll pt-32 pb-10 px-4 md:px-10">
                    <div className="max-w-5xl mx-auto">
                        {/* Active Project Title (Big Display) */}
                        {activeProject && (
                            <div className="mb-8 pl-2 flex flex-col gap-1 opacity-80 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isHappy ? 'text-orange-500' : 'text-primary'}`}>
                                    <Sparkles className="w-3 h-3" /> Citations
                                </div>
                                <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${isHappy ? 'text-stone-800' : 'text-foreground'}`}>{activeProject.title}</h1>
                            </div>
                        )}

                        <ReferenceList
                            citations={filteredCitations}
                            activeProjectId={activeProjectId}
                            citationStyle={citationStyle}
                            onDelete={handleDeleteReference}
                            onCopy={handleCopyReference}
                            onExport={handleExport}
                        />
                    </div>
                </div>
            </main>

            {/* Modals */}
            <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} activeProjectId={activeProjectId} onAdd={handleAddReference} />
            <ReferenceModal isOpen={isRefModalOpen} onClose={() => setIsRefModalOpen(false)} onSubmit={handleAddReference} />

            {/* Project Modal */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-md">
                    <div className={`glass-card w-full max-w-xs p-6 border shadow-2xl rounded-3xl ${isHappy ? 'bg-white/90 border-orange-100' : 'border-white/20'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${isHappy ? 'text-stone-800' : ''}`}>New Project</h3>
                        <form onSubmit={handleCreateProject}>
                            <input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} className={`w-full rounded-xl px-4 py-3 text-sm mb-4 outline-none border focus:ring-4 transition-all ${isHappy ? 'bg-stone-50 border-orange-100 focus:border-orange-300 focus:ring-orange-500/10 text-stone-800 placeholder:text-stone-400' : 'bg-secondary/50 border-border/50 focus:border-primary'}`} placeholder="Enter name..." autoFocus />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors ${isHappy ? 'hover:bg-stone-100 text-stone-500' : 'hover:bg-muted'}`}>CANCEL</button>
                                <button type="submit" className={`flex-1 py-2.5 text-xs font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all ${isHappy ? 'bg-gradient-to-r from-orange-400 to-rose-400 text-white' : 'btn-primary'}`}>CREATE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CitationPage() { return <ToastProvider><CitationPageContent /></ToastProvider>; }
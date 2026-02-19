import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Plus, FolderOpen } from 'lucide-react';
import { ProjectCard } from './components/ProjectCard';
import { ProjectModal } from './components/ProjectModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Project } from './types';
import toast from 'react-hot-toast';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
    const navigate = useNavigate();
    const context = useOutletContext<{ user: any }>();
    const user = context?.user;
    const { theme } = useThemeStore();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string | null }>({ isOpen: false, projectId: null });

    // --- THEME CONFIGURATION (Clean & Minimalist) ---
    const themeStyles = {
        light: {
            title: "text-slate-900",
            searchBg: "bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900",
            searchPlaceholder: "text-slate-400",
            searchIcon: "text-slate-400",
            tabContainer: "bg-slate-100/50 border-slate-200",
            tabActive: "bg-slate-900 text-white shadow-md",
            tabInactive: "text-slate-500 hover:bg-slate-200/50",
            primaryBtn: "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20",
        },
        dark: {
            title: "text-white",
            searchBg: "bg-[#1E293B]/50 border-white/5 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-white",
            searchPlaceholder: "text-slate-500",
            searchIcon: "text-slate-500",
            tabContainer: "bg-white/5 border-white/5",
            tabActive: "bg-cyan-500 text-slate-900 font-bold shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]",
            tabInactive: "text-slate-400 hover:bg-white/5",
            primaryBtn: "bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold shadow-lg shadow-cyan-500/20",
        },
        happy: {
            // Solar Flare Palette (Orange/Amber/Rose) - NO PURPLE
            title: "text-orange-950",
            searchBg: "bg-white/60 border-orange-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 text-orange-900",
            searchPlaceholder: "text-orange-300",
            searchIcon: "text-orange-300",
            tabContainer: "bg-orange-50/50 border-orange-100",
            tabActive: "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20",
            tabInactive: "text-orange-400 hover:bg-orange-100/50",
            primaryBtn: "bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/25",
        }
    }[theme as 'light' | 'dark' | 'happy' || 'light'];

    // --- FETCH PROJECTS ---
    useEffect(() => {
        if (!user || !user.uid) return;
        const q = query(collection(db, "projects"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
            // Sort by latest
            loadedProjects.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
            setProjects(loadedProjects);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching projects:", error);
            toast.error("Gagal memuat proyek.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // --- ACTIONS ---
    const handleCreateOrUpdate = async (data: Partial<Project>) => {
        if (!user) return;
        try {
            const payload = {
                ...data,
                userId: user.uid,
                lastUpdated: serverTimestamp(),
                ...(!editingProject ? { createdAt: serverTimestamp() } : {})
            };
            if (data.endDate instanceof Date) payload.endDate = Timestamp.fromDate(data.endDate);

            if (editingProject) {
                await updateDoc(doc(db, "projects", editingProject.id), payload);
                toast.success("Proyek diperbarui!");
            } else {
                await addDoc(collection(db, "projects"), payload);
                toast.success("Proyek baru dibuat!");
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Gagal menyimpan.");
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteConfirm({ isOpen: true, projectId: id });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm.projectId) return;
        try {
            await deleteDoc(doc(db, "projects", deleteConfirm.projectId));
            toast.success("Proyek dihapus.");
        } catch (error) {
            console.error("Error deleting:", error);
            toast.error("Gagal menghapus.");
        } finally {
            setDeleteConfirm({ isOpen: false, projectId: null });
        }
    };

    const filteredProjects = projects.filter(p => {
        if (filter === 'active' && !['ON GOING', 'REVISI'].includes(p.status)) return false;
        if (filter === 'done' && p.status !== 'SELESAI') return false;
        if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">

            {/* --- HEADER SECTION (CLEAN) --- */}
            <div className="flex flex-col gap-6">
                {/* Title */}
                <h2 className={cn("text-3xl font-bold tracking-tight", themeStyles.title)}>
                    Daftar Proyek
                </h2>

                {/* Toolbar: Filters, Search, Button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Left: Filter Tabs */}
                    <div className={cn("flex p-1 rounded-xl w-fit backdrop-blur-sm border", themeStyles.tabContainer)}>
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'active', label: 'Proses' },
                            { id: 'done', label: 'Selesai' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as any)}
                                className={cn(
                                    "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-300",
                                    filter === tab.id ? themeStyles.tabActive : themeStyles.tabInactive
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Right: Search & Action */}
                    <div className="flex gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className={cn(
                            "relative flex-1 md:w-64 transition-all duration-300",
                            isSearchFocused ? "scale-[1.02]" : ""
                        )}>
                            <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", isSearchFocused ? "text-primary" : themeStyles.searchIcon)} />
                            <input
                                type="text"
                                placeholder="Cari judul tesis..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setIsSearchFocused(false)}
                                className={cn(
                                    "w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition-all duration-300 shadow-sm placeholder:transition-colors",
                                    themeStyles.searchBg,
                                    `placeholder:${themeStyles.searchPlaceholder}`
                                )}
                            />
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={() => { setEditingProject(undefined); setIsModalOpen(true); }}
                            className={cn(
                                "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 hover:brightness-110 active:scale-95 whitespace-nowrap",
                                themeStyles.primaryBtn
                            )}
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                            <span className="font-bold text-sm hidden sm:inline">Proyek Baru</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- PROJECTS GRID --- */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={cn("h-64 rounded-[24px] animate-pulse", theme === 'dark' ? "bg-white/5" : "bg-slate-200")} />
                        ))}
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                        <div className={cn(
                            "w-20 h-20 rounded-3xl flex items-center justify-center mb-6",
                            theme === 'dark' ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-400"
                        )}>
                            <FolderOpen className="w-10 h-10" />
                        </div>
                        <h3 className={cn("font-bold text-xl mb-1", themeStyles.title)}>
                            {searchQuery ? "Tidak ditemukan" : "Belum ada proyek"}
                        </h3>
                        <p className="text-sm opacity-60">
                            {searchQuery ? "Coba kata kunci lain" : "Buat proyek baru untuk memulai"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map((project, index) => (
                            <div
                                key={project.id}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                            >
                                <ProjectCard
                                    project={project}
                                    onEdit={(p) => { setEditingProject(p); setIsModalOpen(true); }}
                                    onDelete={handleDeleteClick}
                                    onClick={(id) => navigate(`/writing?project_id=${id}`)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrUpdate}
                project={editingProject}
            />

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, projectId: null })}
                onConfirm={handleConfirmDelete}
                title="Hapus Proyek?"
                message="Apakah Anda yakin ingin menghapus proyek ini? Tindakan ini tidak dapat dibatalkan dan semua data terkait akan hilang."
                confirmText="Hapus"
                danger
            />
        </div>
    );
}
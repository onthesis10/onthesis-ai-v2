import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
// Pastikan path ke client.js menggunakan ekstensi .js agar aman
import { api } from '../api/client.js';

// Default State untuk inisialisasi
const defaultProjectState = {
    id: null,
    title: "Project Baru",
    student_name: "",
    university: "",
    degree_level: "S1",
    problem_statement: "",
    research_objectives: "",
    significance: "",
    theoretical_framework: "",
    variables_indicators: "",
    methodology: "quantitative",
    population_sample: "",
    data_analysis: "",
    study_field: "",
    hypothesis: "",
    keywords: "",
    scope_limitations: "",
    references: [],
    chapters: [],
    updatedAt: null
};

// Default Golden Thread — 5 coherence nodes
const defaultGoldenThread = {
    researchQuestion: '',
    hypothesis: '',
    methodology: '',
    findings: '',
    conclusion: '',
};

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
    // --- STATE UTAMA ---
    const [project, setProject] = useState(defaultProjectState);
    const [content, setContent] = useState('');
    const [chapters, setChapters] = useState([]);
    const [activeChapterId, setActiveChapterId] = useState('chapter_1');

    const [projectId, setProjectId] = useState(null);
    const [projectsList, setProjectsList] = useState([]);
    const [analysisHistory, setAnalysisHistory] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Initial state dari window (backend injection) untuk status Pro
    const [isPro, setIsPro] = useState(
        typeof window !== 'undefined' ? window.initialState?.isPro : false
    );
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // ── NEW: Golden Thread & Writing Goals ──
    const [goldenThread, setGoldenThread] = useState(defaultGoldenThread);
    const [writingGoals, setWritingGoals] = useState({});

    // ── Sprint 2: Context Memory System — Chapter Summaries ──
    const [chapterSummaries, setChapterSummaries] = useState({});

    const saveTimeoutRef = useRef(null);

    // --- HELPER: Load Konten Bab ---
    const fetchChapterContent = useCallback(async (pid, cid) => {
        if (!pid) return;
        setIsContentLoading(true);
        try {
            const res = await api.get(`/api/project/${pid}/chapter/${cid}`);
            const htmlContent = res?.content || res?.data?.content || '';
            setContent(htmlContent);
        } catch (err) {
            console.error("[Context] Gagal load bab:", err);
            setContent('');
        } finally {
            setIsContentLoading(false);
        }
    }, []);

    // --- 1. LOAD PROJECT (METADATA + REFERENSI + BAB) ---
    const loadProject = useCallback(async (id) => {
        if (!id || id === 'undefined' || id === 'null') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log(`[Context] Loading Project ID: ${id}`);
            const responseData = await api.get(`/api/project-context/${id}`);

            if (!responseData) throw new Error("Data kosong dari server");

            // Extract data
            const { chapters_structure = [], references = [], id: responseId, ...meta } = responseData;
            const validId = responseId || id;

            setProjectId(validId);

            // Merge State (PENTING: Masukkan references dari server)
            setProject(prev => ({
                ...defaultProjectState,
                ...meta,
                references: references,
                id: validId
            }));

            // Load golden thread from server if available
            if (meta.golden_thread) {
                setGoldenThread(prev => ({ ...defaultGoldenThread, ...meta.golden_thread }));
            } else {
                // Auto-populate from project metadata
                setGoldenThread({
                    researchQuestion: meta.problem_statement || '',
                    hypothesis: meta.theoretical_framework || '',
                    methodology: meta.methodology || '',
                    findings: '',
                    conclusion: '',
                });
            }
            if (meta.writing_goals) setWritingGoals(meta.writing_goals);

            // Sprint 2: Load chapter summaries from server
            if (meta.chapterSummaries) {
                setChapterSummaries(meta.chapterSummaries);
            }

            // Setup Struktur Bab
            if (chapters_structure && chapters_structure.length > 0) {
                setChapters(chapters_structure);
                const exists = chapters_structure.find(c => c.id === activeChapterId);
                const targetChapter = exists ? activeChapterId : chapters_structure[0].id;
                setActiveChapterId(targetChapter);
                await fetchChapterContent(validId, targetChapter);
            } else {
                // Default struktur jika belum ada
                const defaultChapters = [
                    { id: 'chapter_1', title: 'BAB I: Pendahuluan', index: 0 },
                    { id: 'chapter_2', title: 'BAB II: Tinjauan Pustaka', index: 1 },
                    { id: 'chapter_3', title: 'BAB III: Metode Penelitian', index: 2 },
                    { id: 'chapter_4', title: 'BAB IV: Hasil & Pembahasan', index: 3 },
                    { id: 'chapter_5', title: 'BAB V: Penutup', index: 4 },
                ];
                setChapters(defaultChapters);
                setActiveChapterId('chapter_1');
                await fetchChapterContent(validId, 'chapter_1');
            }

            // Update URL browser agar bisa dishare/refresh
            if (typeof window !== 'undefined') {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('id', validId);
                window.history.pushState({}, '', newUrl);
                localStorage.setItem('last_active_project_id', validId);
            }

        } catch (err) {
            console.error("Gagal load project:", err);
            toast.error("Gagal memuat proyek.");
        } finally {
            setIsLoading(false);
        }
    }, [fetchChapterContent, activeChapterId]);

    // --- 2. SAVE KONTEN BAB (AUTOSAVE) ---
    const saveContent = useCallback((htmlString) => {
        if (isContentLoading || isLoading || !projectId) return;

        // Update local state segera
        setContent(htmlString);

        // Debounce save ke server
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setIsSaving(true);

        saveTimeoutRef.current = setTimeout(async () => {
            if (!projectId) return;
            try {
                const currentChapter = chapters.find(c => c.id === activeChapterId);
                await api.post(`/api/project/${projectId}/chapter/save`, {
                    chapterId: activeChapterId,
                    content: htmlString,
                    title: currentChapter?.title || 'Bab Tanpa Judul',
                    index: currentChapter?.index || 0
                }, { silent: true }); // Silent = true biar ga spam toast sukses
            } catch (e) {
                console.error("Save failed:", e);
            } finally {
                setIsSaving(false);
            }
        }, 2000); // Save setiap 2 detik tidak mengetik
    }, [projectId, activeChapterId, chapters, isContentLoading, isLoading]);

    // --- 3. GANTI BAB ---
    const changeActiveChapter = async (newChapterId) => {
        if (newChapterId === activeChapterId || isContentLoading) return;

        // Simpan bab sebelumnya sebelum pindah (force save)
        if (!isContentLoading && projectId) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            api.post(`/api/project/${projectId}/chapter/save`, {
                chapterId: activeChapterId,
                content: content,
            }, { silent: true }).catch(() => { });
        }

        setIsContentLoading(true);
        setContent('');
        setActiveChapterId(newChapterId);
        await fetchChapterContent(projectId, newChapterId);
    };

    // --- 4. UPDATE METADATA (Settings) ---
    const updateProjectMeta = useCallback(async (keyOrData, value) => {
        if (!projectId) return;
        let payload = {};
        if (typeof keyOrData === 'string') {
            payload = { [keyOrData]: value };
        } else if (typeof keyOrData === 'object' && keyOrData !== null) {
            payload = keyOrData;
        } else {
            return;
        }

        // Optimistic update
        setProject(prev => ({ ...prev, ...payload }));

        try {
            await api.post(`/api/project-update/${projectId}`, payload);
        } catch (error) {
            console.error("Gagal update project:", error);
            toast.error("Gagal menyimpan info project.");
        }
    }, [projectId]);

    // --- 5. TAMBAH REFERENSI ---
    const addReference = useCallback(async (refData) => {
        if (!projectId) return;

        // Optimistic Update (Biar UI langsung muncul)
        const tempId = `temp-${Date.now()}`;
        const newRef = { ...refData, id: tempId, created_at: new Date().toISOString() };

        setProject(prev => ({
            ...prev,
            references: [newRef, ...(prev.references || [])]
        }));

        try {
            // Kirim ke Backend
            const res = await api.post(`/api/project/${projectId}/references/add`, refData);

            if (res && res.status === 'success') {
                toast.success("Referensi berhasil disimpan");
                // Idealnya update ID temp dengan ID asli dari res.id, tapi reload cukup
            }
        } catch (err) {
            console.error("Gagal tambah referensi:", err);
            toast.error("Gagal menyimpan referensi ke server");
            // Rollback state bisa dilakukan disini jika perlu
        }
    }, [projectId]);

    // --- NEW: UPDATE GOLDEN THREAD ---
    const updateGoldenThread = useCallback(async (updates) => {
        if (!projectId) return;
        const newThread = { ...goldenThread, ...updates };
        setGoldenThread(newThread);
        try {
            await api.post(`/api/project-update/${projectId}`, {
                golden_thread: newThread,
            });
        } catch (error) {
            console.error('Failed to save golden thread:', error);
        }
    }, [projectId, goldenThread]);

    // --- Sprint 2: UPDATE CHAPTER SUMMARY (fire-and-forget) ---
    const updateChapterSummary = useCallback((chapterId, htmlContent) => {
        if (!projectId || !chapterId || !htmlContent) return;
        // Fire and forget — don't await, don't block save
        fetch('/api/summarize-chapter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, chapterId, content: htmlContent })
        })
            .then(r => r.json())
            .then(({ summary }) => {
                if (summary) {
                    setChapterSummaries(prev => ({ ...prev, [chapterId]: summary }));
                    console.log(`[ContextMemory] Summary updated for ${chapterId}: ${summary.slice(0, 60)}...`);
                }
            })
            .catch(err => console.warn('[ContextMemory] Summary update failed:', err));
    }, [projectId]);

    // --- NEW: CREATE CHAPTER ---
    const createChapter = async (title = 'Bab Baru') => {
        if (!projectId) return;
        const loadingId = toast.loading("Membuat bab baru...");
        try {
            const res = await api.post(`/api/project/${projectId}/chapter/create`, { title });
            if (res.status === 'success' && res.chapter) {
                setChapters(prev => [...prev, res.chapter]);
                toast.success("Bab baru berhasil dibuat", { id: loadingId });
                // Switch to the new chapter
                await changeActiveChapter(res.chapter.id);
            }
        } catch (error) {
            console.error("Gagal membuat bab:", error);
            toast.error(error.message || "Gagal membuat bab", { id: loadingId });
        }
    };

    // --- NEW: DELETE CHAPTER ---
    const deleteChapter = async (chapterId) => {
        if (!projectId || !chapterId) return;

        // Prevent deleting the very last chapter if it's the only one
        if (chapters.length <= 1) {
            toast.error("Proyek harus memiliki setidaknya satu bab.");
            return;
        }

        // NOTE: The confirmation dialog is now handled by the UI before calling this function.

        const loadingId = toast.loading("Menghapus bab...");
        try {
            const res = await api.delete(`/api/project/${projectId}/chapter/${chapterId}/delete`);
            if (res.status === 'success') {
                // Determine next chapter to activate if we are deleting the currently active one
                let nextChapterId = activeChapterId;
                if (activeChapterId === chapterId) {
                    const currentIndex = chapters.findIndex(c => c.id === chapterId);
                    if (currentIndex > 0) {
                        nextChapterId = chapters[currentIndex - 1].id;
                    } else if (chapters.length > 1) {
                        nextChapterId = chapters[1].id;
                    }
                }

                setChapters(prev => prev.filter(c => c.id !== chapterId));
                toast.success("Bab berhasil dihapus", { id: loadingId });

                if (nextChapterId !== activeChapterId) {
                    await changeActiveChapter(nextChapterId);
                }
            }
        } catch (error) {
            console.error("Gagal menghapus bab:", error);
            toast.error(error.message || "Gagal menghapus bab", { id: loadingId });
        }
    };

    // --- NEW: RENAME CHAPTER ---
    const renameChapter = async (chapterId, newTitle) => {
        if (!projectId || !chapterId || !newTitle.trim()) return;

        // Optimistic update
        setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, title: newTitle } : c));

        try {
            const res = await api.put(`/api/project/${projectId}/chapter/${chapterId}/rename`, { title: newTitle });
            if (res.status !== 'success') {
                toast.error("Gagal mengganti nama bab.");
            }
        } catch (error) {
            console.error("Gagal mengganti nama bab:", error);
            toast.error(error.message || "Gagal mengganti nama bab");
        }
    };

    // --- 6. CREATE NEW PROJECT ---
    const createNewProject = async () => {
        const loadingId = toast.loading("Membuat proyek baru...");
        try {
            const res = await api.post('/api/projects/new', {});
            if (res.status === 'success') {
                toast.success("Proyek baru dibuat!", { id: loadingId });
                await fetchProjectsList(); // Refresh list
                await loadProject(res.projectId); // Open new project
            }
        } catch (error) {
            toast.error(error.message || "Gagal membuat proyek", { id: loadingId });
        }
    };

    // --- INIT APPS ---
    const fetchProjectsList = async () => {
        try {
            const res = await api.get('/api/projects');
            setProjectsList(res?.projects || []);
        } catch (e) { setProjectsList([]); }
    };

    const fetchAnalysisHistory = async () => {
        try {
            const res = await api.get('/api/my-analyses');
            setAnalysisHistory(res?.history || []);
        } catch (e) { }
    };

    // Load initial project from URL or LocalStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const savedId = params.get('id') || localStorage.getItem('last_active_project_id');

        if (savedId && savedId !== 'undefined' && savedId !== 'null') {
            loadProject(savedId);
        } else {
            setIsLoading(false);
        }

        fetchProjectsList();
        fetchAnalysisHistory();
    }, []);

    // --- SET CURRENT PROJECT FROM SIDEBAR ---
    const setCurrentProject = (proj) => {
        if (proj.id === projectId) return;
        loadProject(proj.id);
    };

    // Export Value
    const value = {
        // Data
        projectId,
        project,
        content,
        chapters,
        activeChapterId,
        projectsList: projectsList || [],
        projects: projectsList || [],
        currentProject: project,
        analysisHistory,
        goldenThread,
        writingGoals,
        chapterSummaries,
        references: project.references || [],

        // UI Flags
        isLoading,
        isContentLoading,
        isSaving,
        isSettingsOpen,
        showUpgradeModal,
        isPro,

        // Setters & Actions
        setIsSettingsOpen,
        setShowUpgradeModal,
        setIsPro,
        loadProject,
        changeActiveChapter,
        updateProjectMeta,
        saveContent,
        addReference,
        fetchProjectsList,
        createNewProject,
        setCurrentProject,
        setActiveChapterId,
        setContent,
        updateGoldenThread,
        setWritingGoals,
        updateChapterSummary,
        createChapter,
        deleteChapter,
        renameChapter,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    return useContext(ProjectContext);
}
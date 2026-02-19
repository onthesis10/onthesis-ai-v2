import { create } from 'zustand'
import { db, auth } from '@/lib/firebase'
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, orderBy, Timestamp, getDoc } from 'firebase/firestore'

export type ViewMode = 'data' | 'variable' | 'output' | 'ai-assistant' | 'guide'

export interface Variable {
    id: string
    name: string
    type: 'numeric' | 'string' | 'date'
    width: number
    decimals: number
    label: string
    values: string
    missing: string
    columns: number
    align: 'left' | 'right' | 'center'
    measure: 'scale' | 'ordinal' | 'nominal'
    role: 'input' | 'target' | 'none'
}

export interface ResearchContext {
    title: string
    researchType: 'quantitative' | 'qualitative' | 'mixed'
    design: 'experiment' | 'correlational' | 'comparative' | 'survey' | 'other'
    variables: {
        independent: string[]
        dependent: string[]
        control?: string[]
    }
    hypothesis: string
}

interface AnalysisState {
    viewMode: ViewMode
    setViewMode: (mode: ViewMode) => void

    data: any[]
    setData: (data: any[]) => void

    analysisResult: any | null
    setAnalysisResult: (result: any, skipHistory?: boolean) => void

    analysisInterpretation: string | null
    setInterpretation: (text: string | null) => void

    fileName: string | null
    setFileName: (name: string | null) => void

    variables: Variable[]
    setVariables: (variables: Variable[]) => void
    updateVariable: (id: string, field: keyof Variable, value: any) => void
    addVariable: () => void
    initManualInput: () => void

    isSidebarOpen: boolean
    toggleSidebar: () => void

    isGeneratorOpen: boolean
    toggleGenerator: (isOpen?: boolean) => void

    activeAnalysis: string | null
    openAnalysis: (type: string) => void
    closeAnalysis: () => void

    recodeVariable: (variableName: string, mapping: Record<string, number>) => Promise<void>

    researchContext: ResearchContext
    setResearchContext: (ctx: Partial<ResearchContext>) => void

    userTier: 'free' | 'pro'
    toggleTier: () => void

    userData: {
        email: string
        displayName: string
        photoURL: string | null
        isPro: boolean
    } | null
    fetchUserData: () => Promise<void>

    isAnalyzing: boolean
    setIsAnalyzing: (isAnalyzing: boolean) => void

    analysisError: string | null
    setAnalysisError: (error: string | null) => void

    theme: 'light' | 'dark' | 'happy' | 'system'
    setTheme: (theme: 'light' | 'dark' | 'happy' | 'system') => void

    aiMode: 'analyst' | 'visualization' | 'writing' | 'defense'
    setAiMode: (mode: 'analyst' | 'visualization' | 'writing' | 'defense') => void

    // Firebase Persistence
    savedProjects: any[]
    fetchProjects: () => Promise<void>
    saveProject: (name: string) => Promise<void>
    loadProject: (projectId: string) => Promise<void>
    deleteProject: (projectId: string) => Promise<void>

    analysisHistory: any[]
    fetchHistory: () => Promise<void>
    saveHistory: (entry: any) => Promise<void>
    deleteHistory: (historyId: string) => Promise<void>
}

// ... imports ...
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAnalysisStore = create<AnalysisState>()(
    persist(
        (set, get) => ({
            viewMode: 'data',
            setViewMode: (mode) => set({ viewMode: mode }),

            data: [],
            setData: (data) => set({ data, activeAnalysis: null }),

            analysisResult: null,
            setAnalysisResult: (result, skipHistory = false) => {
                set({ analysisResult: result })
                if (result && !skipHistory && auth && auth.currentUser) {
                    // Generate title if missing
                    const title = result.title || `Analysis ${new Date().toLocaleTimeString()}`
                    const entry = { ...result, title, timestamp: Date.now() }
                    get().saveHistory(entry)
                }
            },

            analysisInterpretation: null,
            setInterpretation: (text) => set({ analysisInterpretation: text }),

            fileName: null,
            setFileName: (name) => set({ fileName: name }),

            variables: [],
            setVariables: (variables) => set({ variables }),
            updateVariable: (id, field, value) => {
                // Optimistic Update
                set((state) => ({
                    variables: state.variables.map((v) =>
                        v.id === id ? { ...v, [field]: value } : v
                    ),
                }))

                // Sync to Backend
                const varName = get().variables.find(v => v.id === id)?.name
                if (varName) {
                    fetch('/api/variable-view/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: varName, field, value })
                    }).catch(console.error)
                }
            },

            recodeVariable: async (variableName, mapping) => {
                try {
                    const res = await fetch('/api/project/recode-variable', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ variable: variableName, mapping })
                    })
                    const result = await res.json()

                    if (result.status === 'success') {
                        const metaRes = await fetch('/api/variable-view/get')
                        const metaData = await metaRes.json()
                        if (metaData.variables) set({ variables: metaData.variables })

                        const dataRes = await fetch('/api/data-view/get')
                        const dataData = await dataRes.json()
                        if (dataData.data && dataData.columns) {
                            const formattedData = dataData.data.map((row: any[]) => {
                                const obj: any = {};
                                dataData.columns.forEach((col: string, i: number) => {
                                    obj[col] = row[i];
                                });
                                return obj;
                            });
                            set({ data: formattedData })
                        }
                    } else {
                        console.error("Recode Failed:", result.message)
                    }
                } catch (e) {
                    console.error("Recode Error:", e)
                }
            },

            addVariable: () => set((state) => {
                const newId = `VAR${String(state.variables.length + 1).padStart(3, '0')}`
                const newVariable: Variable = {
                    id: newId,
                    name: newId,
                    label: newId,
                    type: 'numeric',
                    width: 100,
                    decimals: 2,
                    values: 'None',
                    missing: 'None',
                    columns: 8,
                    align: 'right',
                    measure: 'scale',
                    role: 'input'
                }

                const newData = state.data.map(row => ({ ...row, [newId]: '' }))

                return {
                    variables: [...state.variables, newVariable],
                    data: newData
                }
            }),

            initManualInput: () => set((state) => {
                // If data exists, just go to data view (or ask confirmation - for now assume safe switch)
                if (state.data.length > 0) {
                    return { viewMode: 'data' }
                }

                // Initialize with standard empty structure (jamovi/spss style)
                const defaultVars: Variable[] = [1, 2, 3].map(i => ({
                    id: `VAR00${i}`,
                    name: `VAR00${i}`,
                    label: `Variable ${i}`,
                    type: 'numeric',
                    width: 100,
                    decimals: 2,
                    values: 'None',
                    missing: 'None',
                    columns: 8,
                    align: 'right',
                    measure: 'scale',
                    role: 'input'
                }))

                // Create 10 empty rows
                const emptyRows = Array(15).fill(0).map(() => ({
                    VAR001: '', VAR002: '', VAR003: ''
                }))

                return {
                    variables: defaultVars,
                    data: emptyRows,
                    viewMode: 'data'
                }
            }),

            isSidebarOpen: false,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

            isGeneratorOpen: false,
            toggleGenerator: (isOpen) => set((state) => ({
                isGeneratorOpen: isOpen !== undefined ? isOpen : !state.isGeneratorOpen
            })),

            activeAnalysis: null,
            openAnalysis: (type) => set({ activeAnalysis: type }),
            closeAnalysis: () => set({ activeAnalysis: null }),

            researchContext: {
                title: '',
                researchType: 'quantitative',
                design: 'correlational',
                variables: { independent: [], dependent: [] },
                hypothesis: ''
            },
            setResearchContext: (ctx) => set((state) => ({
                researchContext: { ...state.researchContext, ...ctx }
            })),

            userTier: 'free',
            toggleTier: () => set((state) => ({ userTier: state.userTier === 'free' ? 'pro' : 'free' })),

            // Real User Data Integration
            userData: null,
            fetchUserData: async () => {
                try {
                    const res = await fetch('/api/user/me')
                    const json = await res.json()
                    if (json.status === 'success' && json.user) {
                        set({
                            userData: json.user,
                            userTier: json.user.isPro ? 'pro' : 'free' // Sync tier with backend
                        })
                    }
                } catch (e) {
                    console.error("Failed to fetch user data:", e)
                }
            },

            isAnalyzing: false,
            setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

            analysisError: null,
            setAnalysisError: (error) => set({ analysisError: error }),

            theme: (typeof window !== 'undefined' ? (localStorage.getItem('theme') as 'light' | 'dark' | 'happy' | 'system') || 'light' : 'light'),
            setTheme: (theme) => {
                localStorage.setItem('theme', theme)
                set({ theme })

                const root = window.document.documentElement
                root.classList.remove('dark', 'happy')
                if (theme === 'dark') root.classList.add('dark')
                if (theme === 'happy') root.classList.add('happy')
                // Removed system auto-detection to ensure Light Mode is primary
            },

            aiMode: (typeof window !== 'undefined' ? (localStorage.getItem('onthesis_ai_mode') as any) || 'analyst' : 'analyst'),
            setAiMode: (mode) => {
                localStorage.setItem('onthesis_ai_mode', mode)
                set({ aiMode: mode })
            },

            // --- Firebase Implementation ---
            savedProjects: [],
            fetchProjects: async () => {
                if (!auth || !db) return
                const user = auth.currentUser
                if (!user) return

                try {
                    const q = query(
                        collection(db, 'projects'),
                        where('userId', '==', user.uid),
                        orderBy('createdAt', 'desc')
                    )
                    const snapshot = await getDocs(q)
                    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    set({ savedProjects: projects })
                } catch (e) {
                    console.error("Error fetching projects:", e)
                }
            },

            saveProject: async (name) => {
                if (!auth || !db) {
                    alert("Fitur penyimpanan project dinonaktifkan (Firebase Config Missing).")
                    return
                }
                const user = auth.currentUser
                if (!user) {
                    alert("Harap login terlebih dahulu untuk menyimpan project.")
                    return
                }

                try {
                    const state = get()
                    const projectData = {
                        userId: user.uid,
                        name,
                        fileName: state.fileName,
                        data: state.data,
                        variables: state.variables,
                        researchContext: state.researchContext,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    }

                    // Create new or update existing? For now, create new is safer versioning, 
                    // but user might want to overwrite. Let's do create new for simplicity of "Save As".
                    await addDoc(collection(db, 'projects'), projectData)

                    // Refresh list
                    get().fetchProjects()

                    // Simple toast handled by UI, or state flag?
                    // console.log("Project saved!")
                } catch (e) {
                    console.error("Error saving project:", e)
                    throw e
                }
            },

            loadProject: async (projectId) => {
                if (!db) return
                try {
                    const docRef = doc(db, 'projects', projectId)
                    const docSnap = await getDoc(docRef)

                    if (docSnap.exists()) {
                        const p = docSnap.data() as any
                        set({
                            fileName: p.fileName,
                            data: p.data,
                            variables: p.variables,
                            researchContext: p.researchContext,
                        })
                    }
                } catch (e) {
                    console.error("Error loading project:", e)
                    throw e
                }
            },

            deleteProject: async (projectId) => {
                if (!db) return
                try {
                    await deleteDoc(doc(db, 'projects', projectId))
                    get().fetchProjects()
                } catch (e) {
                    console.error("Error deleting project:", e)
                }
            },

            analysisHistory: [],
            fetchHistory: async () => {
                // auth and db are already imported at module level

                if (!auth || !db) return
                const user = auth.currentUser

                // If not logged in, we just keep the local persisted history
                if (!user) return

                try {
                    const q = query(
                        collection(db, 'history'),
                        where('userId', '==', user.uid),
                        orderBy('createdAt', 'desc')
                    )
                    const snapshot = await getDocs(q)
                    const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    set({ analysisHistory: history })
                } catch (e) {
                    console.error("Error fetching history:", e)
                }
            },

            saveHistory: async (entry) => {
                // 1. LOCAL: Always update local state immediately for instant feedback
                const localEntry = {
                    id: `local-${Date.now()}`,
                    ...entry,
                    timestamp: Date.now()
                }

                set((state) => ({
                    analysisHistory: [localEntry, ...state.analysisHistory]
                }))

                // 2. CLOUD: Try to save to Firebase if logged in
                if (!auth || !db) return
                const user = auth.currentUser
                if (!user) return

                try {
                    const historyEntry = {
                        userId: user.uid,
                        ...entry,
                        createdAt: Timestamp.now()
                    }
                    await addDoc(collection(db, 'history'), historyEntry)

                    // Refresh to get the real server ID
                    get().fetchHistory()
                } catch (e) {
                    console.error("Error saving history:", e)
                }
            },

            deleteHistory: async (historyId: string) => {
                // 1. LOCAL: Remove immediately
                const newHistory = get().analysisHistory.filter((h: any) => h.id !== historyId)

                set(() => ({
                    analysisHistory: newHistory
                }))

                // Clear active result if history becomes empty
                if (newHistory.length === 0) {
                    set({ analysisResult: null, analysisInterpretation: null })
                }

                // 2. CLOUD: Delete from Firebase
                if (!db) return
                try {
                    // Only attempt delete if it looks like a firebase ID (not starting with 'local-')
                    if (!historyId.startsWith('local-')) {
                        await deleteDoc(doc(db, 'history', historyId))
                    }
                } catch (e) {
                    console.error("Error deleting history:", e)
                }
            }
        }),
        {
            name: 'onthesis-analysis-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                viewMode: state.viewMode,
                data: state.data,
                variables: state.variables,
                analysisResult: state.analysisResult,
                analysisInterpretation: state.analysisInterpretation,
                fileName: state.fileName,
                researchContext: state.researchContext,
                userTier: state.userTier,
                theme: state.theme,
                aiMode: state.aiMode,
                analysisHistory: state.analysisHistory, // Added to persist whitelist
            }),
        }
    )
)


import {
    Sparkles, Lightbulb, Layout, Play, X, FileSpreadsheet,
    PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ArrowRight, Loader2, CheckCircle2,
    ChevronDown, ChevronRight, Copy, Check, Download, FileText,
    MessageSquare, SquarePen
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import toast from 'react-hot-toast'
import { Analytics } from '../../utils/analytics'
import { ChartRenderer } from '../../visualization/ChartRenderer'
import { transformArtifactToNormalizedData } from '../../visualization/utils/artifactAdapter'
import { AnimatePresence, motion } from 'framer-motion'

import { MarkdownRenderer } from './MarkdownRenderer'
import { OnThesisLogo } from '../ui/OnThesisLogo'
import { ChatHistoryPanel } from './ChatHistoryPanel'
import { saveChat, loadChat } from '../../services/chatHistoryService'


// --- Interfaces ---

interface Artifact {
    type: 'chart' | 'insight' | 'narrative' | 'table' | 'image_base64'
    title: string
    data: any
}

interface SuggestedAction {
    label: string
    action: string
    params: any
    badge?: string
}

interface AnalysisStep {
    id: string
    title: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    content?: string // Code or detailed log
    output?: string // Execution result
}

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    suggestedActions?: SuggestedAction[]
    reasoning?: string
    steps?: AnalysisStep[]
    artifacts?: Array<{ type: string, data: string }>
}

// --- Components ---



const ExecutionLog = ({ steps }: { steps: AnalysisStep[] }) => {
    const [expandedIds, setExpandedIds] = useState<string[]>([])

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    return (
        <div className="flex flex-col gap-2 mb-3 w-full animate-in fade-in slide-in-from-top-2">
            {steps.map(step => (
                <div key={step.id} className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden bg-slate-50 dark:bg-black/20">
                    <div
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        onClick={() => toggleExpand(step.id)}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />}
                            {step.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            {step.status === 'failed' && <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            {step.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-white/20 shrink-0" />}

                            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 truncate">
                                {step.title}
                            </span>
                        </div>
                        {step.content && (
                            <div className="text-slate-400">
                                {expandedIds.includes(step.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {expandedIds.includes(step.id) && step.content && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-900 text-slate-300 text-[10px] font-mono overflow-x-auto">
                                    <pre className="whitespace-pre-wrap break-words">{step.content}</pre>
                                    {step.output && (
                                        <>
                                            <div className="my-2 border-t border-white/10" />
                                            <div className="text-emerald-400 font-bold mb-1">Output:</div>
                                            <pre className="whitespace-pre-wrap break-words text-emerald-300">{step.output}</pre>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    )
}

const convertToCSV = (data: any[]) => {
    if (!data || !data.length) return ''
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    return [headers.join(','), ...rows].join('\n')
}

// Copy Message Button for Assistant Messages
const CopyMessageButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all active:scale-95"
            title="Copy message"
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                </>
            ) : (
                <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                </>
            )}
        </button>
    )
}

export const AIAssistantView = () => {
    // --- Store & State ---
    const {
        researchContext,
        data,
        variables,
        analysisResult,
        fileName,
        aiMode,
        setAiMode
    } = useAnalysisStore()

    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
    const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>([])
    const [completedActions, setCompletedActions] = useState<string[]>([])

    // UI Layout State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isInspectorOpen, setIsInspectorOpen] = useState(true)

    // Chat History State
    const [chatId, setChatId] = useState<string>(() => `chat_${Date.now()}`)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    // Initial Greeting
    const getInitialGreeting = (): string => {
        if (!data || data.length === 0) return "Selamat datang di OnThesis Studio.\\n\\nSilakan pilih dataset untuk memulai analisis cerdas."
        const numericVars = variables.filter(v => v.type === 'numeric').length
        return `**OnThesis Research Engine siap.**\\n\\nDataset *${fileName || 'Aktif'}* terdeteksi dengan ${data.length} baris data dan ${variables.length} variabel (${numericVars} numerik).\\n\\nApa fokus analisis Anda hari ini?`
    }

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: getInitialGreeting(), timestamp: new Date() }
    ])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
        }
    }, [input])

    // Auto-save chat to Firebase after messages change (debounced)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    useEffect(() => {
        // Only save if there are user messages (not just the greeting)
        const hasUserMessages = messages.some(m => m.role === 'user')
        if (!hasUserMessages || isLoading) return

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => {
            saveChat(chatId, messages).catch(e => console.warn('Auto-save failed:', e))
        }, 1500)

        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
    }, [messages, chatId, isLoading])

    // Load a selected chat from history
    const handleSelectChat = useCallback(async (selectedChatId: string) => {
        try {
            const chat = await loadChat(selectedChatId)
            if (chat && chat.messages.length > 0) {
                setChatId(selectedChatId)
                setMessages(chat.messages)
                setActiveArtifact(null)
                toast.success('Chat dimuat')
            }
        } catch (e) {
            console.error('Failed to load chat:', e)
            toast.error('Gagal memuat chat')
        }
    }, [])

    // Start a new chat
    const handleNewChat = useCallback(() => {
        setChatId(`chat_${Date.now()}`)
        setMessages([{ id: '1', role: 'assistant', content: getInitialGreeting(), timestamp: new Date() }])
        setActiveArtifact(null)
        setAgentDatasetPath(null)
    }, [data, variables, fileName])


    // --- Core Logic ---

    // Agent Session State
    const [agentDatasetPath, setAgentDatasetPath] = useState<string | null>(null)

    // --- Export Logic ---
    const handleExport = async (format: 'pdf' | 'docx', msg: Message) => {
        const toastId = toast.loading(`Generating ${format.toUpperCase()}...`)
        try {
            const endpoint = `/api/agent/export/${format}`
            const payload = {
                title: 'Laporan Analisis Statistik',
                content: msg.content,
                artifacts: msg.artifacts || [],
                dataset: fileName || ''
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error(`Export failed: ${res.status}`)

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const ext = format === 'pdf' ? 'pdf' : 'docx'
            a.download = `OnThesis_Analysis.${ext}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success(`${format.toUpperCase()} berhasil di-download!`, { id: toastId })
        } catch (err: any) {
            console.error('Export error:', err)
            toast.error(`Gagal export ${format.toUpperCase()}`, { id: toastId })
        }
    }

    const handleSend = async (text: string = input, displayText?: string) => {
        if ((!text.trim() && !displayText) || isLoading) return

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: displayText || text,
            timestamp: new Date()
        }
        setMessages(prev => [...prev, newMessage])
        setInput('')
        setIsLoading(true)
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        Analytics.trackMessageSent(text.length)

        // --- MODE 1: ANALYST AGENT (STREAMING) ---
        if (aiMode === 'analyst') {
            try {
                // 1. Ensure Data Uploaded
                let currentDatasetPath = agentDatasetPath

                if (!currentDatasetPath && data.length > 0) {
                    const toastId = toast.loading("Uploading dataset to agent...")
                    try {
                        const csvContent = convertToCSV(data)
                        const blob = new Blob([csvContent], { type: 'text/csv' })
                        const formData = new FormData()
                        formData.append('file', blob, 'dataset.csv')

                        const uploadRes = await fetch('/api/agent/upload', {
                            method: 'POST',
                            body: formData
                        })
                        const uploadJson = await uploadRes.json()

                        if (uploadJson.status === 'success') {
                            setAgentDatasetPath(uploadJson.file_path)
                            currentDatasetPath = uploadJson.file_path
                            toast.success("Dataset ready", { id: toastId })
                        } else {
                            throw new Error("Upload failed")
                        }
                    } catch (e) {
                        toast.error("Gagal upload dataset", { id: toastId })
                        // Proceed without dataset (might fail if agent needs it)
                    }
                }

                // 2. Prepare Assistant Message Placeholder
                const aiMsgId = (Date.now() + 1).toString()
                setMessages(prev => [...prev, {
                    id: aiMsgId,
                    role: 'assistant',
                    content: '',
                    steps: [],
                    timestamp: new Date()
                }])

                // 3. Start Streaming
                const response = await fetch('/api/agent/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        dataset_path: currentDatasetPath
                    })
                })

                if (!response.body) throw new Error("No response body")

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6))

                                setMessages(prev => prev.map(msg => {
                                    if (msg.id !== aiMsgId) return msg

                                    // Update Logic
                                    if (data.type === 'token') {
                                        return { ...msg, content: msg.content + data.content }
                                    }
                                    if (data.type === 'step') {
                                        const currentSteps = msg.steps || []
                                        const existingStepIndex = currentSteps.findIndex(s => s.id === data.id)

                                        let newSteps = [...currentSteps]
                                        if (existingStepIndex >= 0) {
                                            newSteps[existingStepIndex] = { ...newSteps[existingStepIndex], ...data }
                                        } else {
                                            newSteps.push(data)
                                        }
                                        return { ...msg, steps: newSteps }
                                    }
                                    if (data.type === 'artifact') {
                                        // Store artifact in the message for inline rendering
                                        const currentArtifacts = msg.artifacts || []
                                        return { ...msg, artifacts: [...currentArtifacts, data.content] }
                                    }
                                    if (data.type === 'response') {
                                        // Final synthesized response from responder node
                                        return { ...msg, content: data.content }
                                    }
                                    if (data.type === 'done') {
                                        return msg
                                    }

                                    // Handle legacy/other (e.g. final text block in one go)
                                    if (data.content && !data.type) {
                                        return { ...msg, content: msg.content + data.content }
                                    }

                                    return msg
                                }))

                            } catch (e) {
                                console.error("Parse error", e)
                            }
                        }
                    }
                }

            } catch (error: any) {
                console.error("Agent Error:", error)
                toast.error("Agent Error: " + String(error))
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Maaf, terjadi kesalahan pada Agent. Silakan coba lagi.', timestamp: new Date() }])
            } finally {
                setIsLoading(false)
            }
            return
        }

        try {
            // Build Context
            const dataContext = {
                columns: variables.map(v => v.name),
                rowCount: data.length,
                variables: variables.map(v => ({ name: v.name, type: v.type, measure: v.measure })),
                selected_variables: selectedVariableIds,
                preview: data.slice(0, 5)
            }

            let analysisSummary = ''
            if (analysisResult) {
                try {
                    analysisSummary = JSON.stringify(analysisResult).slice(0, 1000)
                } catch { }
            }

            const analysisState = {
                hasResult: !!analysisResult,
                analysisSummary,
                completedActions,
                ai_mode: aiMode
            }

            const conversationHistory = messages.filter(m => m.id !== '1').slice(-8).map(m => ({ role: m.role, content: m.content }))

            // API Call
            const res = await fetch('/api/assistant/chat/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    researchContext,
                    data_context: dataContext,
                    analysis_state: analysisState,
                    conversation_history: conversationHistory
                })
            })

            const textResponse = await res.text()
            let json
            try { json = JSON.parse(textResponse) } catch (e) { throw new Error("Invalid response format") }
            if (json.error) throw new Error(json.error)

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: json.text,
                timestamp: new Date(),
                suggestedActions: json.suggested_actions || [],
                reasoning: json.reasoning || ''
            }

            setMessages(prev => [...prev, aiMessage])
            if (json.artifacts && json.artifacts.length > 0) {
                setActiveArtifact(json.artifacts[0])
                if (!isInspectorOpen) setIsInspectorOpen(true) // Auto-open inspector if artifact
            }
        } catch (error: any) {
            console.error('Error calling AI:', error)
            toast.error('Gagal terhubung ke AI Assistant')
            Analytics.trackError(String(error))
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.', timestamp: new Date() }])
        } finally {
            setIsLoading(false)
        }
    }

    const executeAction = (action: SuggestedAction) => {
        setCompletedActions(prev => [...new Set([...prev, action.label])])
        const actionMessage = `[USER ACTION] Saya ingin: ${action.label}.\\nTipe: ${action.action}\\nParams: ${JSON.stringify(action.params || {})}.`
        handleSend(actionMessage, action.label)
        Analytics.trackActionClicked(action.label)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }


    // --- Renderers ---

    return (
        <div
            className="h-full w-full bg-white dark:bg-[#131314] font-sans flex overflow-hidden text-slate-900 dark:text-[#E3E3E3]"
            style={{
                // @ts-ignore
                '--ocean-1': '#006FEE',
                '--ocean-2': '#00C2FF',
                '--ocean-highlight': '#E0F2FE',
                '--ink': 'currentColor'
            } as React.CSSProperties}
        >

            {/* --- LEFT SIDEBAR (Source Context) --- */}
            <AnimatePresence initial={false}>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 260, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-[#F0F4F9] dark:bg-[#1E1F20] flex flex-col shrink-0 border-r border-transparent dark:border-white/5"
                    >
                        {/* Sidebar Header */}
                        <div className="h-14 flex items-center justify-between px-4 mt-2">
                            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500">
                                <PanelLeftClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Context Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 custom-scrollbar">
                            {/* File Info */}
                            <div>
                                <h3 className="text-xs font-semibold text-slate-500 mb-3 px-2">Data Source</h3>
                                {fileName ? (
                                    <div className="p-3 bg-white dark:bg-[#28292A] rounded-2xl shadow-sm group cursor-default border border-transparent dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                <FileSpreadsheet className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate" title={fileName}>{fileName}</p>
                                                <p className="text-xs text-slate-500">{data.length} Rows</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-center">
                                        <p className="text-xs text-slate-500">No Data Selected</p>
                                    </div>
                                )}
                            </div>

                            {/* Variables */}
                            <div>
                                <div className="flex items-center justify-between mb-2 px-2">
                                    <h3 className="text-xs font-semibold text-slate-500">Variables</h3>
                                    {selectedVariableIds.length > 0 && (
                                        <button onClick={() => setSelectedVariableIds([])} className="text-xs text-indigo-500 hover:text-indigo-400">Reset</button>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {variables.map(v => (
                                        <button
                                            key={v.name}
                                            onClick={() => setSelectedVariableIds(prev => prev.includes(v.name) ? prev.filter(n => n !== v.name) : [...prev, v.name])}
                                            className={`
                                                px-4 py-2 text-xs rounded-full text-left truncate transition-all
                                                ${selectedVariableIds.includes(v.name)
                                                    ? 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] font-medium'
                                                    : 'hover:bg-slate-200 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                                                }
                                            `}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* --- CENTER CHAT STUDIO --- */}
            <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1120] relative min-w-[400px]">

                {/* Header - Minimalist */}
                <div className="h-16 flex items-center justify-between px-6 sticky top-0 z-10 bg-white/80 dark:bg-[#131314]/80 backdrop-blur-md border-b border-transparent dark:border-white/5">
                    <div className="flex items-center gap-3">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 transition-colors">
                                <PanelLeftOpen className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">OnThesis</span>
                            <span className="text-lg text-slate-400">Analysis</span>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-full flex gap-1 border border-slate-200 dark:border-white/5">
                        {(['analyst', 'writing', 'defense'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setAiMode(mode)}
                                className={`
                                    px-3 py-1 rounded-full text-[10px] font-medium transition-all
                                    ${aiMode === mode
                                        ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }
                                `}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Actions: New Chat + History + Inspector */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleNewChat}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 rounded-full transition-colors"
                            title="Chat Baru"
                        >
                            <SquarePen className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 rounded-full transition-colors"
                            title="Riwayat Chat"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                        {!isInspectorOpen && (
                            <button onClick={() => setIsInspectorOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                                <PanelRightOpen className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-[10%] md:px-[15%] space-y-8 custom-scrollbar scroll-smooth bg-transparent">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >

                            {/* Avatar (Hide for user to maximize clean look, or keep minimal) */}
                            {msg.role === 'assistant' && (
                                <div className="mt-1 shrink-0">
                                    <OnThesisLogo variant="icon-only" className="w-9 h-full" showText={false} />
                                </div>
                            )}

                            {/* Content Bubble */}
                            <div className={`flex flex-col gap-1 min-w-0 ${msg.role === 'user' ? 'items-end max-w-[75%]' : 'items-start max-w-[90%] sm:max-w-[85%]'}`}>

                                {/* Reasoning Block (Analyst Mode) */}
                                {msg.role === 'assistant' && msg.reasoning && aiMode === 'analyst' && (
                                    <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-4 py-3 mb-3 w-full">
                                        <div className="flex items-center gap-1.5 font-semibold mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                                            <Lightbulb className="w-3 h-3" /> Thinking
                                        </div>
                                        <div className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap">
                                            {msg.reasoning}
                                        </div>
                                    </div>
                                )}

                                {/* Execution Log (Agent Mode) */}
                                {msg.role === 'assistant' && msg.steps && msg.steps.length > 0 && (
                                    <ExecutionLog steps={msg.steps} />
                                )}

                                {/* Main Text */}
                                {msg.role === 'user' ? (
                                    <div className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white px-5 py-3 rounded-[20px] rounded-tr-sm text-[15px] leading-7 font-medium shadow-sm">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="relative group/msg w-full pl-0 text-slate-800 dark:text-[#E3E3E3]">
                                        {/* Assistant Markdown Content */}
                                        <div className="py-1">
                                            <MarkdownRenderer content={msg.content} />
                                        </div>

                                        {/* Copy + Export Buttons (hover reveal) */}
                                        {msg.content && msg.id !== '1' && (
                                            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                                                <CopyMessageButton text={msg.content} />
                                                {/* Export buttons only for assistant messages with steps (analysis results) */}
                                                {msg.role === 'assistant' && msg.steps && msg.steps.length > 0 && (
                                                    <>
                                                        <button
                                                            onClick={() => handleExport('pdf', msg)}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Export as PDF"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleExport('docx', msg)}
                                                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 transition-colors"
                                                            title="Export as DOCX"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Inline Artifact Images */}
                                        {msg.artifacts && msg.artifacts.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                {msg.artifacts.map((artifact: any, idx: number) => (
                                                    artifact.type === 'image_base64' && (
                                                        <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                                                            <img
                                                                src={`data:image/png;base64,${artifact.data}`}
                                                                alt={`Chart ${idx + 1}`}
                                                                className="w-full h-auto bg-white"
                                                            />
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Suggested Actions */}
                                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {msg.suggestedActions.map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => executeAction(action)}
                                                className="
                                                        px-3.5 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 
                                                        rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300
                                                        hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400
                                                        transition-all active:scale-[0.97] shadow-sm
                                                        flex items-center gap-1.5
                                                    "
                                            >
                                                <Play className="w-3 h-3 opacity-40" />
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
                                <Sparkles className="w-4 h-4 text-white animate-pulse" />
                            </div>
                            <div className="flex items-center gap-1.5 py-3 px-4">
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-6" />
                </div>

                {/* Input Area (Floating Bottom) */}
                <div className="w-full px-4 sm:px-[10%] pb-6 pt-2 z-20 bg-gradient-to-t from-white via-white to-transparent dark:from-[#131314] dark:via-[#131314] dark:to-transparent">
                    <div className={`
                        relative w-full max-w-3xl mx-auto bg-[#F0F4F9] dark:bg-[#1E1F20] 
                        rounded-[2rem] transition-all duration-300 shadow-sm focus-within:shadow-md
                        ${isLoading ? 'opacity-80' : 'opacity-100'}
                    `}>
                        <div className="flex items-end p-2 pl-4">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask OnThesis..."

                                className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none py-3.5 text-base text-slate-800 dark:text-white placeholder:text-slate-500 resize-none max-h-40 custom-scrollbar shadow-none"
                                rows={1}
                            />

                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className={`
                                    p-2.5 rounded-full mb-1 transition-all duration-200 ml-2 shrink-0
                                    ${input.trim() && !isLoading
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 shadow-md'
                                        : 'bg-transparent text-slate-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <p className="text-[11px] text-slate-400">OnThesis may display inaccurate info, including about people, so double-check its responses.</p>
                    </div>
                </div>


            </div>
            {/* --- RIGHT INSPECTOR (Artifacts) --- */}
            <AnimatePresence initial={false}>
                {isInspectorOpen && activeArtifact && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 400, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full border-l border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-[#0D1117]/50 flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20"
                    >
                        {/* Inspector Header */}
                        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200/50 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <Layout className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Inspector</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setActiveArtifact(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-400">
                                    <X className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsInspectorOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md text-slate-400">
                                    <PanelRightClose className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Artifact Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="bg-white dark:bg-[#161B22] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                {/* Title Bar */}
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2" title={activeArtifact.title}>
                                        {activeArtifact.title}
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider
                                            ${activeArtifact.type === 'chart' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                                            activeArtifact.type === 'insight' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                                'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                        }
                                        `}>
                                        {activeArtifact.type}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className="p-1 bg-slate-100/50 dark:bg-black/20 min-h-[300px]">
                                    {(activeArtifact.type === 'chart' && activeArtifact.data?.option) || activeArtifact.type === 'image_base64' ? (
                                        <div className="h-[500px] w-full relative bg-white dark:bg-[#0D1117] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col overflow-hidden">
                                            <ChartRenderer
                                                data={transformArtifactToNormalizedData(activeArtifact)}
                                                height="100%"
                                                className="w-full h-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
                                            <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded-xl overflow-x-auto">
                                                {typeof activeArtifact.data === 'string' ? activeArtifact.data : JSON.stringify(activeArtifact.data, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                                <div className="flex gap-3">
                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg h-fit text-blue-600 dark:text-blue-400">
                                        <Lightbulb className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Context Awareness</h4>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                            The AI generated this artifact based on your query about "{input || 'data analysis'}". You can ask follow-up questions to refine this view.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat History Panel */}
            <ChatHistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelectChat={handleSelectChat}
                currentChatId={chatId}
            />
        </div>
    )
}

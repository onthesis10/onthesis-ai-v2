import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Trash2, X, Clock } from 'lucide-react'
import { listChats, deleteChat, type ChatSession } from '../../services/chatHistoryService'
import { useThemeStore } from '@/store/themeStore'

interface ChatHistoryPanelProps {
    isOpen: boolean
    onClose: () => void
    onSelectChat: (chatId: string) => void
    currentChatId: string | null
}

export const ChatHistoryPanel = ({ isOpen, onClose, onSelectChat, currentChatId }: ChatHistoryPanelProps) => {
    const [chats, setChats] = useState<ChatSession[]>([])
    const [loading, setLoading] = useState(false)
    const { theme } = useThemeStore()
    const isHappy = theme === 'happy'

    useEffect(() => {
        if (isOpen) {
            loadChats()
        }
    }, [isOpen])

    const loadChats = async () => {
        setLoading(true)
        try {
            const result = await listChats()
            setChats(result)
        } catch (e) {
            console.error('Failed to load chats:', e)
        }
        setLoading(false)
    }

    const handleDelete = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation()
        try {
            await deleteChat(chatId)
            setChats(prev => prev.filter(c => c.id !== chatId))
        } catch (e) {
            console.error('Failed to delete chat:', e)
        }
    }

    const formatDate = (date: Date) => {
        const d = new Date(date)
        const now = new Date()
        const diff = now.getTime() - d.getTime()
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return 'Baru saja'
        if (mins < 60) return `${mins} menit lalu`
        if (hours < 24) return `${hours} jam lalu`
        if (days < 7) return `${days} hari lalu`
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`fixed right-0 top-0 h-full w-80 shadow-2xl z-50 flex flex-col border-l backdrop-blur-3xl
                            ${isHappy ? 'bg-[#FFFCF5]/80 border-orange-100/50 text-stone-800' : 'bg-[#F5F5F7]/90 dark:bg-[#0B1120]/80 border-slate-200/50 dark:border-white/5 text-slate-900 dark:text-white'}
                        `}
                    >
                        {/* Panel Header */}
                        <div className={`h-14 flex items-center justify-between px-4 border-b shrink-0
                            ${isHappy ? 'border-orange-100/50' : 'border-slate-200/50 dark:border-white/5'}
                        `}>
                            <div className="flex items-center gap-2">
                                <MessageSquare className={`w-4 h-4 ${isHappy ? 'text-orange-500' : 'text-blue-500'}`} />
                                <span className={`text-sm font-semibold ${isHappy ? 'text-stone-700' : 'text-slate-700 dark:text-slate-200'}`}>Chat History</span>
                            </div>
                            <button
                                onClick={onClose}
                                className={`p-1.5 rounded-lg transition-colors
                                    ${isHappy ? 'hover:bg-orange-100 text-stone-400 hover:text-orange-600' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                                `}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin
                                        ${isHappy ? 'border-orange-500' : 'border-blue-500'}
                                    `} />
                                </div>
                            ) : chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <MessageSquare className={`w-10 h-10 mb-3 ${isHappy ? 'text-orange-200' : 'text-slate-300 dark:text-slate-600'}`} />
                                    <p className={`text-sm ${isHappy ? 'text-stone-500' : 'text-slate-500 dark:text-slate-400'}`}>Belum ada riwayat chat</p>
                                    <p className={`text-xs mt-1 ${isHappy ? 'text-stone-400' : 'text-slate-400 dark:text-slate-500'}`}>Chat baru akan muncul di sini</p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {chats.map(chat => (
                                        <button
                                            key={chat.id}
                                            onClick={() => { onSelectChat(chat.id); onClose() }}
                                            className={`
                        w-full text-left px-4 py-3 flex items-start gap-3 transition-all group
                        ${isHappy ? 'hover:bg-orange-50/50' : 'hover:bg-black/5 dark:hover:bg-white/5'}
                        ${currentChatId === chat.id
                                                    ? (isHappy ? 'bg-gradient-to-r from-orange-400/10 to-rose-400/10 border-r-2 border-orange-400' : 'bg-[#007AFF]/10 dark:bg-[#0EA5E9]/10 border-r-2 border-[#007AFF] dark:border-[#0EA5E9]')
                                                    : 'border-r-2 border-transparent'
                                                }
                      `}
                                        >
                                            <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${isHappy ? 'text-orange-400 group-hover:text-orange-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-[#0EA5E9]'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isHappy ? 'text-stone-700 group-hover:text-orange-700' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                                    {chat.title}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Clock className={`w-3 h-3 ${isHappy ? 'text-stone-400' : 'text-slate-400'}`} />
                                                    <span className={`text-[11px] ${isHappy ? 'text-stone-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {formatDate(chat.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, chat.id)}
                                                className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0
                                                    ${isHappy ? 'hover:bg-red-50 text-stone-400 hover:text-red-500' : 'hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500'}
                                                `}
                                                title="Hapus chat"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

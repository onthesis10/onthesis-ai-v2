import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Trash2, X, Clock } from 'lucide-react'
import { listChats, deleteChat, type ChatSession } from '../../services/chatHistoryService'

interface ChatHistoryPanelProps {
    isOpen: boolean
    onClose: () => void
    onSelectChat: (chatId: string) => void
    currentChatId: string | null
}

export const ChatHistoryPanel = ({ isOpen, onClose, onSelectChat, currentChatId }: ChatHistoryPanelProps) => {
    const [chats, setChats] = useState<ChatSession[]>([])
    const [loading, setLoading] = useState(false)

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
                        className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-[#1E1F20] shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-white/10"
                    >
                        {/* Panel Header */}
                        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chat History</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada riwayat chat</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Chat baru akan muncul di sini</p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {chats.map(chat => (
                                        <button
                                            key={chat.id}
                                            onClick={() => { onSelectChat(chat.id); onClose() }}
                                            className={`
                        w-full text-left px-4 py-3 flex items-start gap-3 transition-all group
                        hover:bg-slate-50 dark:hover:bg-white/5
                        ${currentChatId === chat.id
                                                    ? 'bg-blue-50 dark:bg-blue-500/10 border-r-2 border-blue-500'
                                                    : ''
                                                }
                      `}
                                        >
                                            <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                    {chat.title}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                        {formatDate(chat.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, chat.id)}
                                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all shrink-0"
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

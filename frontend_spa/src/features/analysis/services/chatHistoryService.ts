import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

export interface ChatSession {
    id: string
    title: string
    messages: any[]
    createdAt: Date
    updatedAt: Date
}

const COLLECTION = 'chat_history'

function getUserId(): string | null {
    return auth?.currentUser?.uid || null
}

function getChatCollection() {
    const uid = getUserId()
    if (!uid || !db) return null
    return collection(db, 'users', uid, COLLECTION)
}

// --- LOCAL STORAGE FALLBACK ---
const LS_KEY = 'onthesis_chat_history'

function getLocalChats(): ChatSession[] {
    try {
        const raw = localStorage.getItem(LS_KEY)
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function setLocalChats(chats: ChatSession[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(chats))
}

// --- PUBLIC API ---

export async function saveChat(chatId: string, messages: any[], title?: string): Promise<void> {
    const autoTitle = title || extractTitle(messages)
    const chatCol = getChatCollection()

    if (chatCol) {
        // Firebase mode
        try {
            const docRef = doc(chatCol, chatId)
            await setDoc(docRef, {
                title: autoTitle,
                messages: JSON.parse(JSON.stringify(messages.map(serializeMessage))),
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true })
            return
        } catch (e) {
            console.warn('Firebase save failed, using localStorage fallback:', e)
        }
    }

    // localStorage fallback
    const chats = getLocalChats()
    const idx = chats.findIndex(c => c.id === chatId)
    const chatData: ChatSession = {
        id: chatId,
        title: autoTitle,
        messages: messages.map(serializeMessage),
        createdAt: idx >= 0 ? chats[idx].createdAt : new Date(),
        updatedAt: new Date()
    }
    if (idx >= 0) {
        chats[idx] = chatData
    } else {
        chats.unshift(chatData)
    }
    setLocalChats(chats)
}

export async function loadChat(chatId: string): Promise<ChatSession | null> {
    const chatCol = getChatCollection()

    if (chatCol) {
        try {
            const docRef = doc(chatCol, chatId)
            const snap = await getDoc(docRef)
            if (snap.exists()) {
                const data = snap.data()
                return {
                    id: snap.id,
                    title: data.title,
                    messages: data.messages.map(deserializeMessage),
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                    updatedAt: data.updatedAt?.toDate?.() || new Date()
                }
            }
            return null
        } catch (e) {
            console.warn('Firebase load failed, using localStorage fallback:', e)
        }
    }

    // localStorage fallback
    const chats = getLocalChats()
    const chat = chats.find(c => c.id === chatId)
    return chat ? { ...chat, messages: chat.messages.map(deserializeMessage) } : null
}

export async function listChats(): Promise<ChatSession[]> {
    const chatCol = getChatCollection()

    if (chatCol) {
        try {
            const q = query(chatCol, orderBy('updatedAt', 'desc'))
            const snap = await getDocs(q)
            return snap.docs.map(d => {
                const data = d.data()
                return {
                    id: d.id,
                    title: data.title,
                    messages: [], // Don't load all messages for list view
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                    updatedAt: data.updatedAt?.toDate?.() || new Date()
                }
            })
        } catch (e) {
            console.warn('Firebase list failed, using localStorage fallback:', e)
        }
    }

    // localStorage fallback
    return getLocalChats()
        .map(c => ({ ...c, messages: [] }))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function deleteChat(chatId: string): Promise<void> {
    const chatCol = getChatCollection()

    if (chatCol) {
        try {
            await deleteDoc(doc(chatCol, chatId))
            return
        } catch (e) {
            console.warn('Firebase delete failed, using localStorage fallback:', e)
        }
    }

    // localStorage fallback
    const chats = getLocalChats().filter(c => c.id !== chatId)
    setLocalChats(chats)
}

// --- HELPERS ---

function extractTitle(messages: any[]): string {
    const firstUserMsg = messages.find(m => m.role === 'user')
    if (firstUserMsg) {
        const text = firstUserMsg.content || ''
        return text.length > 50 ? text.slice(0, 50) + '...' : text
    }
    return 'Chat Baru'
}

function serializeMessage(msg: any) {
    return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        steps: msg.steps || undefined,
        artifacts: msg.artifacts || undefined,
        suggestedActions: msg.suggestedActions || undefined,
        reasoning: msg.reasoning || undefined
    }
}

function deserializeMessage(msg: any) {
    return {
        ...msg,
        timestamp: new Date(msg.timestamp)
    }
}

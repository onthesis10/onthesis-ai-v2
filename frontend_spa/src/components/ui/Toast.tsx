import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000); // Auto dismiss
    }, [removeToast]);

    const success = (msg: string) => showToast(msg, 'success');
    const error = (msg: string) => showToast(msg, 'error');
    const info = (msg: string) => showToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ showToast, success, error, info }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[1001] flex flex-col gap-2 w-80 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-right-full duration-300
                            ${toast.type === 'success' ? 'bg-background/90 border-green-500/20 text-green-600 dark:text-green-400' : ''}
                            ${toast.type === 'error' ? 'bg-background/90 border-red-500/20 text-red-600 dark:text-red-400' : ''}
                            ${toast.type === 'info' ? 'bg-background/90 border-blue-500/20 text-blue-600 dark:text-blue-400' : ''}
                        `}
                    >
                        {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                        {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" />}

                        <p className="text-sm font-medium flex-1">{toast.message}</p>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-70 hover:opacity-100"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

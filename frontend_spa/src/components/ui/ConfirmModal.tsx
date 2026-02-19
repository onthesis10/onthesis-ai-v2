import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
    isLoading = false
}: ConfirmModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Click outside to close (if not loading)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                if (!isLoading) onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, isLoading]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal Card */}
            <div
                ref={modalRef}
                className="relative w-full max-w-sm bg-card text-card-foreground border border-border rounded-[var(--radius)] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
                            danger
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : "bg-primary/10 text-primary border-primary/20 hover:brightness-110 active:scale-95 transition-all w-8 h-8 flex items-center justify-center p-1.5 rounded-lg" // Reusing icon container style if not danger
                        )}>
                            <AlertTriangle className={cn("w-4 h-4", danger ? "text-red-600 dark:text-red-400" : "text-primary")} />
                        </div>
                        <h2 className="text-base font-bold tracking-tight text-foreground line-clamp-1">
                            {title}
                        </h2>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-end gap-3 rounded-b-[var(--radius)]">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2",
                            danger
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                                : "bg-primary hover:bg-primary/90 shadow-primary/20"
                        )}
                    >
                        {isLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

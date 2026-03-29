import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string | number;
    label: string;
    icon?: React.ElementType;
}

interface SelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    label?: string;
}

export const Select = ({
    value,
    onChange,
    options,
    placeholder = "Select option...",
    className,
    disabled = false,
    label
}: SelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 'auto' as string | number, bottom: 'auto' as string | number, left: 0, width: 0 });
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

    // Update koordinat posisi dropdown dengan presisi
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;

                    // Asumsi tinggi tiap opsi ~36px + padding container 8px
                    const dropdownHeight = Math.min(options.length * 36 + 8, 240);
                    const GAP = 6; // Jarak presisi antara tombol dan dropdown

                    let isTop = false;
                    // Jika ruang di bawah kurang, dan ruang di atas lebih luas, buka ke atas
                    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                        isTop = true;
                    }

                    setPosition(isTop ? 'top' : 'bottom');

                    setCoords({
                        top: isTop ? 'auto' : rect.bottom + GAP,
                        bottom: isTop ? window.innerHeight - rect.top + GAP : 'auto',
                        left: rect.left,
                        width: rect.width
                    });
                }
            };

            updatePosition();
            // Gunakan passive listener untuk performa scroll yang lebih baik
            window.addEventListener('resize', updatePosition, { passive: true });
            window.addEventListener('scroll', updatePosition, true);

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [isOpen, options.length]);

    const selectedOption = options.find(opt => opt.value === value);

    const toggleOpen = () => {
        if (!disabled) setIsOpen(!isOpen);
    };

    return (
        <div className={cn("relative w-full", className)}>
            {label && (
                <label className="block text-sm font-semibold text-foreground mb-1.5 ml-1">
                    {label}
                </label>
            )}

            <button
                ref={containerRef}
                type="button"
                onClick={toggleOpen}
                disabled={disabled}
                className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 outline-none",
                    "bg-secondary/30 hover:bg-secondary/50 focus:ring-2 focus:ring-cyan-500/20",
                    isOpen ? "border-cyan-500 ring-2 ring-cyan-500/20" : "border-border/50",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <div className="p-1 rounded bg-current/10 text-current">
                            <selectedOption.icon className="w-3.5 h-3.5" />
                        </div>
                    )}
                    <span className={cn("text-sm", !selectedOption && "text-muted-foreground")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-300 ease-out",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Portal untuk Dropdown */}
            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop transparan */}
                            <div
                                className="fixed inset-0 z-[9998] bg-transparent"
                                onClick={() => setIsOpen(false)}
                            />

                            {/* Injeksi CSS Custom Scrollbar yang presisi */}
                            <style>{`
                                .precise-scrollbar::-webkit-scrollbar {
                                    width: 5px;
                                }
                                .precise-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                    margin: 4px; /* Memberi jarak agar scrollbar tidak mentok ujung */
                                }
                                .precise-scrollbar::-webkit-scrollbar-thumb {
                                    background: rgba(156, 163, 175, 0.4);
                                    border-radius: 10px;
                                }
                                .precise-scrollbar::-webkit-scrollbar-thumb:hover {
                                    background: rgba(156, 163, 175, 0.7);
                                }
                                /* Dukungan untuk Firefox */
                                .precise-scrollbar {
                                    scrollbar-width: thin;
                                    scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
                                }
                            `}</style>

                            <motion.div
                                initial={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{
                                    top: coords.top,
                                    bottom: coords.bottom,
                                    left: coords.left,
                                    width: coords.width,
                                    position: 'fixed'
                                }}
                                className="z-[9999] bg-popover/95 border border-border/50 rounded-xl shadow-xl overflow-hidden backdrop-blur-xl"
                            >
                                {/* Wrapper khusus untuk scrollbar */}
                                <div className="max-h-[240px] overflow-y-auto precise-scrollbar p-1.5 space-y-0.5">
                                    {options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150",
                                                option.value === value
                                                    ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold"
                                                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {option.icon && <option.icon className="w-4 h-4 opacity-70" />}
                                                <span>{option.label}</span>
                                            </div>
                                            {option.value === value && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                >
                                                    <Check className="w-4 h-4 text-cyan-500" />
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
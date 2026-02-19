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
    const containerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Update coordinates when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    setCoords({
                        top: rect.bottom + window.scrollY + 8,
                        left: rect.left + window.scrollX,
                        width: rect.width
                    });
                }
            };

            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [isOpen]);

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
                ref={containerRef as any}
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
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop for click outside */}
                            <div
                                className="fixed inset-0 z-[9998] bg-transparent"
                                onClick={() => setIsOpen(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    top: coords.top,
                                    left: coords.left,
                                    width: coords.width,
                                    position: 'absolute'
                                }}
                                className="z-[9999] bg-popover border border-border/50 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl"
                            >
                                <div className="p-1 space-y-0.5">
                                    {options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                                                option.value === value
                                                    ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-medium"
                                                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {option.icon && <option.icon className="w-4 h-4 opacity-70" />}
                                                <span>{option.label}</span>
                                            </div>
                                            {option.value === value && (
                                                <Check className="w-3.5 h-3.5 text-cyan-500" />
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

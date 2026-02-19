import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    label?: string; // Optional label for UI
    disabled?: boolean;
}

export function Select({ value, onChange, options, placeholder = "Select...", className = "", label, disabled = false }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">{label}</label>}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm bg-input border rounded-lg transition-all focus:ring-1 focus:ring-primary/20
                    ${isOpen ? 'border-primary' : 'border-border'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'}
                    text-foreground
                `}
                disabled={disabled}
            >
                <span className={selectedOption ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-popover border border-border rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto custom-scroll">
                    <div className="p-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left
                                    ${value === option.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'}
                                `}
                            >
                                <span>{option.label}</span>
                                {value === option.value && <Check className="w-3.5 h-3.5" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

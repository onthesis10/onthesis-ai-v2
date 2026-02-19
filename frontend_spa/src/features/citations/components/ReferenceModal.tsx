import React, { useState, useEffect, useRef } from 'react';
import { X, Book, FileText, Globe, GraduationCap, Link2, Quote, Check, User, Calendar, Type, ChevronDown } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

interface ReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

const REFERENCE_TYPES = [
    { value: 'journal', label: 'Journal Article', icon: FileText },
    { value: 'book', label: 'Book', icon: Book },
    { value: 'website', label: 'Website', icon: Globe },
    { value: 'thesis', label: 'Thesis / Dissertation', icon: GraduationCap }
];

export function ReferenceModal({ isOpen, onClose, onSubmit }: ReferenceModalProps) {
    const { theme } = useThemeStore();
    const isHappy = theme === 'happy';

    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('journal');

    // State untuk Custom Dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        year: new Date().getFullYear().toString(),
        journal: '',
        publisher: '',
        url: '',
        doi: '',
        notes: ''
    });

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: '',
                author: '',
                year: new Date().getFullYear().toString(),
                journal: '',
                publisher: '',
                url: '',
                doi: '',
                notes: ''
            });
            setType('journal');
            setIsDropdownOpen(false);
        }
    }, [isOpen]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ ...formData, type });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const activeType = REFERENCE_TYPES.find(t => t.value === type) || REFERENCE_TYPES[0];
    const ActiveIcon = activeType.icon;

    // --- DYNAMIC STYLES ---
    const styles = isHappy ? {
        containerBorder: "from-orange-400/40 via-white/40 to-rose-400/40",
        containerShadow: "shadow-[0_0_80px_-20px_rgba(251,146,60,0.3)]",
        bg: "bg-[#FFFCF5]/95",
        headerBg: "bg-orange-50/50 border-orange-100",
        iconBg: "bg-gradient-to-br from-orange-400/20 to-rose-400/20 text-orange-600",
        textTitle: "text-stone-800",
        textMuted: "text-stone-400",
        inputBg: "bg-white/60 focus:bg-white border-orange-100/50 focus:border-orange-300 focus:ring-orange-500/10 placeholder:text-stone-300 text-stone-700",
        footerBg: "bg-orange-50/30 border-orange-100/50",
        btnCancel: "text-stone-400 hover:text-stone-600 hover:bg-orange-50",
        btnSubmit: "bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white shadow-orange-500/20",
        label: "text-stone-400",
        // Dropdown specific
        dropdownTrigger: "bg-white/60 border-orange-100/50 text-stone-700 hover:bg-white hover:border-orange-200",
        dropdownMenu: "bg-white/95 border-orange-100",
        dropdownItemActive: "bg-orange-50 text-orange-700 font-semibold",
        dropdownItemHover: "hover:bg-orange-50/50 text-stone-600 hover:text-stone-800"
    } : {
        containerBorder: "from-primary/50 via-background/20 to-primary/20",
        containerShadow: "shadow-[0_0_80px_-20px_rgba(var(--primary),0.3)]",
        bg: "bg-background/90",
        headerBg: "bg-white/5 border-white/5",
        iconBg: "bg-primary/10 text-primary",
        textTitle: "text-foreground",
        textMuted: "text-muted-foreground",
        inputBg: "bg-secondary/30 focus:bg-background border-border/40 focus:border-primary/50 focus:ring-primary/5 placeholder:text-muted-foreground/40 text-foreground",
        footerBg: "bg-muted/20 border-border/40",
        btnCancel: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        btnSubmit: "btn-primary shadow-primary/25",
        label: "text-muted-foreground",
        // Dropdown specific
        dropdownTrigger: "bg-secondary/30 border-border/40 text-foreground hover:bg-secondary/50",
        dropdownMenu: "bg-background/95 border-white/10",
        dropdownItemActive: "bg-primary/10 text-primary font-semibold",
        dropdownItemHover: "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">

            {/* Gradient Border Container */}
            <div className={`relative w-full max-w-lg h-auto max-h-[90vh] flex flex-col rounded-3xl p-[1px] bg-gradient-to-br ${styles.containerBorder} ${styles.containerShadow} animate-in zoom-in-95 duration-300`}>

                {/* Glass Content */}
                <div className={`w-full h-full flex flex-col overflow-hidden rounded-[calc(1.5rem-1px)] backdrop-blur-3xl border-0 ${styles.bg}`}>

                    {/* Header */}
                    <div className={`px-6 py-5 border-b flex justify-between items-center shrink-0 ${styles.headerBg}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl shadow-inner ${styles.iconBg}`}>
                                <Quote className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold tracking-tight ${styles.textTitle}`}>Add Reference</h3>
                                <p className={`text-xs font-medium ${styles.textMuted}`}>Manual Entry</p>
                            </div>
                        </div>

                        <button onClick={onClose} className={`p-2 rounded-lg transition-all ${styles.btnCancel}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scroll p-6">
                        <form id="ref-form" onSubmit={handleSubmit} className="space-y-5">

                            {/* CUSTOM DROPDOWN */}
                            <div className="space-y-1.5 relative z-50" ref={dropdownRef}>
                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${styles.label}`}>Source Type</label>

                                <div className="relative">
                                    {/* Trigger Button */}
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium outline-none border transition-all shadow-sm ${styles.dropdownTrigger} ${isDropdownOpen ? 'ring-2 ring-primary/20 border-primary/50' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ActiveIcon className={`w-4 h-4 ${isHappy ? 'text-orange-500' : 'text-primary'}`} />
                                            <span>{activeType.label}</span>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''} opacity-50`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <div className={`absolute top-[calc(100%+6px)] left-0 right-0 rounded-xl border shadow-xl p-1.5 animate-in fade-in zoom-in-95 backdrop-blur-xl ${styles.dropdownMenu}`}>
                                            <div className="flex flex-col gap-0.5">
                                                {REFERENCE_TYPES.map((t) => (
                                                    <button
                                                        key={t.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setType(t.value);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${type === t.value ? styles.dropdownItemActive : styles.dropdownItemHover
                                                            }`}
                                                    >
                                                        <t.icon className={`w-4 h-4 ${type === t.value ? '' : 'opacity-70'}`} />
                                                        {t.label}
                                                        {type === t.value && <Check className="w-3.5 h-3.5 ml-auto opacity-70" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Fields Group */}
                            <div className={`grid gap-4 p-4 rounded-2xl border ${isHappy ? 'bg-white/40 border-orange-100/50' : 'bg-secondary/20 border-border/30'}`}>
                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1 ${styles.label}`}>
                                        <Type className="w-3 h-3" /> Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                        required
                                        placeholder="e.g. The Future of AI in Education"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1 ${styles.label}`}>
                                            <User className="w-3 h-3" /> Author
                                        </label>
                                        <input
                                            type="text"
                                            name="author"
                                            value={formData.author}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                            placeholder="LastName, First..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1 ${styles.label}`}>
                                            <Calendar className="w-3 h-3" /> Year
                                        </label>
                                        <input
                                            type="number"
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Fields */}
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                {type === 'journal' && (
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${styles.label}`}>Journal Name</label>
                                        <input
                                            type="text"
                                            name="journal"
                                            value={formData.journal}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                            placeholder="e.g. Nature"
                                        />
                                    </div>
                                )}

                                {(type === 'book' || type === 'thesis') && (
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${styles.label}`}>Publisher / Institution</label>
                                        <input
                                            type="text"
                                            name="publisher"
                                            value={formData.publisher}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                        />
                                    </div>
                                )}

                                {(type === 'website' || type === 'journal') && (
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 flex items-center gap-1 ${styles.label}`}>
                                            URL <Link2 className="w-3 h-3" />
                                        </label>
                                        <input
                                            type="url"
                                            name="url"
                                            value={formData.url}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                            placeholder="https://..."
                                        />
                                    </div>
                                )}

                                {type === 'journal' && (
                                    <div className="space-y-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${styles.label}`}>DOI</label>
                                        <input
                                            type="text"
                                            name="doi"
                                            value={formData.doi}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all ${styles.inputBg}`}
                                            placeholder="10.1038/..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${styles.label}`}>Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={2}
                                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-4 transition-all resize-none ${styles.inputBg}`}
                                    placeholder="Add personal notes..."
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className={`p-5 border-t backdrop-blur-sm flex justify-end gap-3 shrink-0 ${styles.footerBg}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-5 py-2.5 text-xs font-bold uppercase rounded-xl transition-all ${styles.btnCancel}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="ref-form"
                            disabled={loading}
                            className={`px-6 py-2.5 text-xs font-bold rounded-xl uppercase shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:-translate-y-0.5 ${styles.btnSubmit}`}
                        >
                            {loading ? 'Saving...' : <><Check className="w-3.5 h-3.5" /> Save Reference</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
import { useState, useEffect, useRef } from 'react';
import {
    X, Calendar as CalendarIcon, Check, ChevronDown,
    ChevronLeft, ChevronRight, Clock, StickyNote, Type,
    LayoutTemplate, Sparkles, Command
} from 'lucide-react';
import { Project } from '../types';
import { cn } from '@/lib/utils';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Project>) => Promise<void>;
    project?: Project;
}

export function ProjectModal({ isOpen, onClose, onSubmit, project }: ProjectModalProps) {
    const isEdit = !!project;
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'DRAFT' | 'ON GOING' | 'REVISI' | 'SELESAI'>('DRAFT');
    const [progress, setProgress] = useState(0);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // UI State
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const statusRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Load Data
    useEffect(() => {
        if (project && isOpen) {
            setTitle(project.title);
            setDescription(project.description || '');
            setStatus(project.status);
            setProgress(project.progress || 0);
            if (project.endDate) {
                const date = project.endDate.toDate ? project.endDate.toDate() : new Date(project.endDate);
                setEndDate(date);
            } else { setEndDate(null); }
        } else if (!project && isOpen) {
            setTitle(''); setDescription(''); setStatus('DRAFT'); setProgress(0); setEndDate(null);
        }
    }, [project, isOpen]);

    // Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false);
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) setIsCalendarOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try { await onSubmit({ title, description, status, progress, endDate: endDate || undefined }); onClose(); }
        catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentMonth(newDate);
    };

    // Semantic Status Colors
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'ON GOING': return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
            case 'REVISI': return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
            case 'SELESAI': return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
            default: return "bg-secondary text-muted-foreground border-border";
        }
    };

    if (!isOpen) return null;
    const { days, firstDay } = getDaysInMonth(currentMonth);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            />

            {/* Modal Card */}
            {/* Masalah Overflow: Kita butuh overflow-visible untuk dropdown, tapi ini bikin border radius 'bocor' */}
            <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-[var(--radius)] shadow-2xl flex flex-col max-h-[85vh] overflow-visible animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300">

                {/* --- Compact Header --- */}
                {/* FIX 1: Negative Margin (-mx-[1px] -mt-[1px]) untuk menimpa border parent */}
                {/* FIX 2: Width calc(100%+2px) untuk memastikan lebar menutupi kiri kanan */}
                <div className="px-6 py-4 border-b border-border/40 flex justify-between items-center bg-muted/20 rounded-t-[var(--radius)] -mx-[1px] -mt-[1px] w-[calc(100%+2px)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                            {isEdit ? <LayoutTemplate className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight text-foreground">
                                {isEdit ? 'Sunting Proyek' : 'Proyek Baru'}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden w-full">
                    {/* --- Body --- */}
                    <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">

                        {/* Title Input */}
                        <div className="space-y-1.5 group">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-1.5">
                                <Type className="w-3 h-3" /> Judul
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/50 rounded-xl text-sm font-semibold focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50"
                                    placeholder="Nama proyek..."
                                    autoFocus
                                />
                                <Command className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-1.5">
                                <StickyNote className="w-3 h-3" /> Deskripsi
                            </label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl text-sm font-medium focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none placeholder:text-muted-foreground/50 leading-relaxed"
                                placeholder="Detail singkat..."
                            />
                        </div>

                        {/* Grid: Status & Date */}
                        <div className="grid grid-cols-2 gap-4">

                            {/* Status Picker */}
                            <div className="space-y-1.5 relative" ref={statusRef}>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-1.5">
                                    <Check className="w-3 h-3" /> Status
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                                    className="w-full px-3 py-2.5 bg-muted/30 border border-border/50 rounded-xl text-left flex justify-between items-center hover:bg-muted/50 transition-colors"
                                >
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border", getStatusColor(status))}>
                                        {status}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>

                                {/* Dropdown */}
                                {isStatusOpen && (
                                    <div className="absolute bottom-full mb-2 left-0 right-0 p-1.5 bg-popover border border-border/50 rounded-xl shadow-xl z-[999] animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                                        {['DRAFT', 'ON GOING', 'REVISI', 'SELESAI'].map((s: any) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => { setStatus(s); setIsStatusOpen(false); }}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-between"
                                            >
                                                {s}
                                                {status === s && <Check className="w-3 h-3 text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Date Picker */}
                            <div className="space-y-1.5 relative" ref={calendarRef}>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3" /> Deadline
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                    className="w-full px-3 py-2.5 bg-muted/30 border border-border/50 rounded-xl text-left flex justify-between items-center hover:bg-muted/50 transition-colors"
                                >
                                    <span className={cn("text-xs font-medium truncate", endDate ? "text-foreground" : "text-muted-foreground")}>
                                        {endDate ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(endDate) : '-'}
                                    </span>
                                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>

                                {/* Calendar Popup */}
                                {isCalendarOpen && (
                                    <div className="absolute bottom-full mb-2 right-0 w-64 p-3 bg-popover border border-border/50 rounded-xl shadow-2xl z-[999] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 ring-1 ring-border/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <button type="button" onClick={() => navigateMonth('prev')} className="p-1 hover:bg-muted rounded-full"><ChevronLeft className="w-4 h-4" /></button>
                                            <span className="text-xs font-bold text-foreground">{currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</span>
                                            <button type="button" onClick={() => navigateMonth('next')} className="p-1 hover:bg-muted rounded-full"><ChevronRight className="w-4 h-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d} className="text-[10px] text-muted-foreground">{d}</span>)}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                                            {Array.from({ length: days }).map((_, i) => {
                                                const d = i + 1;
                                                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
                                                const isSelected = endDate?.toDateString() === date.toDateString();
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => { setEndDate(date); setIsCalendarOpen(false); }}
                                                        className={cn(
                                                            "w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                                                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {d}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button type="button" onClick={() => { setEndDate(null); setIsCalendarOpen(false) }} className="w-full text-[10px] text-destructive hover:underline mt-2 text-center">Clear</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compact Slider */}
                        <div className="space-y-2 pt-1">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> Progress
                                </label>
                                <span className="text-sm font-bold font-mono text-primary">{progress}%</span>
                            </div>
                            <div className="relative h-4 flex items-center group">
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={progress}
                                    onChange={(e) => setProgress(parseInt(e.target.value))}
                                    className="w-full absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div
                                    className="absolute w-3.5 h-3.5 bg-card border border-primary rounded-full shadow-sm transition-all duration-100 pointer-events-none flex items-center justify-center"
                                    style={{ left: `calc(${progress}% - 7px)` }}
                                >
                                    <div className="w-1 h-1 bg-primary rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Compact Footer --- */}
                    {/* FIX 3: Same fix for Footer (-mx-[1px] -mb-[1px]) */}
                    <div className="px-6 py-4 bg-muted/20 border-t border-border/40 rounded-b-[var(--radius)] -mx-[1px] -mb-[1px] w-[calc(100%+2px)]">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[var(--radius)] bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                            {isLoading ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Proyek')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
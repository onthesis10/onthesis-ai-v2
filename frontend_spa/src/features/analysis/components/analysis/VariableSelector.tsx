import React from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'

interface Variable {
    id: string
    name: string
    type?: string
    measure?: string
}

interface VariableSelectorProps {
    availableVars: Variable[]
    selectedVars: Variable[]
    onAdd: (vars: Variable[]) => void
    onRemove: (vars: Variable[]) => void
    label?: string
    maxLimit?: number
}

export const VariableSelector = ({
    availableVars,
    selectedVars,
    onAdd,
    onRemove,
    label = "VARIABLES", // Default diubah agar sesuai dengan gambar
    maxLimit
}: VariableSelectorProps) => {

    const [selectedSource, setSelectedSource] = React.useState<string[]>([])
    const [selectedTarget, setSelectedTarget] = React.useState<string[]>([])

    const { theme } = useThemeStore()

    // --- THEME CONFIG (Ultra Premium, Bold & Glassmorphic) ---
    const activeConfig = {
        light: {
            label: "text-slate-500",
            containerSource: "bg-slate-50/60 border-black/5 backdrop-blur-md",
            containerTarget: "bg-white/90 border-transparent ring-1 ring-black/5 backdrop-blur-xl shadow-sm",
            itemBase: "text-slate-600 hover:bg-black/5 border-transparent",
            itemSourceSelected: "bg-[#007AFF]/10 text-[#007AFF] !border-[#007AFF]/20 shadow-sm",
            itemTargetSelected: "bg-rose-500/10 text-rose-600 !border-rose-500/20 shadow-sm",
            btnMove: "bg-white border-transparent ring-1 ring-black/5 text-slate-500 shadow-sm hover:shadow-md",
            btnMoveRightHover: "hover:bg-[#007AFF] hover:ring-[#007AFF] hover:text-white",
            btnMoveLeftHover: "hover:bg-rose-500 hover:ring-rose-500 hover:text-white",
            btnDisabled: "disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:ring-black/5 disabled:shadow-none",
            emptyText: "text-slate-400"
        },
        dark: {
            label: "text-slate-400",
            containerSource: "bg-[#0B1120]/40 border-white/5 backdrop-blur-md",
            containerTarget: "bg-[#1E293B]/60 border-transparent ring-1 ring-white/10 backdrop-blur-xl shadow-md",
            itemBase: "text-slate-300 hover:bg-white/5 border-transparent",
            itemSourceSelected: "bg-[#0EA5E9]/20 text-[#0EA5E9] !border-[#0EA5E9]/30 shadow-sm",
            itemTargetSelected: "bg-rose-500/20 text-rose-400 !border-rose-500/30 shadow-sm",
            btnMove: "bg-[#1E293B]/80 border-transparent ring-1 ring-white/10 text-slate-400 shadow-sm hover:shadow-md",
            btnMoveRightHover: "hover:bg-[#0EA5E9] hover:ring-[#0EA5E9] hover:text-white shadow-[0_0_15px_-3px_rgba(14,165,233,0.4)]",
            btnMoveLeftHover: "hover:bg-rose-500 hover:ring-rose-500 hover:text-white shadow-[0_0_15px_-3px_rgba(244,63,94,0.4)]",
            btnDisabled: "disabled:opacity-40 disabled:hover:bg-[#1E293B]/80 disabled:hover:text-slate-400 disabled:hover:ring-white/10 disabled:shadow-none",
            emptyText: "text-slate-500"
        },
        happy: {
            label: "text-orange-500",
            containerSource: "bg-[#FFF9F0]/60 border-orange-100/50 backdrop-blur-md", // Soft warm tint
            containerTarget: "bg-white/95 border-transparent ring-1 ring-orange-100 backdrop-blur-xl shadow-sm",
            itemBase: "text-stone-700 hover:bg-orange-50 border-transparent",
            itemSourceSelected: "bg-orange-100/80 text-orange-700 !border-orange-200 shadow-sm",
            itemTargetSelected: "bg-rose-100/80 text-rose-700 !border-rose-200 shadow-sm",
            btnMove: "bg-white/90 border-transparent ring-1 ring-orange-100 text-orange-400 shadow-sm hover:shadow-md",
            btnMoveRightHover: "hover:bg-orange-400 hover:ring-orange-400 hover:text-white shadow-md shadow-orange-500/20",
            btnMoveLeftHover: "hover:bg-rose-400 hover:ring-rose-400 hover:text-white shadow-md shadow-rose-500/20",
            btnDisabled: "disabled:opacity-40 disabled:hover:bg-white/90 disabled:hover:text-orange-400 disabled:hover:ring-orange-100 disabled:shadow-none",
            emptyText: "text-orange-400 font-semibold"
        }
    }[theme as ThemeMode || 'dark']

    const handleMoveRight = () => {
        const toAdd = availableVars.filter(v => selectedSource.includes(v.id))
        if (maxLimit && selectedVars.length + toAdd.length > maxLimit) {
            return
        }
        if (toAdd.length) {
            onAdd(toAdd)
            setSelectedSource([])
        }
    }

    const handleMoveLeft = () => {
        const toRemove = selectedVars.filter(v => selectedTarget.includes(v.id))
        if (toRemove.length) {
            onRemove(toRemove)
            setSelectedTarget([])
        }
    }

    const toggleSource = (id: string) => {
        setSelectedSource(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    const toggleTarget = (id: string) => {
        setSelectedTarget(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    return (
        <div className="flex items-stretch gap-4 h-[340px]">
            {/* Source - Available Variables */}
            <div className="flex-1 flex flex-col h-full">
                <label className={cn("text-[11px] font-bold mb-3 uppercase tracking-widest", activeConfig.label)}>
                    Available Variables
                </label>
                <div className={cn("flex-1 rounded-[20px] overflow-auto p-2 custom-scrollbar transition-all duration-500 border", activeConfig.containerSource)}>
                    {availableVars.length === 0 && (
                        <div className={cn("h-full flex items-center justify-center text-sm italic", activeConfig.emptyText)}>
                            No variables
                        </div>
                    )}
                    {availableVars.map(v => (
                        <div
                            key={v.id}
                            onClick={() => toggleSource(v.id)}
                            className={cn(
                                "text-[13px] font-semibold px-4 py-3 rounded-xl cursor-pointer select-none transition-all duration-200 mb-1.5 flex items-center gap-3 border",
                                selectedSource.includes(v.id) ? activeConfig.itemSourceSelected : activeConfig.itemBase
                            )}
                        >
                            <span className={cn(
                                "w-2 h-2 rounded-full shadow-sm shrink-0",
                                v.measure === 'scale' ? "bg-cyan-500" :
                                    v.measure === 'nominal' ? "bg-purple-500" : "bg-amber-500" // Sesuai warna dot di gambar
                            )} />
                            <span className="truncate">{v.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls (Circular Buttons) */}
            <div className="flex flex-col gap-3 justify-center h-full pt-8 px-1">
                <button
                    onClick={handleMoveRight}
                    disabled={selectedSource.length === 0}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-xl",
                        activeConfig.btnMove,
                        activeConfig.btnMoveRightHover,
                        activeConfig.btnDisabled
                    )}
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button
                    onClick={handleMoveLeft}
                    disabled={selectedTarget.length === 0}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-xl",
                        activeConfig.btnMove,
                        activeConfig.btnMoveLeftHover,
                        activeConfig.btnDisabled
                    )}
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Target - Selected Variables */}
            <div className="flex-1 flex flex-col h-full">
                <label className={cn("text-[11px] font-bold mb-3 uppercase tracking-widest flex justify-between items-center", activeConfig.label)}>
                    <span>{label}</span>
                    {maxLimit && (
                        <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 backdrop-blur-sm text-[10px]">
                            {selectedVars.length}/{maxLimit}
                        </span>
                    )}
                </label>
                <div className={cn("flex-1 rounded-[20px] overflow-auto p-2 custom-scrollbar transition-all duration-500", activeConfig.containerTarget)}>
                    {selectedVars.length === 0 && (
                        <div className={cn("h-full flex items-center justify-center text-sm italic px-4 text-center", activeConfig.emptyText)}>
                            Select variable(s)
                        </div>
                    )}
                    {selectedVars.map(v => (
                        <div
                            key={v.id}
                            onClick={() => toggleTarget(v.id)}
                            className={cn(
                                "text-[13px] font-semibold px-4 py-3 rounded-xl cursor-pointer select-none transition-all duration-200 mb-1.5 flex items-center gap-3 border",
                                selectedTarget.includes(v.id) ? activeConfig.itemTargetSelected : activeConfig.itemBase
                            )}
                        >
                            <span className={cn(
                                "w-2 h-2 rounded-full shadow-sm shrink-0",
                                v.measure === 'scale' ? "bg-cyan-500" :
                                    v.measure === 'nominal' ? "bg-purple-500" : "bg-amber-500"
                            )} />
                            <span className="truncate">{v.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
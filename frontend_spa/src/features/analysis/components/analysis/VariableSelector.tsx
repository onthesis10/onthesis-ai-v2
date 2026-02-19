import React from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    label = "Selected Variables",
    maxLimit
}: VariableSelectorProps) => {

    const [selectedSource, setSelectedSource] = React.useState<string[]>([])
    const [selectedTarget, setSelectedTarget] = React.useState<string[]>([])

    const handleMoveRight = () => {
        const toAdd = availableVars.filter(v => selectedSource.includes(v.id))
        if (maxLimit && selectedVars.length + toAdd.length > maxLimit) {
            // Can add logic for toast warning here
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
        <div className="flex items-start gap-3 h-[300px]">
            {/* Source - Available Variables */}
            <div className="flex-1 flex flex-col h-full">
                <label className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase">Available Variables</label>
                <div className="flex-1 border border-border/50 rounded-lg bg-secondary/10 overflow-auto p-1 custom-scrollbar">
                    {availableVars.length === 0 && (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">
                            No variables
                        </div>
                    )}
                    {availableVars.map(v => (
                        <div
                            key={v.id}
                            onClick={() => toggleSource(v.id)}
                            className={cn(
                                "text-xs px-3 py-2 rounded-md cursor-pointer select-none transition-colors mb-0.5 flex items-center gap-2",
                                selectedSource.includes(v.id)
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "hover:bg-secondary/50 text-foreground"
                            )}
                        >
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                v.measure === 'scale' ? "bg-cyan-500" :
                                    v.measure === 'nominal' ? "bg-purple-500" : "bg-orange-500"
                            )} />
                            {v.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 justify-center h-full pt-6">
                <button
                    onClick={handleMoveRight}
                    disabled={selectedSource.length === 0}
                    className="p-1.5 rounded-md bg-secondary border border-border/50 hover:bg-primary hover:text-white hover:border-primary disabled:opacity-40 disabled:hover:bg-secondary disabled:hover:text-inherit transition-all"
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button
                    onClick={handleMoveLeft}
                    disabled={selectedTarget.length === 0}
                    className="p-1.5 rounded-md bg-secondary border border-border/50 hover:bg-destructive hover:text-white hover:border-destructive disabled:opacity-40 disabled:hover:bg-secondary disabled:hover:text-inherit transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Target - Selected Variables */}
            <div className="flex-1 flex flex-col h-full">
                <label className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase flex justify-between">
                    <span>{label}</span>
                    {maxLimit && <span className="opacity-70">{selectedVars.length}/{maxLimit}</span>}
                </label>
                <div className="flex-1 border border-border/50 rounded-lg bg-background overflow-auto p-1 custom-scrollbar shadow-inner">
                    {selectedVars.length === 0 && (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50 italic px-4 text-center">
                            Select variable(s)
                        </div>
                    )}
                    {selectedVars.map(v => (
                        <div
                            key={v.id}
                            onClick={() => toggleTarget(v.id)}
                            className={cn(
                                "text-xs px-3 py-2 rounded-md cursor-pointer select-none transition-colors mb-0.5 flex items-center gap-2",
                                selectedTarget.includes(v.id)
                                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                                    : "hover:bg-secondary/50 text-foreground"
                            )}
                        >
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                v.measure === 'scale' ? "bg-cyan-500" :
                                    v.measure === 'nominal' ? "bg-purple-500" : "bg-orange-500"
                            )} />
                            {v.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

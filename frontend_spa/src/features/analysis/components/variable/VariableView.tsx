import { useMemo, useState } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import React from 'react'
const AgDataGrid = React.lazy(() => import('../common/AgDataGrid').then(module => ({ default: module.AgDataGrid })))
import { type ColDef } from 'ag-grid-community'
import { Settings2, ArrowRight, TableProperties } from 'lucide-react'
import { ValueLabelsModal } from './ValueLabelsModal'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

export const VariableView = () => {
    const variables = useAnalysisStore(s => s.variables);
    const updateVariable = useAnalysisStore(s => s.updateVariable);
    const setViewMode = useAnalysisStore(s => s.setViewMode);
    const recodeVariable = useAnalysisStore(s => s.recodeVariable);
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeVarId, setActiveVarId] = useState<string | null>(null)
    const { theme } = useThemeStore()

    const activeVariable = variables.find(v => v.id === activeVarId)

    // --- Theme Config (Matches AppSidebar & OutputView) ---
    const themeStyles = {
        light: {
            toolbar: "bg-white/80 border border-white/20 shadow-xl backdrop-blur-3xl ring-1 ring-black/5",
            gridContainer: "bg-white/80 border border-transparent shadow-sm backdrop-blur-xl ring-1 ring-black/5",
            textMain: "text-slate-500",
            textMuted: "text-slate-400",
            infoPill: "bg-black/5 text-slate-500",
            accentButton: "bg-[#007AFF] text-white hover:opacity-90 shadow-md shadow-blue-500/20 border-transparent",
            emptyState: "bg-white/80 border border-transparent hover:shadow-md ring-1 ring-black/5 backdrop-blur-xl",
            iconBg: "bg-[#007AFF]/10 text-[#007AFF]",
            iconColor: "text-[#007AFF]"
        },
        dark: {
            toolbar: "bg-[#1E293B]/80 border border-white/10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5",
            gridContainer: "bg-[#1E293B]/50 border border-white/5 shadow-sm backdrop-blur-xl",
            textMain: "text-slate-400",
            textMuted: "text-slate-500",
            infoPill: "bg-white/5 text-slate-400",
            accentButton: "bg-[#0EA5E9] text-white hover:opacity-90 shadow-[0_0_20px_-5px_rgba(14,165,233,0.5)] border-transparent",
            emptyState: "bg-[#1E293B]/50 border border-white/5 hover:shadow-md backdrop-blur-xl",
            iconBg: "bg-[#0EA5E9]/10 text-[#0EA5E9]",
            iconColor: "text-[#0EA5E9]"
        },
        happy: {
            toolbar: "bg-white/80 border border-white/60 shadow-xl shadow-orange-500/10 backdrop-blur-3xl ring-1 ring-orange-100",
            gridContainer: "bg-white/60 border border-transparent shadow-sm backdrop-blur-xl ring-1 ring-orange-100",
            textMain: "text-stone-500",
            textMuted: "text-stone-400",
            infoPill: "bg-orange-50/50 text-stone-500",
            accentButton: "bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-lg shadow-orange-500/25 hover:opacity-90 border-transparent",
            emptyState: "bg-white/60 border border-transparent hover:shadow-md ring-1 ring-orange-100 backdrop-blur-xl hover:bg-white/80",
            iconBg: "bg-orange-50 text-orange-500",
            iconColor: "text-orange-500"
        }
    }[theme || 'dark']

    const activeConfig = themeStyles

    const handleOpenModal = (varId: string) => {
        setActiveVarId(varId)
        setIsModalOpen(true)
    }

    const handleSaveLabels = (labels: Record<string, string>, recodeMap?: Record<string, number>) => {
        if (!activeVariable) return

        if (recodeMap && Object.keys(recodeMap).length > 0) {
            // Trigger Recode API
            recodeVariable(activeVariable.name, recodeMap)
        } else {
            // Just update metadata (Future support)
            updateVariable(activeVariable.id, 'values', JSON.stringify(labels))
        }
    }

    const onCellValueChanged = (event: any) => {
        if (event.data && event.colDef.field) {
            updateVariable(event.data.id, event.colDef.field, event.newValue)
        }
    }

    const columnDefs: ColDef[] = useMemo(() => [
        {
            field: 'name',
            headerName: 'Name',
            width: 120,
            pinned: 'left',
            editable: true,
            cellClass: 'font-mono font-bold text-primary',
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 100,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['Numeric', 'String', 'Date']
            }
        },
        {
            field: 'width',
            headerName: 'Width',
            width: 80,
            editable: true,
            type: 'numericColumn',
            valueParser: (params) => Number(params.newValue),
        },
        {
            field: 'decimals',
            headerName: 'Decimals',
            width: 90,
            editable: true,
            type: 'numericColumn',
            valueParser: (params) => Number(params.newValue),
        },
        {
            field: 'label',
            headerName: 'Label',
            width: 200,
            editable: true,
        },
        {
            field: 'values',
            headerName: 'Values',
            width: 140,
            editable: false,
            cellRenderer: (params: any) => {
                const val = params.value;
                const hasValues = val && val !== 'None' && val !== '{}';
                return (
                    <button
                        className="h-6 px-2 text-xs w-full flex items-center justify-start text-muted-foreground hover:text-primary transition-colors hover:bg-secondary/50 rounded-md"
                        onClick={() => handleOpenModal(params.data.id)}
                    >
                        {hasValues ? 'Has Labels' : 'None'}
                        <Settings2 className="w-3 h-3 ml-auto opacity-50" />
                    </button>
                )
            }
        },
        {
            field: 'missing',
            headerName: 'Missing',
            width: 100,
            editable: true,
        },
        {
            field: 'columns',
            headerName: 'Columns',
            width: 90,
            editable: true,
            type: 'numericColumn',
        },
        {
            field: 'align',
            headerName: 'Align',
            width: 100,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['Left', 'Right', 'Center']
            }
        },
        {
            field: 'measure',
            headerName: 'Measure',
            width: 130,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['scale', 'ordinal', 'nominal']
            },
            cellRenderer: (params: any) => {
                const icons: Record<string, string> = {
                    scale: '📏 Scale',
                    ordinal: '📊 Ordinal',
                    nominal: '🏷️ Nominal'
                }
                return icons[params.value?.toLowerCase()] || params.value
            }
        },
        {
            field: 'role',
            headerName: 'Role',
            width: 100,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['input', 'target', 'none']
            }
        }
    ], [variables])

    if (variables.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
                <div className={cn(
                    "w-full max-w-md p-8 flex flex-col items-center justify-center rounded-[32px] text-center space-y-6 transition-all duration-500",
                    activeConfig.emptyState
                )}>
                    <div className={cn("p-4 rounded-full", activeConfig.iconBg)}>
                        <Settings2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className={cn("text-xl font-bold", theme === 'happy' ? "text-stone-900" : (theme === 'dark' ? "text-white" : "text-slate-900"))}>No variables defined</h3>
                        <p className={cn("font-medium", activeConfig.textMuted)}>Import a dataset in Data View to automatically generate variables.</p>
                    </div>

                    <button
                        onClick={() => setViewMode('data')}
                        className={cn("flex items-center gap-2 text-sm px-6 py-2.5 rounded-full transition-all font-medium", activeConfig.accentButton)}
                    >
                        Go to Data View <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-500">
            {/* Toolbar */}
            <div className={cn(
                "p-2 rounded-2xl flex items-center justify-between shrink-0 relative z-50 transition-all duration-500 mx-6 mt-4",
                activeConfig.toolbar
            )}>
                <div className="flex items-center gap-3 px-2">

                    <div className={cn("p-1.5 rounded-xl border shadow-sm", activeConfig.iconBg, theme === 'dark' ? 'border-transparent' : 'border-transparent')}>
                        <TableProperties className="w-4 h-4" />
                    </div>

                    <h2 className={cn("text-sm font-bold flex items-center gap-2 tracking-tight hidden sm:flex", theme === 'happy' ? "text-stone-900" : (theme === 'dark' ? "text-white" : "text-slate-900"))}>
                        Variable Properties
                    </h2>
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        activeConfig.infoPill
                    )}>
                        {variables.length} VARS
                    </span>
                </div>
            </div>

            {/* Grid */}
            <div className={cn(
                "flex-1 rounded-[24px] overflow-hidden relative z-0 transition-all duration-500 mx-6 mb-4",
                activeConfig.gridContainer
            )}>
                <React.Suspense fallback={
                    <div className="h-full flex items-center justify-center p-8 bg-white/50 dark:bg-[#1E293B]/30 backdrop-blur-sm rounded-[24px]">
                        <span className="text-sm font-medium text-slate-500">Loading Grid...</span>
                    </div>
                }>
                    <AgDataGrid
                        rowData={variables}
                        columnDefs={columnDefs}
                        onGridReady={(params) => {
                            params.api.addEventListener('cellValueChanged', onCellValueChanged)
                        }}
                    />
                </React.Suspense>
            </div>

            {/* Modal */}
            {activeVariable && (
                <ValueLabelsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    variableName={activeVariable.name}
                    currentLabels={
                        // Parse safely
                        typeof activeVariable.values === 'string' && activeVariable.values !== 'None'
                            ? (() => { try { return JSON.parse(activeVariable.values) } catch { return {} } })()
                            : (typeof activeVariable.values === 'object' ? activeVariable.values : {})
                    }
                    onSave={handleSaveLabels}
                />
            )}
        </div>
    )
}
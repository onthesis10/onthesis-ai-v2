import { useMemo, useState } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { AgDataGrid } from '../common/AgDataGrid'
import { type ColDef } from 'ag-grid-community'
import { Settings2, ArrowRight } from 'lucide-react'
import { ValueLabelsModal } from './ValueLabelsModal'

export const VariableView = () => {
    const { variables, updateVariable, setViewMode, recodeVariable } = useAnalysisStore()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeVarId, setActiveVarId] = useState<string | null>(null)

    const activeVariable = variables.find(v => v.id === activeVarId)

    const handleOpenModal = (varId: string) => {
        setActiveVarId(varId)
        setIsModalOpen(true)
    }

    const handleSaveLabels = (labels: Record<string, string>, recodeMap?: Record<string, number>) => {
        if (!activeVariable) return

        // Save Labels Metadata
        // Store as Dictionary string or JSON? Current interface says string.
        // Let's store as JSON string for now to match interface, or update interface.
        // Assuming string for now.
        // Ideally we should update metadata 'values' field

        // Wait, standard 'values' in SPSS is just metadata. Recode is changing data.

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
            <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="glass-card w-full max-w-md p-8 flex flex-col items-center justify-center border-dashed rounded-3xl text-center space-y-6">
                    <div className="p-4 bg-secondary/50 rounded-full">
                        <Settings2 className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">No variables defined</h3>
                        <p className="text-muted-foreground">Import a dataset in Data View to automatically generate variables.</p>
                    </div>

                    <button
                        onClick={() => setViewMode('data')}
                        className="flex items-center gap-2 text-sm px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-medium"
                    >
                        Go to Data View <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-500">
            {/* Toolbar */}
            <div className="glass-panel p-3 rounded-2xl flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4 px-2">
                    {/* Window Controls Aesthetic */}
                    <div className="flex gap-1.5 mr-2 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                        <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                    </div>

                    <div className="h-6 w-px bg-border/50 mx-2" />

                    <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight text-foreground/80">
                        <div className="p-1.5 bg-orange-500/10 rounded-lg">
                            <Settings2 className="w-5 h-5 text-orange-600" />
                        </div>
                        Variable View
                    </h2>
                    <span className="text-xs font-bold text-muted-foreground px-2 py-0.5 bg-secondary/50 rounded-md border border-border/50 uppercase tracking-wider">
                        {variables.length} VARS
                    </span>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 glass-card rounded-[20px] overflow-hidden border border-border/50 shadow-xl relative z-0">
                <AgDataGrid
                    rowData={variables}
                    columnDefs={columnDefs}
                    onGridReady={(params) => {
                        params.api.addEventListener('cellValueChanged', onCellValueChanged)
                    }}
                />
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


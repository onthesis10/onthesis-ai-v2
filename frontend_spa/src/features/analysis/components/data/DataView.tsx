
import React, { useCallback, useMemo } from 'react'
import { useAnalysisStore, type Variable } from '../../store/useAnalysisStore'
const AgDataGrid = React.lazy(() => import('../common/AgDataGrid').then(module => ({ default: module.AgDataGrid })))
import { type ColDef } from 'ag-grid-community'
import { Upload, FileSpreadsheet, Download, TableProperties, Plus, Trash2, FolderOpen, Save } from 'lucide-react'
import { customToast } from '../../lib/customToast'
import * as XLSX from 'xlsx'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

export const DataView = () => {
    const data = useAnalysisStore(s => s.data);
    const setData = useAnalysisStore(s => s.setData);
    const setVariables = useAnalysisStore(s => s.setVariables);
    const setViewMode = useAnalysisStore(s => s.setViewMode);
    const variables = useAnalysisStore(s => s.variables);
    const { theme } = useThemeStore()

    // --- Theme Config (Matches AppSidebar & AnalysisToolbar) ---
    const themeStyles = {
        light: {
            toolbar: "bg-[#F5F5F7]/80 border-black/5",
            gridContainer: "bg-white/50 border-black/5",
            textMain: "text-slate-600",
            textMuted: "text-slate-400",
            button: "text-slate-500 hover:bg-black/5 hover:text-slate-900 border-transparent",
            infoPill: "bg-white/50 border-black/5 text-slate-500",
            accentButton: "bg-[#007AFF] text-white hover:bg-[#007AFF]/90 shadow-blue-500/20",
            emptyState: "bg-white/50 border-dashed border-slate-200 hover:border-blue-400/50",
            iconColor: "text-slate-400"
        },
        dark: {
            toolbar: "bg-[#0B1120]/80 border-white/5",
            gridContainer: "bg-[#1E293B]/30 border-white/5",
            textMain: "text-slate-300",
            textMuted: "text-slate-500",
            button: "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-transparent",
            infoPill: "bg-white/5 border-white/5 text-slate-400",
            accentButton: "bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90 shadow-cyan-500/20",
            emptyState: "bg-white/5 border-dashed border-white/10 hover:border-cyan-400/50",
            iconColor: "text-slate-500"
        },
        happy: {
            toolbar: "bg-[#FFFCF5]/80 border-orange-100/50",
            gridContainer: "bg-white/40 border-orange-100/50",
            textMain: "text-stone-600",
            textMuted: "text-stone-400",
            button: "text-stone-500 hover:bg-orange-50/80 hover:text-orange-600 border-transparent",
            infoPill: "bg-white/60 border-orange-100/50 text-stone-500",
            accentButton: "bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-orange-500/25 hover:shadow-orange-500/40",
            emptyState: "bg-[#FFFCF5]/60 border-dashed border-orange-200/50 hover:border-orange-400/50",
            iconColor: "text-orange-300"
        }
    }[theme || 'light']

    const activeConfig = themeStyles

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (evt) => {
            const bstr = evt.target?.result

            // UX: Show Global Loader
            useAnalysisStore.getState().setIsAnalyzing(true)

            // Artificial delay for "processing feel"
            await new Promise(r => setTimeout(r, 1500))

            useAnalysisStore.getState().setFileName(file.name)

            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const jsonData = XLSX.utils.sheet_to_json(ws) as any[]

            if (jsonData.length > 0) {
                const originalKeys = Object.keys(jsonData[0])

                // 1. Generate Variables & Mapping
                const variablesMap = new Map<string, string>() // originalKey -> sanitizedKey

                const newVariables: Variable[] = originalKeys.map((key) => {
                    const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_')
                    variablesMap.set(key, sanitizedKey)

                    const value = jsonData[0][key]
                    const isNumber = typeof value === 'number'

                    return {
                        id: sanitizedKey,
                        name: sanitizedKey,
                        label: key, // Keep original as label
                        type: isNumber ? 'numeric' : 'string',
                        width: isNumber ? 100 : 180,
                        decimals: isNumber ? 2 : 0,
                        values: 'None',
                        missing: 'None',
                        columns: 8,
                        align: isNumber ? 'right' : 'left',
                        measure: isNumber ? 'scale' : 'nominal',
                        role: 'input',
                    }
                })

                // 2. Transform Data to match new keys
                const transformedData = jsonData.map(row => {
                    const newRow: any = {}
                    originalKeys.forEach(key => {
                        const newKey = variablesMap.get(key)!
                        newRow[newKey] = row[key]
                    })
                    return newRow
                })

                setVariables(newVariables)
                setData(transformedData)
            }

            // Turn off loader
            useAnalysisStore.getState().setIsAnalyzing(false)
        }
        reader.readAsBinaryString(file)
    }, [setData, setVariables])

    // Dynamic Columns based on Variable Definitions
    const columnDefs: ColDef[] = useMemo(() => {
        if (variables.length === 0) return []
        return variables.map((variable) => ({
            field: variable.name,
            headerName: variable.label || variable.name,
            filter: true,
            sortable: true,
            editable: true,
            width: 120,
            cellStyle: { textAlign: variable.align },
            type: variable.type === 'numeric' ? 'numericColumn' : undefined,
            valueFormatter: (params) => {
                if (variable.type === 'numeric' && typeof params.value === 'number') {
                    return params.value.toFixed(variable.decimals)
                }
                return params.value
            }
        }))
    }, [variables])


    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
                <div className={cn(
                    "w-full max-w-2xl h-[400px] flex flex-col items-center justify-center rounded-[32px] group cursor-pointer relative transition-all duration-500 backdrop-blur-md",
                    activeConfig.emptyState
                )}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center space-y-6">
                            <div className="relative">
                                <div className={cn("absolute inset-0 blur-3xl rounded-full opacity-20 scale-150", theme === 'happy' ? "bg-orange-400" : "bg-blue-500")} />
                                <div className={cn(
                                    "p-8 rounded-3xl inline-block group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl relative z-10",
                                    theme === 'happy' ? "bg-gradient-to-br from-orange-400 to-rose-400 shadow-orange-500/30" : "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/30"
                                )}>
                                    <Upload className="w-16 h-16 text-white" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className={cn("text-3xl font-bold tracking-tight", activeConfig.textMain)}>
                                    Drop your dataset here
                                </h3>
                                <p className={cn("text-lg font-medium", activeConfig.textMuted)}>
                                    Support .xlsx, .csv files
                                </p>
                            </div>
                            <div className="pt-4">
                                <span className={cn(
                                    "px-6 py-3 rounded-full text-sm font-semibold shadow-sm transition-transform group-hover:scale-105 inline-block",
                                    activeConfig.infoPill
                                )}>
                                    Browse Files
                                </span>
                            </div>
                        </div>
                    </div>
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-500">
            {/* Compact Toolbar */}
            <div className={cn(
                "p-1.5 rounded-full flex items-center justify-between shrink-0 backdrop-blur-xl shadow-sm relative z-50 transition-colors duration-500",
                activeConfig.toolbar
            )}>
                <div className="flex items-center px-2 gap-3">

                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-full", theme === 'happy' ? "bg-orange-100/50" : "bg-black/5 dark:bg-white/5")}>
                            <FileSpreadsheet className={cn("w-4 h-4", theme === 'happy' ? "text-orange-500" : "text-blue-500")} />
                        </div>
                        <span className={cn("text-sm font-bold hidden sm:block", activeConfig.textMain)}>Data</span>
                        <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            activeConfig.infoPill
                        )}>
                            {data.length}R &times; {variables.length}V
                        </span>
                    </div>
                </div>

                <div className="flex gap-1" id='data-view-toolbar'>
                    {/* Cloud Storage Group */}
                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-border/10">
                        <button
                            onClick={async () => {
                                const name = prompt("Nama Project:", useAnalysisStore.getState().fileName || "Untitled Project")
                                if (name) {
                                    const toastId = customToast.loading("Menyimpan project ke cloud...");
                                    try {
                                        await useAnalysisStore.getState().saveProject(name)
                                        customToast.dismiss(toastId);
                                        customToast.success("Project berhasil disimpan!");
                                    } catch (e) {
                                        customToast.dismiss(toastId);
                                        customToast.error("Gagal menyimpan project. Pastikan anda login.");
                                    }
                                }
                            }}
                            className={cn("p-2 rounded-full transition-all active:scale-95", activeConfig.button)}
                            title="Simpan Cloud"
                        >
                            <Save className="w-4 h-4" />
                        </button>

                        <div className="relative group">
                            <button
                                onClick={() => useAnalysisStore.getState().fetchProjects()}
                                className={cn("p-2 rounded-full transition-all active:scale-95", activeConfig.button)}
                                title="Buka Project"
                            >
                                <FolderOpen className="w-4 h-4" />
                            </button>

                            {/* Dropdown */}
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden hidden group-hover:block z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {(useAnalysisStore.getState().savedProjects || []).length === 0 ? (
                                        <p className="text-xs text-slate-500 p-3 text-center">Belum ada project tersimpan.</p>
                                    ) : (
                                        (useAnalysisStore.getState().savedProjects || []).map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl group/item transition-colors">
                                                <button
                                                    onClick={() => {
                                                        const tId = customToast.loading("Memuat project...");
                                                        useAnalysisStore.getState().loadProject(p.id).then(() => {
                                                            customToast.dismiss(tId);
                                                            customToast.success(`Project ${p.name} dimuat`);
                                                        }).catch(() => {
                                                            customToast.dismiss(tId);
                                                            customToast.error("Gagal memuat project");
                                                        });
                                                    }}
                                                    className="flex-1 text-left overflow-hidden"
                                                >
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                                                    <p className="text-[10px] text-slate-500">{new Date(p.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (confirm('Hapus project ini?')) {
                                                            useAnalysisStore.getState().deleteProject(p.id)
                                                            customToast.success("Project dihapus");
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Actions Group */}
                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-border/10">
                        <button
                            onClick={() => {
                                const newRow: Record<string, any> = {}
                                variables.forEach(v => newRow[v.name] = '')
                                setData([...data, newRow])
                                customToast.success("Baris baru ditambahkan");
                            }}
                            className={cn("p-2 rounded-full transition-all active:scale-95", activeConfig.button)}
                            title="Add Case (Row)"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                useAnalysisStore.getState().addVariable()
                                customToast.success("Variabel baru ditambahkan");
                            }}
                            className={cn("flex items-center gap-1 p-2 rounded-full transition-all active:scale-95", activeConfig.button)}
                            title="Add Variable (Column)"
                        >
                            <Plus className="w-3 h-3" />
                            <span className="text-xs font-bold">VAR</span>
                        </button>
                    </div>

                    {/* View Actions Group */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                import('xlsx').then(XLSX => {
                                    const ws = XLSX.utils.json_to_sheet(data);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "Data");
                                    XLSX.writeFile(wb, (useAnalysisStore.getState().fileName || "analysis_data") + ".xlsx");
                                    customToast.success("Data berhasil diexport!");
                                }).catch(err => {
                                    console.error(err);
                                    customToast.error("Gagal export data.");
                                });
                            }}
                            className={cn("p-2 rounded-full transition-all active:scale-95", activeConfig.button)}
                            title="Export Data (.xlsx)"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Hapus semua data?')) {
                                    setData([]);
                                    customToast.success("Data dibersihkan");
                                }
                            }}
                            className={cn("p-2 rounded-full transition-all active:scale-95 hover:text-red-500 hover:bg-red-500/10", activeConfig.button)}
                            title="Clear Data"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setViewMode('variable')}
                        className={cn("flex items-center gap-2 text-xs px-4 py-2 rounded-full shadow-lg font-bold transition-all active:scale-95 ml-2", activeConfig.accentButton)}
                    >
                        <TableProperties className="w-3.5 h-3.5" />
                        Variables
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div id="ag-grid-container" className={cn(
                "flex-1 rounded-[24px] overflow-hidden shadow-xl backdrop-blur-sm relative z-0 transition-colors duration-500",
                activeConfig.gridContainer
            )}>
                <React.Suspense fallback={
                    <div className="h-full flex items-center justify-center p-8 bg-white/50 dark:bg-[#1E293B]/30 backdrop-blur-sm rounded-[24px]">
                        <div className="flex flex-col items-center gap-4">
                            <Plus className="w-8 h-8 text-blue-500 animate-spin" />
                            <span className="text-sm font-medium text-slate-500">Loading Grid...</span>
                        </div>
                    </div>
                }>
                    <AgDataGrid
                        rowData={data}
                        columnDefs={columnDefs}
                        onGridReady={(params) => {
                            // 1. Persist Edit Changes
                            params.api.addEventListener('cellValueChanged', (event: any) => {
                                if (event.data) {
                                    const newData = [...data]
                                    const rowIndex = event.node.rowIndex
                                    newData[rowIndex] = event.data
                                    setData(newData)
                                }
                            })

                            // 2. Custom Paste Handler (Excel-like)
                            const gridDiv = document.querySelector('#ag-grid-container')
                            if (gridDiv) {
                                gridDiv.addEventListener('paste', async (e: any) => {
                                    const clipboardData = e.clipboardData || (window as any).clipboardData
                                    const pastedData = clipboardData.getData('Text')

                                    if (!pastedData) return

                                    const focusedCell = params.api.getFocusedCell()
                                    if (!focusedCell) return

                                    // Parse Clipboard (Tab separated for Excel, or comma)
                                    const rows = pastedData.split(/\r\n|\n|\r/).filter((r: string) => r.trim() !== '')
                                    const newData = [...useAnalysisStore.getState().data]
                                    let startRowIndex = focusedCell.rowIndex
                                    const startColId = focusedCell.column.getId()

                                    // Find column index
                                    const allColumns = params.api.getColumns()
                                    const startColIndex = allColumns?.findIndex((c: any) => c.getColId() === startColId) ?? 0

                                    rows.forEach((rowStr: string, i: number) => {
                                        const rowIndex = startRowIndex + i
                                        if (rowIndex >= newData.length) return // Don't add new rows for now, strictly update

                                        const cells = rowStr.split('\t') // Excel usually uses tabs

                                        cells.forEach((cellValue: string, j: number) => {
                                            const colIndex = startColIndex + j
                                            if (allColumns && colIndex < allColumns.length) {
                                                const colDef = allColumns[colIndex].getColDef()
                                                const field = colDef.field
                                                if (field) {
                                                    newData[rowIndex] = { ...newData[rowIndex], [field]: cellValue.trim() }
                                                }
                                            }
                                        })
                                    })

                                    setData(newData)
                                    params.api.refreshCells()
                                })
                            }
                        }}
                    />
                </React.Suspense>
            </div>
        </div>
    )
}

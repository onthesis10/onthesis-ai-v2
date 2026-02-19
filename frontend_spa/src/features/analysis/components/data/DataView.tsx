
import React, { useCallback, useMemo } from 'react'
import { useAnalysisStore, type Variable } from '../../store/useAnalysisStore'
import { AgDataGrid } from '../common/AgDataGrid'
import { type ColDef } from 'ag-grid-community'
import { Upload, FileSpreadsheet, Download, TableProperties, Plus, Trash2 } from 'lucide-react'
import { customToast } from '../../lib/customToast'
import * as XLSX from 'xlsx'

export const DataView = () => {
    const { data, setData, setVariables, setViewMode, variables } = useAnalysisStore()

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
        // ... (Keep existing empty state logic)
        return (
            <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="glass-card w-full max-w-2xl h-[400px] flex flex-col items-center justify-center border-dashed rounded-3xl group cursor-pointer relative hover:border-primary/50 transition-all duration-500">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                                <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-3xl inline-block group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl shadow-primary/30 relative z-10">
                                    <Upload className="w-16 h-16 text-white" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                    Drop your dataset here
                                </h3>
                                <p className="text-muted-foreground text-lg font-medium">
                                    Support .xlsx, .csv files
                                </p>
                            </div>
                            <div className="pt-4">
                                <span className="px-5 py-2.5 rounded-full bg-secondary/80 text-secondary-foreground text-sm font-semibold shadow-sm border border-white/20 dark:border-white/10">
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
        <div className="h-full flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-500">
            {/* Compact Toolbar */}
            <div className="glass-panel p-2 rounded-xl flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md border border-border/40 dark:border-white/10 shadow-sm relative z-50">
                <div className="flex items-center gap-2 px-1">
                    {/* Window Controls Aesthetic - Minimal */}
                    <div className="flex gap-1.5 mr-2 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                    </div>

                    <div className="h-4 w-px bg-border/50 mx-1" />

                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-green-500/10 rounded-lg">
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm font-bold text-foreground hidden sm:block">Data</span>
                        <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 bg-secondary/50 rounded-md border border-border/50 uppercase tracking-wider">
                            {data.length}R &times; {variables.length}V
                        </span>
                    </div>
                </div>

                <div className="flex gap-1" id='data-view-toolbar'>
                    {/* Cloud Storage Group */}
                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-border/40">
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
                                        // Error handled in store (which uses alert currently, we should refactor store later or catch here)
                                        // Since store throws, we catch here. But store also alerts. 
                                        // ideally we remove alert from store, but for now this works.
                                        customToast.error("Gagal menyimpan project. Pastikan anda login.");
                                    }
                                }
                            }}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all border border-transparent hover:border-indigo-500/20 active:scale-95"
                            title="Simpan Cloud"
                        >
                            <Download className="w-4 h-4 rotate-180" />
                        </button>

                        <div className="relative group">
                            <button
                                onClick={() => useAnalysisStore.getState().fetchProjects()}
                                className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all border border-transparent hover:border-emerald-500/20 active:scale-95"
                                title="Buka Project"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                            </button>

                            {/* Dropdown - Fixed Z-Index & Layout */}
                            <div className="absolute top-full right-0 mt-2 w-64 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden hidden group-hover:block z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {(useAnalysisStore.getState().savedProjects || []).length === 0 ? (
                                        <p className="text-xs text-slate-500 p-3 text-center">Belum ada project tersimpan.</p>
                                    ) : (
                                        (useAnalysisStore.getState().savedProjects || []).map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group/item transition-colors">
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
                                                    <p className="text-xs font-medium text-slate-200 truncate">{p.name}</p>
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
                                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md opacity-0 group-hover/item:opacity-100 transition-all"
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
                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-border/40">
                        <button
                            onClick={() => {
                                const newRow: Record<string, any> = {}
                                variables.forEach(v => newRow[v.name] = '')
                                setData([...data, newRow])
                                customToast.success("Baris baru ditambahkan");
                            }}
                            className="p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all active:scale-95"
                            title="Add Case (Row)"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                useAnalysisStore.getState().addVariable()
                                customToast.success("Variabel baru ditambahkan");
                            }}
                            className="flex items-center gap-1 p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all active:scale-95"
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
                            className="p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all active:scale-95"
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
                            className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all active:scale-95"
                            title="Clear Data"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setViewMode('variable')}
                        className="flex items-center gap-2 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-medium active:scale-95"
                    >
                        <TableProperties className="w-4 h-4" />
                        Variables
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div id="ag-grid-container" className="flex-1 glass-card rounded-[20px] overflow-hidden border border-border/40 dark:border-white/10 shadow-xl bg-card/30 backdrop-blur-sm relative z-0">
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
            </div>
        </div>
    )
}

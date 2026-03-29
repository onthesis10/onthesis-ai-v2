import { Plus, Trash, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { Select } from '../ui/Select'
import { inferTypeByName } from '../../lib/smartGenerator'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

interface Step2Props {
    data: any
    updateData: (key: string, value: any) => void
}

export const Step2Structure = ({ data, updateData }: Step2Props) => {
    const { theme } = useThemeStore()

    const themeStyles = {
        light: {
            title: "from-cyan-600 to-blue-600",
            textMuted: "text-slate-500",
            textMain: "text-slate-800",
            cardBase: "bg-white border-slate-200 shadow-sm",
            cardHover: "hover:border-blue-300 hover:shadow-md",
            inputBase: "bg-slate-50 border-slate-200 focus:ring-blue-500/50",
            inputBorderB: "border-slate-300 focus:border-blue-500",
            btnAdd: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
            btnAddRel: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100",
            pillLabel: "bg-slate-100 text-slate-600",
            gradientLine: "from-cyan-500 to-blue-500",
            relBox: "bg-slate-50 border-slate-200",
            itemBox: "bg-white border-slate-200 shadow-sm",
            trashBtn: "text-slate-400 hover:text-red-500 hover:bg-red-50",
            emptyArea: "border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-blue-300",
            rangeAccent: "accent-purple-600"
        },
        dark: {
            title: "from-cyan-400 to-blue-400",
            textMuted: "text-slate-400",
            textMain: "text-slate-200",
            cardBase: "bg-[#1E293B]/50 border-white/10 shadow-sm",
            cardHover: "hover:border-cyan-500/30 hover:shadow-md",
            inputBase: "bg-[#0F172A] border-white/10 focus:ring-cyan-500/50",
            inputBorderB: "border-white/20 focus:border-cyan-500",
            btnAdd: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
            btnAddRel: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
            pillLabel: "bg-cyan-500/10 text-cyan-400",
            gradientLine: "from-cyan-500 to-blue-500",
            relBox: "bg-[#1E293B]/30 border-white/10",
            itemBox: "bg-[#0F172A] border-white/10",
            trashBtn: "text-slate-500 hover:text-red-400 hover:bg-red-500/10",
            emptyArea: "border-white/10 text-slate-500 hover:bg-white/5 hover:border-cyan-500/30",
            rangeAccent: "accent-purple-500"
        },
        happy: {
            title: "from-orange-500 to-rose-500",
            textMuted: "text-orange-600/70",
            textMain: "text-stone-800",
            cardBase: "bg-white/60 border-orange-200 shadow-sm shadow-orange-500/5",
            cardHover: "hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/10",
            inputBase: "bg-white border-orange-200 focus:ring-orange-500/50",
            inputBorderB: "border-orange-300 focus:border-orange-500",
            btnAdd: "bg-orange-100 text-orange-600 border-orange-300 hover:bg-orange-200",
            btnAddRel: "bg-rose-100 text-rose-600 border-rose-300 hover:bg-rose-200",
            pillLabel: "bg-orange-100 text-orange-600",
            gradientLine: "from-orange-400 to-rose-400",
            relBox: "bg-orange-50/50 border-orange-200",
            itemBox: "bg-white border-orange-200 shadow-sm",
            trashBtn: "text-orange-400 hover:text-red-500 hover:bg-red-50",
            emptyArea: "border-orange-300 text-orange-500 hover:bg-orange-50 hover:border-orange-400",
            rangeAccent: "accent-rose-500"
        }
    }[theme || 'dark']

    const activeConfig = themeStyles

    const addVariable = () => {
        const newVar = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Variabel ${((data.variables || []).length + 1)}`,
            type: 'numeric', // Default
            params: { mean: 75, std: 10, min: 0, max: 100 }
        }
        updateData('variables', [...(data.variables || []), newVar])
    }

    const removeVariable = (idx: number) => {
        const vars = [...(data.variables || [])]
        const varId = vars[idx].id
        vars.splice(idx, 1)
        updateData('variables', vars)

        // Also remove relationships involving this var
        const rels = (data.relationships || []).filter((r: any) => r.var1_id !== varId && r.var2_id !== varId)
        updateData('relationships', rels)
    }

    const updateVariable = (idx: number, field: string, value: any) => {
        const vars = [...(data.variables || [])]

        if (field.startsWith('params.')) {
            const paramKey = field.split('.')[1]
            vars[idx] = {
                ...vars[idx],
                params: { ...vars[idx].params, [paramKey]: value }
            }
        } else {
            vars[idx] = { ...vars[idx], [field]: value }

            // Smart Inference: If name changes, try to infer type
            if (field === 'name') {
                const inferredType = inferTypeByName(value);
                // Only switch if we found a match and it's different
                if (inferredType && inferredType !== vars[idx].type) {
                    vars[idx].type = inferredType;
                    // Auto-reset params for new type
                    applyDefaultParams(vars[idx], inferredType);
                }
            }

            // Explicit Type Change
            if (field === 'type') {
                applyDefaultParams(vars[idx], value);
            }
        }
        updateData('variables', vars)
    }

    const applyDefaultParams = (variable: any, type: string) => {
        if (type === 'likert') {
            variable.params = { scale: 5, items: 1 }
        } else if (type === 'numeric') {
            variable.params = { mean: 70, std: 10, min: 0, max: 100 }
        } else if (type === 'nominal') {
            variable.params = { options: ['Laki-laki', 'Perempuan'] }
        }
    }

    // Relationship Management
    const addRelationship = () => {
        const vars = data.variables || []
        if (vars.length < 2) return

        const newRel = {
            var1_id: vars[0].id,
            var2_id: vars[1].id,
            correlation: 0.5
        }
        updateData('relationships', [...(data.relationships || []), newRel])
    }

    const updateRelationship = (idx: number, field: string, value: any) => {
        const rels = [...(data.relationships || [])]
        rels[idx] = { ...rels[idx], [field]: value }
        updateData('relationships', rels)
    }

    const removeRelationship = (idx: number) => {
        const rels = [...(data.relationships || [])]
        rels.splice(idx, 1)
        updateData('relationships', rels)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            <div className="space-y-2">
                <h3 className={cn("text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r", activeConfig.title)}>
                    Definisi Variabel & Data
                </h3>
                <p className={cn("text-sm", activeConfig.textMuted)}>
                    Tentukan jumlah responden, variabel penelitian, dan jenis datanya.
                </p>
            </div>

            {/* Sample Size */}
            <div className={cn("p-5 rounded-xl border flex items-center justify-between backdrop-blur-sm transition-all duration-300", activeConfig.cardBase)}>
                <div>
                    <label className={cn("block text-sm font-bold", activeConfig.textMain)}>Jumlah Responden (N)</label>
                    <p className={cn("text-xs mt-1", activeConfig.textMuted)}>Jumlah sampel data yang akan di-generate (Max 5000).</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        min={10}
                        max={5000}
                        value={data.sample_size || 60}
                        onChange={(e) => updateData('sample_size', parseInt(e.target.value))}
                        className={cn("w-28 p-2.5 text-center font-mono font-bold rounded-lg border outline-none focus:ring-2 transition-all", activeConfig.inputBase, activeConfig.textMain)}
                    />
                    <span className={cn("text-sm font-medium", activeConfig.textMuted)}>Baris</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Variable Builder */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className={cn("text-sm font-bold flex items-center gap-2", activeConfig.textMain)}>
                            Daftar Variabel <span className={cn("px-2 py-0.5 rounded text-[10px]", activeConfig.pillLabel)}>{data.variables?.length || 0}</span>
                        </label>
                        <button
                            onClick={addVariable}
                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border", activeConfig.btnAdd)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Variabel
                        </button>
                    </div>

                    <div className="space-y-3 pr-2">
                        {(data.variables || []).map((v: any, idx: number) => (
                            <div key={v.id || idx} className={cn("group p-4 border rounded-xl transition-all space-y-3 relative overflow-hidden", activeConfig.cardBase, activeConfig.cardHover)}>
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity", activeConfig.gradientLine)} />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => updateVariable(idx, 'name', e.target.value)}
                                                placeholder="Nama Variabel (e.g. Motivasi)"
                                                className={cn("flex-1 font-semibold text-sm bg-transparent border-b outline-none px-0 py-1 transition-colors", activeConfig.inputBorderB, activeConfig.textMain)}
                                            />
                                            <div className="w-[140px]">
                                                <Select
                                                    value={v.type}
                                                    onChange={(val) => updateVariable(idx, 'type', val)}
                                                    options={[
                                                        { value: "numeric", label: "Angka (Rasio)" },
                                                        { value: "likert", label: "Likert (Ordinal)" },
                                                        { value: "nominal", label: "Kategori" }
                                                    ]}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Dynamic Params */}
                                        <div className={cn("text-xs grid grid-cols-2 gap-3 p-3 rounded-lg border", activeConfig.relBox)}>
                                            {v.type === 'likert' && (
                                                <>
                                                    <div className="col-span-2">
                                                        <Select
                                                            label="Skala (1-N)"
                                                            value={v.params?.scale || 5}
                                                            onChange={(val) => updateVariable(idx, 'params.scale', parseInt(val))}
                                                            options={[
                                                                { value: 4, label: "Skala 4 (Genap)" },
                                                                { value: 5, label: "Skala 5 (Ganjil)" },
                                                                { value: 7, label: "Skala 7 (Detailed)" }
                                                            ]}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {v.type === 'numeric' && (
                                                <>
                                                    <label className="flex flex-col gap-1">
                                                        <span className={activeConfig.textMuted}>Rata-rata (Mean)</span>
                                                        <input
                                                            type="number"
                                                            value={v.params?.mean ?? 75}
                                                            onChange={(e) => updateVariable(idx, 'params.mean', parseFloat(e.target.value))}
                                                            className={cn("border rounded px-2 py-2 outline-none focus:ring-1", activeConfig.inputBase, activeConfig.textMain)}
                                                        />
                                                    </label>
                                                    <label className="flex flex-col gap-1">
                                                        <span className={activeConfig.textMuted}>Standar Deviasi</span>
                                                        <input
                                                            type="number"
                                                            value={v.params?.std ?? 10}
                                                            onChange={(e) => updateVariable(idx, 'params.std', parseFloat(e.target.value))}
                                                            className={cn("border rounded px-2 py-2 outline-none focus:ring-1", activeConfig.inputBase, activeConfig.textMain)}
                                                        />
                                                    </label>
                                                </>
                                            )}

                                            {v.type === 'nominal' && (
                                                <div className="col-span-2">
                                                    <label className="flex flex-col gap-1">
                                                        <span className={activeConfig.textMuted}>Opsi (Pisahkan koma)</span>
                                                        <input
                                                            type="text"
                                                            value={v.params?.options?.join(',') || ''}
                                                            onChange={(e) => updateVariable(idx, 'params.options', e.target.value.split(','))}
                                                            className={cn("border rounded px-2 py-2 w-full outline-none focus:ring-1", activeConfig.inputBase, activeConfig.textMain)}
                                                            placeholder="Laki-laki,Perempuan"
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeVariable(idx)}
                                        className={cn("p-1.5 rounded-lg transition-colors mt-1", activeConfig.trashBtn)}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {(data.variables || []).length === 0 && (
                            <div onClick={addVariable} className={cn("cursor-pointer flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl transition-colors", activeConfig.emptyArea)}>
                                <Plus className="w-8 h-8 font-light mb-2 opacity-50" />
                                <p className="text-sm font-medium">Belum ada variabel</p>
                                <p className="text-xs opacity-60">Klik untuk tambah</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Relationships / Behavior */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className={cn("text-sm font-bold flex items-center gap-2", activeConfig.textMain)}>
                            Hubungan Variabel (Korelasi)
                        </label>
                        <button
                            onClick={addRelationship}
                            disabled={(data.variables || []).length < 2}
                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border disabled:opacity-50", activeConfig.btnAddRel)}
                        >
                            <LinkIcon className="w-3.5 h-3.5" />
                            Tambah Hubungan
                        </button>
                    </div>

                    <div className={cn("p-4 border rounded-xl space-y-4 min-h-[200px] transition-all duration-300", activeConfig.relBox)}>
                        {(data.relationships || []).length === 0 ? (
                            <div className={cn("flex flex-col items-center justify-center h-full py-8", activeConfig.textMuted)}>
                                <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
                                <p className="text-sm">Belum ada hubungan didefinisikan.</p>
                                <p className="text-xs opacity-80 text-center max-w-[200px] mt-1">Semua variabel akan di-generate secara independen (acak).</p>
                            </div>
                        ) : (
                            (data.relationships || []).map((rel: any, idx: number) => (
                                <div key={idx} className={cn("flex items-center gap-2 p-3 rounded-lg border shadow-sm animate-in zoom-in-95", activeConfig.itemBox)}>
                                    {/* Var 1 Selector */}
                                    <div className="w-24">
                                        <Select
                                            value={rel.var1_id}
                                            onChange={(val) => updateRelationship(idx, 'var1_id', val)}
                                            options={(data.variables || []).map((v: any) => ({ value: v.id, label: v.name }))}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="flex flex-col items-center gap-1 flex-1 px-2">
                                        <div className={cn("w-full h-1 bg-gradient-to-r from-transparent to-transparent rounded-full opacity-30 via-purple-500")} />
                                        <span className={cn("text-[10px] font-mono", activeConfig.textMuted)}>r = {rel.correlation}</span>
                                        <input
                                            type="range"
                                            min="-1"
                                            max="1"
                                            step="0.1"
                                            value={rel.correlation}
                                            onChange={(e) => updateRelationship(idx, 'correlation', parseFloat(e.target.value))}
                                            className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700", activeConfig.rangeAccent)}
                                        />
                                    </div>

                                    {/* Var 2 Selector */}
                                    <div className="w-24">
                                        <Select
                                            value={rel.var2_id}
                                            onChange={(val) => updateRelationship(idx, 'var2_id', val)}
                                            options={(data.variables || []).map((v: any) => ({ value: v.id, label: v.name }))}
                                            className="text-xs"
                                        />
                                    </div>

                                    <button onClick={() => removeRelationship(idx)} className={cn("ml-2 transition-colors rounded-md p-1", activeConfig.trashBtn)}>
                                        <Trash className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

import { Plus, Trash, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { Select } from '../ui/Select'
import { inferTypeByName } from '../../lib/smartGenerator'

interface Step2Props {
    data: any
    updateData: (key: string, value: any) => void
}

export const Step2Structure = ({ data, updateData }: Step2Props) => {

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
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
                    Definisi Variabel & Data
                </h3>
                <p className="text-muted-foreground text-sm">
                    Tentukan jumlah responden, variabel penelitian, dan jenis datanya.
                </p>
            </div>

            {/* Sample Size */}
            <div className="p-5 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 flex items-center justify-between shadow-sm">
                <div>
                    <label className="block text-sm font-bold text-foreground">Jumlah Responden (N)</label>
                    <p className="text-xs text-muted-foreground">Jumlah sampel data yang akan di-generate (Max 5000).</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        min={10}
                        max={5000}
                        value={data.sample_size || 60}
                        onChange={(e) => updateData('sample_size', parseInt(e.target.value))}
                        className="w-28 p-2.5 text-center font-mono font-bold rounded-lg border border-border/50 bg-background focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                    />
                    <span className="text-sm text-muted-foreground font-medium">Baris</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Variable Builder */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            Daftar Variabel <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">{data.variables?.length || 0}</span>
                        </label>
                        <button
                            onClick={addVariable}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Variabel
                        </button>
                    </div>

                    <div className="space-y-3 pr-2">
                        {(data.variables || []).map((v: any, idx: number) => (
                            <div key={v.id || idx} className="group p-4 bg-background border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-cyan-500/30 transition-all space-y-3 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => updateVariable(idx, 'name', e.target.value)}
                                                placeholder="Nama Variabel (e.g. Motivasi)"
                                                className="flex-1 font-semibold text-sm bg-transparent border-b border-border/50 focus:border-cyan-500 outline-none px-0 py-1"
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
                                        <div className="text-xs grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg">
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
                                                        <span className="text-muted-foreground">Rata-rata (Mean)</span>
                                                        <input
                                                            type="number"
                                                            value={v.params?.mean ?? 75}
                                                            onChange={(e) => updateVariable(idx, 'params.mean', parseFloat(e.target.value))}
                                                            className="bg-background border border-border/50 rounded px-2 py-2 outline-none focus:ring-1 focus:ring-cyan-500"
                                                        />
                                                    </label>
                                                    <label className="flex flex-col gap-1">
                                                        <span className="text-muted-foreground">Standar Deviasi</span>
                                                        <input
                                                            type="number"
                                                            value={v.params?.std ?? 10}
                                                            onChange={(e) => updateVariable(idx, 'params.std', parseFloat(e.target.value))}
                                                            className="bg-background border border-border/50 rounded px-2 py-2 outline-none focus:ring-1 focus:ring-cyan-500"
                                                        />
                                                    </label>
                                                </>
                                            )}

                                            {v.type === 'nominal' && (
                                                <div className="col-span-2">
                                                    <label className="flex flex-col gap-1">
                                                        <span className="text-muted-foreground">Opsi (Pisahkan koma)</span>
                                                        <input
                                                            type="text"
                                                            value={v.params?.options?.join(',') || ''}
                                                            onChange={(e) => updateVariable(idx, 'params.options', e.target.value.split(','))}
                                                            className="bg-background border border-border/50 rounded px-2 py-2 w-full outline-none focus:ring-1 focus:ring-cyan-500"
                                                            placeholder="Laki-laki,Perempuan"
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeVariable(idx)}
                                        className="p-1.5 text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {(data.variables || []).length === 0 && (
                            <div onClick={addVariable} className="cursor-pointer flex flex-col items-center justify-center py-8 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground hover:bg-secondary/20 transition-colors hover:border-cyan-500/30">
                                <Plus className="w-8 h-8 opacity-50 mb-2" />
                                <p className="text-sm font-medium">Belum ada variabel</p>
                                <p className="text-xs opacity-60">Klik untuk tambah</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Relationships / Behavior */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            Hubungan Antar Variabel (Korelasi)
                        </label>
                        <button
                            onClick={addRelationship}
                            disabled={(data.variables || []).length < 2}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20 disabled:opacity-50"
                        >
                            <LinkIcon className="w-3.5 h-3.5" />
                            Tambah Hubungan
                        </button>
                    </div>

                    <div className="p-4 bg-secondary/10 border border-border/50 rounded-xl space-y-4 min-h-[200px]">
                        {(data.relationships || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                                <AlertCircle className="w-8 h-8 opacity-30 mb-2" />
                                <p className="text-sm">Belum ada hubungan didefinisikan.</p>
                                <p className="text-xs opacity-60 text-center max-w-[200px]">Semua variabel akan di-generate secara independen (acak).</p>
                            </div>
                        ) : (
                            (data.relationships || []).map((rel: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border/50 shadow-sm animate-in zoom-in-95">
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
                                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full opacity-30" />
                                        <span className="text-[10px] text-muted-foreground font-mono">r = {rel.correlation}</span>
                                        <input
                                            type="range"
                                            min="-1"
                                            max="1"
                                            step="0.1"
                                            value={rel.correlation}
                                            onChange={(e) => updateRelationship(idx, 'correlation', parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-600"
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

                                    <button onClick={() => removeRelationship(idx)} className="ml-2 text-muted-foreground hover:text-red-500">
                                        <Trash className="w-3 h-3" />
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

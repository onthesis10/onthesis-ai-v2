import { Sparkles, BarChart, Settings2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

interface Step3Props {
    data: any
    updateData: (key: string, value: any) => void
}

export const Step3Behavior = ({ data, updateData }: Step3Props) => {
    const { theme } = useThemeStore()

    const themeStyles = {
        light: {
            title: "from-emerald-500 to-teal-600",
            textMuted: "text-slate-500",
            textMain: "text-slate-800",
            cardBase: "bg-white border-slate-200 shadow-sm",
            cardHover: "hover:bg-slate-50",
            cardActive: "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200",
            iconActive: "text-emerald-600 bg-emerald-100",
            iconInactive: "text-slate-400 bg-slate-100",
            btnBase: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-emerald-300",
            btnActive: "bg-emerald-50 border-emerald-300 text-emerald-700",
        },
        dark: {
            title: "from-emerald-400 to-teal-500",
            textMuted: "text-slate-400",
            textMain: "text-slate-200",
            cardBase: "bg-secondary/10 border-border/50 shadow-sm",
            cardHover: "hover:bg-secondary/30",
            cardActive: "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20",
            iconActive: "text-emerald-400 bg-emerald-500/20",
            iconInactive: "text-muted-foreground bg-secondary/50",
            btnBase: "bg-secondary/10 border-border text-muted-foreground hover:bg-secondary/30 hover:border-emerald-500/30",
            btnActive: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        },
        happy: {
            title: "from-lime-500 to-emerald-500",
            textMuted: "text-lime-700/70",
            textMain: "text-stone-800",
            cardBase: "bg-white/60 border-lime-200 shadow-sm",
            cardHover: "hover:bg-white hover:border-lime-300",
            cardActive: "bg-lime-50 border-lime-400 ring-1 ring-lime-300 shadow-lime-500/10",
            iconActive: "text-emerald-600 bg-emerald-100",
            iconInactive: "text-lime-600/50 bg-lime-100/50",
            btnBase: "bg-white/60 border-lime-200 text-lime-700 hover:bg-white hover:border-lime-400",
            btnActive: "bg-lime-100 border-lime-400 text-emerald-700",
        }
    }[theme || 'dark']

    const activeConfig = themeStyles

    // Default constraints if not exist
    const constraints = data.constraints || {
        effect_size: 'medium',
        distribution: 'normal',
        variance: 'realistic'
    }

    const updateConstraint = (key: string, value: string) => {
        updateData('constraints', { ...constraints, [key]: value })
    }

    const effectSizes = [
        { id: 'small', label: 'Lemah (Small)', desc: 'Pola data sangat halus, banyak noise', icon: Sparkles },
        { id: 'medium', label: 'Sedang (Medium)', desc: 'Pola terlihat jelas tapi realistis (Rekomendasi)', icon: BarChart },
        { id: 'large', label: 'Kuat (Large)', desc: 'Pola sangat kuat, minim noise', icon: Settings2 },
    ]

    return (
        <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h3 className={cn("text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r", activeConfig.title)}>
                    Statistical Behavior
                </h3>
                <p className={cn("text-sm", activeConfig.textMuted)}>
                    Bagaimana pola data ini terbentuk? Pilih sesuai kebutuhan simulasi Anda.
                </p>
            </div>

            {/* Effect Size Selection */}
            <div className="space-y-4">
                <label className={cn("text-sm font-semibold", activeConfig.textMain)}>Kekuatan Pola (Effect Size)</label>
                <div className="space-y-3">
                    {effectSizes.map(size => {
                        const isActive = constraints.effect_size === size.id
                        return (
                            <div
                                key={size.id}
                                onClick={() => updateConstraint('effect_size', size.id)}
                                className={cn(
                                    "cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between group",
                                    isActive ? activeConfig.cardActive : cn(activeConfig.cardBase, activeConfig.cardHover)
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-2.5 rounded-lg transition-colors",
                                        isActive ? activeConfig.iconActive : activeConfig.iconInactive
                                    )}>
                                        <size.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className={cn("font-semibold text-sm", activeConfig.textMain)}>{size.label}</h4>
                                        <p className={cn("text-xs mt-0.5", activeConfig.textMuted)}>{size.desc}</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-2 transition-colors",
                                    isActive ? "border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "border-slate-300 dark:border-border"
                                )} />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Distribution and Variance Selection */}
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className={cn("text-sm font-semibold", activeConfig.textMain)}>Distribusi Data</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { id: 'normal', label: 'Normal (Bell)' },
                            { id: 'skewed_right', label: 'Miring Kanan' },
                            { id: 'skewed_left', label: 'Miring Kiri' },
                            { id: 'uniform', label: 'Merata (Seragam)' }
                        ].map(dist => (
                            <button
                                key={dist.id}
                                onClick={() => updateConstraint('distribution', dist.id)}
                                className={cn(
                                    "px-4 py-3 rounded-lg text-sm font-medium border transition-all duration-300",
                                    constraints.distribution === dist.id ? activeConfig.btnActive : activeConfig.btnBase
                                )}
                            >
                                {dist.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className={cn("text-sm font-semibold", activeConfig.textMain)}>Kualitas Varians (Outliers)</label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { id: 'perfect', label: 'Sempurna (Tanpa Outlier)' },
                            { id: 'realistic', label: 'Realistis (1-5% Outlier)' },
                            { id: 'messy', label: 'Kotor (Banyak Outlier)' }
                        ].map(vari => (
                            <button
                                key={vari.id}
                                onClick={() => updateConstraint('variance', vari.id)}
                                className={cn(
                                    "px-4 py-3 rounded-lg text-sm font-medium border transition-all duration-300",
                                    constraints.variance === vari.id ? activeConfig.btnActive : activeConfig.btnBase
                                )}
                            >
                                {vari.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

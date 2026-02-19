
import { BarChart2, Sliders, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step3Props {
    data: any
    updateData: (key: string, value: any) => void
}

export const Step3Behavior = ({ data, updateData }: Step3Props) => {

    const constraints = data.constraints || { effect_size: 'medium', distribution: 'normal' }

    const updateConstraint = (key: string, value: any) => {
        updateData('constraints', { ...constraints, [key]: value })
    }

    const effectSizes = [
        { id: 'small', label: 'Small Effect', desc: 'Subtle differences', value: 0.2 },
        { id: 'medium', label: 'Medium Effect', desc: 'Noticeable differences', value: 0.5 },
        { id: 'large', label: 'Large Effect', desc: 'Clear dominant pattern', value: 0.8 }
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
                    Statistical Behavior
                </h3>
                <p className="text-muted-foreground text-sm">
                    How should the data behave? We'll inject patterns that match real-world anomalies.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Effect Size */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Effect Size / Correlation Strength
                    </label>
                    <div className="space-y-3">
                        {effectSizes.map(size => (
                            <div
                                key={size.id}
                                onClick={() => updateConstraint('effect_size', size.id)}
                                className={cn(
                                    "cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between group",
                                    constraints.effect_size === size.id
                                        ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20"
                                        : "bg-secondary/10 border-border/50 hover:bg-secondary/30"
                                )}
                            >
                                <div>
                                    <h5 className={cn("text-sm font-medium", constraints.effect_size === size.id ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{size.label}</h5>
                                    <p className="text-xs text-muted-foreground">{size.desc}</p>
                                </div>
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    constraints.effect_size === size.id ? "border-emerald-500" : "border-muted-foreground/30"
                                )}>
                                    {constraints.effect_size === size.id && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Other Parameters */}
                <div className="space-y-6">

                    {/* Distribution */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <BarChart2 className="w-4 h-4 text-blue-500" />
                            Distribution Shape
                        </label>
                        <div className="flex p-1 bg-secondary/30 rounded-lg">
                            {['normal', 'skewed'].map(d => (
                                <button
                                    key={d}
                                    onClick={() => updateConstraint('distribution', d)}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-medium rounded-md capitalize transition-all",
                                        constraints.distribution === d
                                            ? "bg-background text-blue-600 shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {d} Distribution
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground p-1">
                            {constraints.distribution === 'normal'
                                ? "Data will follow a standard Bell Curve (Gaussian). Good for parametric tests."
                                : "Data will be slightly skewed to mimic real-world imperfection."}
                        </p>
                    </div>

                    {/* Variance */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Sliders className="w-4 h-4 text-orange-500" />
                            Variance Quality
                        </label>
                        <div className="flex p-1 bg-secondary/30 rounded-lg">
                            {['homogenous', 'heterogenous'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => updateConstraint('variance', v)}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-medium rounded-md capitalize transition-all",
                                        constraints.variance === v
                                            ? "bg-background text-orange-600 shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-blue-600/80 leading-relaxed">
                        <strong>Pro Tip:</strong> Most academic research assumes "Normal" and "Homogenous" data. Select these for clean, textbook-perfect results.
                    </div>

                </div>
            </div>
        </div>
    )
}

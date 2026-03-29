import { BookOpen, Users, Activity, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '../ui/Select'
import { getFieldTemplates } from '../../lib/smartGenerator'
import { useThemeStore } from '@/store/themeStore'

interface Step1Props {
    data: any
    updateData: (key: string, value: any) => void
}

export const Step1Context = ({ data, updateData }: Step1Props) => {
    const { theme } = useThemeStore()

    const themeStyles = {
        light: {
            title: "from-blue-600 to-indigo-600",
            textMuted: "text-slate-500",
            cardBase: "border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300",
            cardActive: "border-blue-500 bg-blue-50 shadow-blue-500/10",
            iconBase: "bg-slate-100 text-slate-400",
            iconActive: "bg-blue-500 text-white",
            checkActive: "text-blue-500",
            pillBase: "bg-white text-slate-500 border-slate-200 hover:border-blue-300",
            pillActive: "bg-blue-50 text-blue-600 border-blue-200",
        },
        dark: {
            title: "from-cyan-400 to-blue-500",
            textMuted: "text-slate-400",
            cardBase: "border-white/10 bg-[#1E293B]/50 hover:bg-[#1E293B] hover:border-white/20",
            cardActive: "border-cyan-500/50 bg-cyan-500/10 shadow-cyan-500/10",
            iconBase: "bg-white/5 text-slate-500",
            iconActive: "bg-cyan-500 text-white",
            checkActive: "text-cyan-400",
            pillBase: "bg-[#1E293B]/50 text-slate-400 border-white/10 hover:border-white/20",
            pillActive: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        },
        happy: {
            title: "from-orange-500 to-rose-500",
            textMuted: "text-orange-600/70",
            cardBase: "border-orange-200 bg-white/60 hover:bg-white hover:border-orange-300",
            cardActive: "border-orange-500/50 bg-orange-50 shadow-orange-500/10",
            iconBase: "bg-orange-100/50 text-orange-300",
            iconActive: "bg-gradient-to-br from-orange-400 to-rose-400 text-white",
            checkActive: "text-orange-500",
            pillBase: "bg-white/60 text-orange-600/70 border-orange-200 hover:border-orange-300",
            pillActive: "bg-orange-100 text-orange-600 border-orange-300",
        }
    }[theme || 'dark']

    const activeConfig = themeStyles

    const researchTypes = [
        { id: 'descriptive', label: 'Descriptive', icon: BookOpen, desc: 'Describe characteristics of a population' },
        { id: 'correlation', label: 'Correlation', icon: Users, desc: 'Relationship between two variables' },
        { id: 'experiment', label: 'Experiment', icon: Activity, desc: 'Cause and effect with interventions' }
    ]

    const fields = [
        'Education', 'Management', 'Psychology', 'Health', 'Social Science', 'Marketing',
        'Economics', 'Computer Science', 'Engineering', 'Law', 'Agriculture', 'Public Administration'
    ]

    const goals = [
        'Difference Test (T-Test/ANOVA)',
        'Relationship (Correlation)',
        'Influence (Regression)',
        'Descriptive Stats'
    ]

    const handleFieldChange = (val: string) => {
        updateData('field', val);

        // Smart Template Trigger: Always apply template when field changes
        const templates = getFieldTemplates(val);
        if (templates.length > 0) {
            // Add unique IDs
            const varsWithIds = templates.map((t: any) => ({
                ...t,
                id: Math.random().toString(36).substr(2, 9)
            }));
            updateData('variables', varsWithIds);

            // Add default relationship if correlation design
            if (data.research_type === 'correlation' && varsWithIds.length >= 2) {
                updateData('relationships', [{
                    var1_id: varsWithIds[0].id,
                    var2_id: varsWithIds[1].id,
                    correlation: 0.6
                }]);
            } else {
                updateData('relationships', []);
            }
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h3 className={cn("text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r", activeConfig.title)}>
                    Tell us about your research
                </h3>
                <p className={cn("text-sm", activeConfig.textMuted)}>
                    We will tailor the data patterns based on your research context.
                </p>
            </div>

            {/* Research Type */}
            <div className="space-y-4">
                <label className="text-sm font-semibold">Research Design</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {researchTypes.map((type) => (
                        <div
                            key={type.id}
                            onClick={() => updateData('research_type', type.id)}
                            className={cn(
                                "cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg flex flex-col gap-3",
                                data.research_type === type.id ? activeConfig.cardActive : activeConfig.cardBase
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300",
                                data.research_type === type.id ? activeConfig.iconActive : activeConfig.iconBase
                            )}>
                                <type.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">{type.label}</h4>
                                <p className={cn("text-xs leading-relaxed mt-1", activeConfig.textMuted)}>{type.desc}</p>
                            </div>

                            {data.research_type === type.id && (
                                <div className={cn("absolute top-3 right-3", activeConfig.checkActive)}>
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Field & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Select
                        label="Field of Study"
                        value={data.field || ''}
                        onChange={handleFieldChange}
                        options={fields.map(f => ({ value: f.toLowerCase(), label: f }))}
                        placeholder="Select a field..."
                    />
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-semibold">Analysis Goals</label>
                    <div className="flex flex-wrap gap-2">
                        {goals.map(goal => {
                            const isSelected = (data.analysis_goal || []).includes(goal);
                            return (
                                <button
                                    key={goal}
                                    onClick={() => {
                                        const current = data.analysis_goal || [];
                                        const newVal = isSelected
                                            ? current.filter((g: string) => g !== goal)
                                            : [...current, goal];
                                        updateData('analysis_goal', newVal);
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300",
                                        isSelected ? activeConfig.pillActive : activeConfig.pillBase
                                    )}
                                >
                                    {goal}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
